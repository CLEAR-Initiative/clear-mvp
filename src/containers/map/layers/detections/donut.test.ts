import { describe, expect, it } from "vitest";
import { donutGradient, donutSegments } from "./donut";

describe("donutSegments", () => {
  it("runs clockwise from the top in legend order, sized by count, with unknown and without empty severities", () => {
    expect(donutSegments({ critical: 1, high: 2, medium: 0, low: 0, unknown: 1 })).toEqual([
      { bucket: "critical", from: 0, to: 90 },
      { bucket: "high", from: 90, to: 270 },
      { bucket: "unknown", from: 270, to: 360 },
    ]);
  });
});

describe("donutGradient", () => {
  it("paints each segment with its severity token", () => {
    expect(donutGradient({ critical: 0, high: 1, medium: 1, low: 0, unknown: 0 })).toBe(
      "conic-gradient(var(--color-severity-high) 0deg 180deg, var(--color-severity-medium) 180deg 360deg)",
    );
  });
});
