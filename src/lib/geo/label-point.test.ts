import { describe, expect, it } from "vitest";
import { containsPoint } from "~/lib/analysis-view";
import { labelPoint } from "./label-point";

const square = (x: number, y: number, size: number) => [
  [x, y],
  [x + size, y],
  [x + size, y + size],
  [x, y + size],
  [x, y],
];

describe("labelPoint", () => {
  it("puts a convex polygon's label at its centroid", () => {
    expect(labelPoint({ type: "Polygon", coordinates: [square(0, 0, 2)] })).toEqual([1, 1]);
  });

  it("keeps the label inside a concave polygon whose centroid falls outside", () => {
    // A "U": the centroid sits in the empty middle.
    const u = {
      type: "Polygon",
      coordinates: [[[0, 0], [6, 0], [6, 6], [5, 6], [5, 1], [1, 1], [1, 6], [0, 6], [0, 0]]],
    };
    const p = labelPoint(u);
    expect(p).not.toBeNull();
    expect(containsPoint(u, p!)).toBe(true);
  });

  it("labels a multipolygon in its largest part", () => {
    const p = labelPoint({ type: "MultiPolygon", coordinates: [[square(10, 10, 1)], [square(0, 0, 4)]] });
    expect(p).toEqual([2, 2]);
  });

  it("passes points through and rejects anything else", () => {
    expect(labelPoint({ type: "Point", coordinates: [30.5, 12.1] })).toEqual([30.5, 12.1]);
    expect(labelPoint({ type: "LineString", coordinates: [[0, 0], [1, 1]] })).toBeNull();
    expect(labelPoint({ type: "Polygon", coordinates: [[[0, 0], [1, 1]]] })).toBeNull();
    expect(labelPoint(null)).toBeNull();
  });
});
