import { describe, expect, it } from "vitest";
import { isBboxLikeGeometry, isPaintableBoundaryGeometry } from "./country-mask";

/** Closed rectangle matching clear-api seed WKT for Khartoum state. */
const SEED_BBOX = {
  type: "MultiPolygon" as const,
  coordinates: [
    [
      [
        [31.7, 15.19],
        [34.38, 15.19],
        [34.38, 16.63],
        [31.7, 16.63],
        [31.7, 15.19],
      ],
    ],
  ],
};

const REAL_ISH_POLYGON = {
  type: "Polygon" as const,
  coordinates: [
    [
      [30, 10],
      [31, 10.2],
      [31.5, 11],
      [30.8, 12],
      [29.5, 11.5],
      [29.2, 10.5],
      [30, 10],
    ],
  ],
};

describe("isBboxLikeGeometry", () => {
  it("detects axis-aligned seed envelopes", () => {
    expect(isBboxLikeGeometry(SEED_BBOX)).toBe(true);
  });

  it("rejects detailed polygons", () => {
    expect(isBboxLikeGeometry(REAL_ISH_POLYGON)).toBe(false);
  });

  it("rejects points", () => {
    expect(isBboxLikeGeometry({ type: "Point", coordinates: [32.5, 15.5] })).toBe(false);
  });
});

describe("isPaintableBoundaryGeometry", () => {
  it("allows real polygons and blocks seed bboxes", () => {
    expect(isPaintableBoundaryGeometry(REAL_ISH_POLYGON)).toBe(true);
    expect(isPaintableBoundaryGeometry(SEED_BBOX)).toBe(false);
    expect(isPaintableBoundaryGeometry({ type: "Point", coordinates: [32.5, 15.5] })).toBe(false);
  });
});
