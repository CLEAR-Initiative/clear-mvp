import { describe, expect, it } from "vitest";

import { toBoundaryFeatures } from "./features";

const triangle = [
  [
    [30, 10],
    [32, 14],
    [34, 10],
    [30, 10],
  ],
];

describe("toBoundaryFeatures", () => {
  it("keeps polygons and drops locations it cannot outline", () => {
    const collection = toBoundaryFeatures([
      { id: "a", geometry: { type: "Polygon", coordinates: triangle } },
      { id: "b", geometry: { type: "MultiPolygon", coordinates: [triangle] } },
      { id: "c", geometry: null },
      { id: "d", geometry: { type: "Point", coordinates: [30, 10] } },
    ]);

    expect(collection.features.map((f) => f.id)).toEqual(["a", "b"]);
  });
});
