import { describe, it, expect } from "vitest";
import { yearlyWindowStart } from "./situationAnalysis-windows";

describe("yearlyWindowStart", () => {
  it("is midnight UTC on 1 Jan, the string the API equality-matches", () => {
    expect(yearlyWindowStart(2026)).toBe("2026-01-01T00:00:00.000Z");
  });
});
