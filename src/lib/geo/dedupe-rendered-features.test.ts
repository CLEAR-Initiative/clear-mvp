import { describe, expect, it } from "vitest";
import { dedupeByProperty } from "./dedupe-rendered-features";

describe("dedupeByProperty", () => {
  it("keeps the first feature per property value (tile-boundary duplicates)", () => {
    const features = [
      { properties: { id: 1, title: "a" } },
      { properties: { id: 1, title: "a-dup" } },
      { properties: { id: 2, title: "b" } },
      { properties: { id: 1, title: "a-dup2" } },
    ];
    expect(dedupeByProperty(features, "id")).toEqual([
      { properties: { id: 1, title: "a" } },
      { properties: { id: 2, title: "b" } },
    ]);
  });

  it("dedupes cluster_id the same way", () => {
    const features = [
      { properties: { cluster_id: 10, point_count: 3 } },
      { properties: { cluster_id: 10, point_count: 3 } },
      { properties: { cluster_id: 11, point_count: 2 } },
    ];
    expect(dedupeByProperty(features, "cluster_id")).toHaveLength(2);
  });

  it("skips features missing the property", () => {
    const features = [
      { properties: { id: 1 } },
      { properties: {} },
      { properties: null },
      {},
    ];
    expect(dedupeByProperty(features, "id")).toEqual([{ properties: { id: 1 } }]);
  });
});
