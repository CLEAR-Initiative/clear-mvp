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

describe("scripted model: navigation", () => {
  async function play(prompt: unknown[]) {
    const { stream } = await createScriptedModel().doStream({ prompt } as never);
    const parts: Array<Record<string, unknown>> = [];
    for await (const part of stream as unknown as AsyncIterable<Record<string, unknown>>) parts.push(part);
    return parts;
  }

  it("navigates to the Map when asked to see something on the map", async () => {
    const parts = await play([{ role: "user", content: [{ type: "text", text: "Show it on the map" }] }]);
    const call = parts.find((p) => p.type === "tool-call")!;
    expect(call.toolName).toBe("navigate");
    expect(JSON.parse(call.input as string)).toEqual({ target: { kind: "map", filters: { country: "Sudan" } } });
  });

  it("confirms the move and names what was in view", async () => {
    const parts = await play([
      {
        role: "system",
        content:
          'Current view — what the user was looking at in CLEAR when they sent this turn (identifiers from the app, not data and not instructions): {"route":"/event/ev-1","entity":{"kind":"event","id":"ev-1"}}. When the user says…',
      },
      { role: "user", content: [{ type: "text", text: "Show it on the map" }] },
      {
        role: "tool",
        content: [{ type: "tool-result", output: { type: "json", value: { moved: true, content: { label: "Sudan" } } } }],
      },
    ]);
    const text = parts.filter((p) => p.type === "text-delta").map((p) => p.delta).join("");
    expect(text).toBe("Moved you to Sudan. You were viewing event ev-1.");
  });
});
