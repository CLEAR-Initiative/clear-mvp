import { describe, expect, it } from "vitest";
import { CRISIS_RATIONALE_MAX, isValidCrisisRationale } from "./rationale";

describe("isValidCrisisRationale", () => {
  it("needs some text once trimmed", () => {
    expect(isValidCrisisRationale("")).toBe(false);
    expect(isValidCrisisRationale("   \n ")).toBe(false);
    expect(isValidCrisisRationale("  Same flood wave  ")).toBe(true);
  });

  it("accepts up to the limit clear-api accepts, and no more", () => {
    expect(isValidCrisisRationale("x".repeat(CRISIS_RATIONALE_MAX))).toBe(true);
    expect(isValidCrisisRationale("x".repeat(CRISIS_RATIONALE_MAX + 1))).toBe(false);
  });
});
