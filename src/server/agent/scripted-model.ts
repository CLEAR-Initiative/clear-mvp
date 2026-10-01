/**
 * A deterministic stand-in for the CLEAR Agent's model, for e2e tests and
 * local demos without a model key (`CLEAR_AGENT_MODEL=scripted/e2e`).
 *
 * It plays the Agent's real loop with no intelligence: given a user turn it
 * asks NRC Find a standalone question (folding in the previous question, so
 * a follow-up is visibly rewritten); given NRC Find's result it answers from
 * it and names the Source documents. Never used in production unless
 * CLEAR_AGENT_ALLOW_SCRIPTED_MODEL=1 (the e2e stack runs a production build).
 */

import "server-only";
import { randomUUID } from "node:crypto";
import { MockLanguageModelV3, convertArrayToReadableStream } from "ai/test";

export { SCRIPTED_MODEL_ID } from "~/server/agent/scripted-model-id";

type PromptMessage = { role: string; content: unknown };

const USAGE = {
  inputTokens: { total: 1_000, noCache: 1_000, cacheRead: 0, cacheWrite: 0 },
  outputTokens: { total: 100, text: 100, reasoning: 0 },
};

function textOf(message: PromptMessage | undefined): string {
  if (!message) return "";
  if (typeof message.content === "string") return message.content;
  return (message.content as Array<{ type: string; text?: string }>)
    .filter((p) => p.type === "text" && p.text)
    .map((p) => p.text)
    .join(" ");
}

function toolResultOf(message: PromptMessage): Record<string, unknown> | null {
  const part = (message.content as Array<{ type: string; output?: { value?: unknown } }>).find(
    (p) => p.type === "tool-result",
  );
  const value = part?.output?.value;
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

export function createScriptedModel() {
  return new MockLanguageModelV3({
    provider: "scripted",
    modelId: "e2e",
    doStream: async ({ prompt }) => {
      // Ids must be unique across the whole Thread, as a real model's are:
      // a reused tool-call id makes Mastra match the earlier turn's result.
      const id = randomUUID();
      // Mastra appends its own system instructions (working memory) after
      // the conversation, so decide from the last non-system message.
      const messages = (prompt as PromptMessage[]).filter((m) => m.role !== "system");
      const last = messages[messages.length - 1];
      const parts: unknown[] = [{ type: "stream-start", warnings: [] }];

      if (last?.role === "tool") {
        const result = toolResultOf(last) ?? {};
        const docs = Array.isArray(result.sourceDocuments)
          ? (result.sourceDocuments as Array<{ title?: string }>)
          : [];
        const text =
          typeof result.error === "string"
            ? `NRC Find is unavailable right now (${result.error}).`
            : `**From NRC's documents:** ${String(result.answer ?? "").trim() || "nothing relevant."}` +
              (docs.length ? `\n\nSources: ${docs.map((d) => d.title).join("; ")}.` : "");
        parts.push(
          { type: "text-start", id },
          { type: "text-delta", id, delta: text },
          { type: "text-end", id },
          { type: "finish", finishReason: { unified: "stop", raw: "stop" }, usage: USAGE },
        );
      } else {
        const users = messages.filter((m) => m.role === "user").map(textOf);
        const current = users[users.length - 1] ?? "";
        const previous = users[users.length - 2];
        const question = previous ? `${current} (following up on: ${previous})` : current;
        parts.push(
          {
            type: "tool-call",
            toolCallId: `scripted-${id}`,
            toolName: "nrc_find",
            input: JSON.stringify({ question }),
          },
          { type: "finish", finishReason: { unified: "tool-calls", raw: "tool_use" }, usage: USAGE },
        );
      }
      return { stream: convertArrayToReadableStream(parts as never[]) };
    },
  });
}
