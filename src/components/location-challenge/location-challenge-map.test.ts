import { describe, expect, it } from "vitest";
import { challengeMapPins, outlinePoints, pinBounds } from "./location-challenge-map";

describe("challengeMapPins", () => {
  it("draws the Signal's pin first, then the proposed point and the decider's", () => {
    expect(
      challengeMapPins({ source: { lat: 1, lng: 2 }, proposed: { lat: 3, lng: 4 }, placed: { lat: 5, lng: 6 } }).map(
        (p) => p.kind,
      ),
    ).toEqual(["source", "proposed", "placed"]);
  });

  it("leaves out the points a challenge doesn't have", () => {
    expect(challengeMapPins({ source: null, proposed: { lat: 3, lng: 4 }, placed: null })).toEqual([
      { lat: 3, lng: 4, kind: "proposed" },
    ]);
  });
});

describe("suggestions and outlines", () => {
  it("draws suggested places between the proposed point and the decider's", () => {
    expect(
      challengeMapPins({
        suggestions: [{ lat: 1, lng: 2 }, { lat: 3, lng: 4 }],
        placed: { lat: 5, lng: 6 },
      }).map((p) => p.kind),
    ).toEqual(["suggestion", "suggestion", "placed"]);
  });

  it("reads every position of a polygon or a multipolygon, so the first frame fits the area", () => {
    const polygon = { type: "Polygon", coordinates: [[[29, 10], [31, 10], [31, 12], [29, 10]]] };
    const multi = { type: "MultiPolygon", coordinates: [[[[32, 13], [33, 14], [32, 13]]]] };
    const points = outlinePoints([polygon, multi]);
    expect(points).toHaveLength(7);
    expect(pinBounds(points)).toEqual([[29, 10], [33, 14]]);
    expect(outlinePoints([{ type: "Polygon", coordinates: null }])).toEqual([]);
  });
});

describe("pinBounds", () => {
  it("frames every pin", () => {
    expect(pinBounds([{ lat: 12.05, lng: 24.88 }, { lat: 12.0, lng: 24.95 }])).toEqual([
      [24.88, 12.0],
      [24.95, 12.05],
    ]);
  });

  it("is null without pins", () => {
    expect(pinBounds([])).toBeNull();
  });
});
