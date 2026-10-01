// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { clearAgentModelId, resolveClearAgentModel } from "~/server/agent/model";
import { createScriptedModel } from "~/server/agent/scripted-model";

vi.mock("server-only", () => ({}));

afterEach(() => vi.unstubAllEnvs());

describe("CLEAR Agent model from configuration", () => {
  it("passes a model-router string through untouched", () => {
    vi.stubEnv("CLEAR_AGENT_MODEL", "anthropic/claude-opus-5-5");
    expect(resolveClearAgentModel()).toBe("anthropic/claude-opus-5-5");
  });

  it("refuses to run without a configured model", () => {
    vi.stubEnv("CLEAR_AGENT_MODEL", "");
    expect(() => clearAgentModelId()).toThrow(/not configured/);
  });

  it("refuses the scripted model in production unless explicitly allowed", () => {
    vi.stubEnv("CLEAR_AGENT_MODEL", "scripted/e2e");
    vi.stubEnv("NODE_ENV", "production");
    expect(() => resolveClearAgentModel()).toThrow(/for tests/);
    vi.stubEnv("CLEAR_AGENT_ALLOW_SCRIPTED_MODEL", "1");
    expect(typeof resolveClearAgentModel()).toBe("object");
  });
});

describe("scripted model", () => {
  async function play(prompt: unknown[]) {
    const { stream } = await createScriptedModel().doStream({ prompt } as never);
    const parts: Array<Record<string, unknown>> = [];
    for await (const part of stream as unknown as AsyncIterable<Record<string, unknown>>) parts.push(part);
    return parts;
  }

  it("asks NRC Find a standalone question that folds in the previous one", async () => {
    const parts = await play([
      { role: "user", content: [{ type: "text", text: "Access in Darfur?" }] },
      { role: "assistant", content: [{ type: "text", text: "Restricted." }] },
      { role: "user", content: [{ type: "text", text: "And in Kordofan?" }] },
      { role: "system", content: "Working memory instructions appended by Mastra." },
    ]);
    const call = parts.find((p) => p.type === "tool-call")!;
    expect(call.toolName).toBe("nrc_find");
    expect(JSON.parse(call.input as string)).toEqual({
      question: "And in Kordofan? (following up on: Access in Darfur?)",
    });
  });

  it("answers from NRC Find's result and names the sources", async () => {
    const parts = await play([
      { role: "user", content: [{ type: "text", text: "q" }] },
      {
        role: "tool",
        content: [
          {
            type: "tool-result",
            output: { type: "json", value: { answer: "Roads closed.", sourceDocuments: [{ title: "Report A" }] } },
          },
        ],
      },
      { role: "system", content: "Working memory instructions appended by Mastra." },
    ]);
    const text = parts.filter((p) => p.type === "text-delta").map((p) => p.delta).join("");
    expect(text).toContain("Roads closed.");
    expect(text).toContain("Sources: Report A.");
  });
});
