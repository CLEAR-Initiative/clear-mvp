import { describe, expect, it } from "vitest";
import { assertClearAgentModelConfigured, MODEL_PRICES, turnCostUsd } from "~/server/agent/pricing";

describe("Agent pricing", () => {
  it("prices a turn from input and output tokens per million", () => {
    expect(turnCostUsd("anthropic/claude-opus-5-5", { inputTokens: 1_000_000, outputTokens: 100_000 })).toBeCloseTo(
      4 + 2,
    );
  });

  it("fails startup for a configured model with no price", () => {
    expect(() => assertClearAgentModelConfigured({ CLEAR_AGENT_MODEL: "openai/whatever" })).toThrow(
      /no price/,
    );
  });

  it("starts with every priced model, and with no model configured", () => {
    for (const id of Object.keys(MODEL_PRICES)) {
      expect(() => assertClearAgentModelConfigured({ CLEAR_AGENT_MODEL: id })).not.toThrow();
    }
    expect(() => assertClearAgentModelConfigured({})).not.toThrow();
  });

  it("fails startup for the scripted test model in production unless allowed", () => {
    expect(() =>
      assertClearAgentModelConfigured({ CLEAR_AGENT_MODEL: "scripted/e2e", NODE_ENV: "production" }),
    ).toThrow(/for tests/);
    expect(() =>
      assertClearAgentModelConfigured({
        CLEAR_AGENT_MODEL: "scripted/e2e",
        NODE_ENV: "production",
        CLEAR_AGENT_ALLOW_SCRIPTED_MODEL: "1",
      }),
    ).not.toThrow();
  });

  it("does not treat inherited object keys as prices", () => {
    expect(() => turnCostUsd("toString", { inputTokens: 1, outputTokens: 1 })).toThrow();
  });
});
