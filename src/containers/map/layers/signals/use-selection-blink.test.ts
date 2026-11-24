import { describe, expect, it } from "vitest";
import { blinkOpacity } from "./use-selection-blink";

describe("blinkOpacity", () => {
  it("holds the ring solid for the first half second", () => {
    expect(blinkOpacity(0)).toBe(1);
    expect(blinkOpacity(499)).toBe(1);
  });

  it("fades the ring to 5% by one second, then brings it back by 1.5 s", () => {
    expect(blinkOpacity(750)).toBeLessThan(1);
    expect(blinkOpacity(750)).toBeGreaterThan(0.05);
    expect(blinkOpacity(1000)).toBeCloseTo(0.05);
    expect(blinkOpacity(1499)).toBeCloseTo(1, 1);
  });

  it("repeats every 1.5 s", () => {
    expect(blinkOpacity(1500 + 750)).toBeCloseTo(blinkOpacity(750));
  });
});
