import { describe, expect, it } from "vitest";
import {
  abbreviateCount,
  CLUSTER_MAX_ZOOM,
  clusterSize,
  createSignalIndex,
  isSamePoint,
  viewClusters,
  worldPoints,
} from "./clusters";
import type { SeverityBucket, DetectionFeature, DetectionFeatureCollection } from "./to-features";

function signal(id: string, lng: number, lat: number, severity: SeverityBucket = "high"): DetectionFeature {
  return {
    type: "Feature",
    geometry: { type: "Point", coordinates: [lng, lat] },
    properties: { id, title: null, severity },
  };
}

function collection(features: DetectionFeature[]): DetectionFeatureCollection {
  return { type: "FeatureCollection", features };
}

const WORLD = { west: -180, south: -85, east: 180, north: 85 };

describe("viewClusters", () => {
  it("merges nearby signals into one cluster and leaves distant ones as points", () => {
    const index = createSignalIndex(collection([signal("a", 30, 15), signal("b", 30.01, 15.01), signal("c", -70, -10)]));
    const clusters = viewClusters(index, WORLD, 3);
    expect(clusters).toHaveLength(1);
    expect(clusters[0]).toMatchObject({ count: 2, stacked: false });
    expect(worldPoints(index, 3).features.map((f) => f.properties.id)).toEqual(["c"]);
  });

  it("leaves out clusters outside the view", () => {
    const index = createSignalIndex(collection([signal("a", 30, 15), signal("b", 30.01, 15.01)]));
    expect(viewClusters(index, { west: -80, south: -20, east: -60, north: 0 }, 3)).toEqual([]);
  });

  it("shows a cluster once when the view is wider than the world", () => {
    const index = createSignalIndex(collection([signal("a", 30, 15), signal("b", 30.01, 15.01)]));
    const clusters = viewClusters(index, { west: -540, south: -85, east: 540, north: 85 }, 1);
    expect(clusters).toHaveLength(1);
    expect(Math.round(clusters[0]!.coordinates[0])).toBe(30);
  });

  it("keeps a cluster across the date line in view", () => {
    const index = createSignalIndex(collection([signal("a", -179, 0), signal("b", -178.99, 0.01)]));
    expect(viewClusters(index, { west: 170, south: -10, east: 190, north: 10 }, 3)).toHaveLength(1);
  });

  it("marks a cluster of signals at the exact same point as stacked", () => {
    const index = createSignalIndex(collection([signal("a", 32.5, 15.6), signal("b", 32.5, 15.6)]));
    const [cluster] = viewClusters(index, WORLD, 20);
    expect(cluster).toMatchObject({ count: 2, stacked: true });
    expect(cluster!.expansionZoom).toBeGreaterThan(CLUSTER_MAX_ZOOM);
  });
});

describe("cluster severity counts", () => {
  it("adds up to the cluster count when clusters merge at a lower zoom", () => {
    const index = createSignalIndex(
      collection([
        signal("a", 30, 15, "critical"),
        signal("b", 30.001, 15.001, "high"),
        signal("c", 30.002, 15.002, "unknown"),
        signal("d", 31, 16, "high"),
        signal("e", 31.001, 16.001, "low"),
      ]),
    );

    const split = viewClusters(index, WORLD, 8);
    expect(split.map((c) => c.severity)).toEqual(
      expect.arrayContaining([
        { critical: 1, high: 1, medium: 0, low: 0, unknown: 1 },
        { critical: 0, high: 1, medium: 0, low: 1, unknown: 0 },
      ]),
    );

    const [merged] = viewClusters(index, WORLD, 2);
    expect(merged).toMatchObject({ count: 5, severity: { critical: 1, high: 2, medium: 0, low: 1, unknown: 1 } });
  });
});

describe("clusterSize", () => {
  it.each([
    [2, { outer: 23, inner: 15 }],
    [9, { outer: 23, inner: 15 }],
    [10, { outer: 31, inner: 17 }],
    [24, { outer: 31, inner: 17 }],
    [25, { outer: 53, inner: 21 }],
    [99, { outer: 53, inner: 21 }],
    [100, { outer: 60, inner: 22 }],
    [5000, { outer: 60, inner: 22 }],
  ])("sizes a cluster of %i like Figma", (count, size) => {
    expect(clusterSize(count)).toEqual(size);
  });
});

describe("abbreviateCount", () => {
  it.each([
    [999, "999"],
    [1000, "1k"],
    [1250, "1.3k"],
    [12400, "12k"],
  ])("shows %i as %s", (count, text) => {
    expect(abbreviateCount(count)).toBe(text);
  });
});

describe("isSamePoint", () => {
  it("tells apart two stacks a few metres apart, as the map shows them", () => {
    // Two stacks of two, ~3 m apart in longitude.
    const index = createSignalIndex(
      collection([signal("a", 30, 15), signal("b", 30, 15), signal("c", 30.00003, 15), signal("d", 30.00003, 15)]),
    );
    const stacks = viewClusters(index, WORLD, CLUSTER_MAX_ZOOM).filter((cluster) => cluster.stacked);

    expect(stacks).toHaveLength(2);
    expect(isSamePoint(stacks[0]!.coordinates, stacks[1]!.coordinates)).toBe(false);
  });

  it("matches a stack from its point rounded to 5 decimals in the URL", () => {
    expect(isSamePoint([30.0000049, 14.9999951], [30, 15])).toBe(true);
  });
});
