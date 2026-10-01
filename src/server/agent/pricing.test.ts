import { describe, expect, it } from "vitest";
import { assertClearAgentModelPriced, MODEL_PRICES, turnCostUsd } from "~/server/agent/pricing";

describe("Agent pricing", () => {
  it("prices a turn from input and output tokens per million", () => {
    expect(turnCostUsd("anthropic/claude-opus-5-5", { inputTokens: 1_000_000, outputTokens: 100_000 })).toBeCloseTo(
      4 + 2,
    );
  });

  it("fails startup for a configured model with no price", () => {
    expect(() => assertClearAgentModelPriced({ CLEAR_AGENT_MODEL: "openai/whatever" })).toThrow(
      /no price/,
    );
  });

  it("starts with every priced model, and with no model configured", () => {
    for (const id of Object.keys(MODEL_PRICES)) {
      expect(() => assertClearAgentModelPriced({ CLEAR_AGENT_MODEL: id })).not.toThrow();
    }
    expect(() => assertClearAgentModelPriced({})).not.toThrow();
  });

  it("does not treat inherited object keys as prices", () => {
    expect(() => turnCostUsd("toString", { inputTokens: 1, outputTokens: 1 })).toThrow();
  });
});
