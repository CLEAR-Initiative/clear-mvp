import { describe, expect, it } from "vitest";
import {
  abbreviateCount,
  CLUSTER_MAX_ZOOM,
  clusterSize,
  createSignalIndex,
  viewClusters,
  worldPoints,
} from "./clusters";
import type { SignalFeature, SignalFeatureCollection } from "./to-features";

function signal(id: string, lng: number, lat: number): SignalFeature {
  return {
    type: "Feature",
    geometry: { type: "Point", coordinates: [lng, lat] },
    properties: { id, title: null, severity: "high" },
  };
}

function collection(features: SignalFeature[]): SignalFeatureCollection {
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
