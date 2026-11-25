import { describe, expect, it } from "vitest";
import { placeRampLabels } from "./ramp-labels";

describe("placeRampLabels", () => {
  it("puts labels under their segments when they fit: first at the start, last at the end, others centred", () => {
    // Segments on a 300px bar: 0–100, 100–200, 200–300.
    expect(placeRampLabels([1, 1, 1], [40, 40, 40], 300)).toEqual([0, 130, 260]);
  });

  it("pushes a label right when the one before is wider than its segment", () => {
    // "2 Critical" (44px) over a 7px segment; "10 High" (39px) would start under it.
    const lefts = placeRampLabels([2, 10, 14, 54, 13], [44, 39, 56, 40, 60], 314);

    expect(lefts[0]).toBe(0);
    expect(lefts[1]).toBeGreaterThanOrEqual(44 + 6);
    for (let i = 1; i < lefts.length; i++) {
      expect(lefts[i]!).toBeGreaterThanOrEqual(lefts[i - 1]! + [44, 39, 56, 40, 60][i - 1]! + 6);
    }
    expect(lefts[4]! + 60).toBeLessThanOrEqual(314);
  });

  it("keeps a label centred under a wide segment when nothing pushes it", () => {
    // The 54 Low segment spans ~165–347 of 400px; its 40px label stays centred around 256.
    const lefts = placeRampLabels([2, 10, 14, 54, 13], [44, 39, 56, 40, 60], 400);

    expect(lefts[3]! + 20).toBeCloseTo((((26 / 93) * 400 + (80 / 93) * 400) / 2), 0);
  });

  it("pulls labels back inside the bar when the last segment is tiny", () => {
    const lefts = placeRampLabels([20, 1], [40, 50], 200);

    expect(lefts[1]).toBe(150);
    expect(lefts[0]! + 40 + 6).toBeLessThanOrEqual(150);
  });

  it("places nothing for an empty bar", () => {
    expect(placeRampLabels([], [], 300)).toEqual([]);
  });
});
