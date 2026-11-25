import { describe, expect, it } from "vitest";
import { createSignalIndex, viewClusters, worldPoints } from "./clusters";
import { selectionHighlight } from "./selection-highlight";
import type { SignalFeature, SignalFeatureCollection } from "./to-features";

function signal(id: string, lng: number, lat: number): SignalFeature {
  return {
    type: "Feature",
    geometry: { type: "Point", coordinates: [lng, lat] },
    properties: { id, title: null, severity: "high" },
  };
}

// a and b are stacked at one point, c sits close by, d is alone far away.
const data: SignalFeatureCollection = {
  type: "FeatureCollection",
  features: [signal("a", 30, 15), signal("b", 30, 15), signal("c", 30.01, 15.01), signal("d", -70, -10)],
};
const index = createSignalIndex(data);
const world = { west: -180, south: -85, east: 180, north: 85 };

function at(zoom: number) {
  const points = worldPoints(index, zoom);
  return {
    data,
    index,
    clusters: viewClusters(index, world, zoom),
    pointIds: new Set(points.features.map((f) => f.properties.id)),
  };
}

describe("selectionHighlight", () => {
  it("rings a signal drawn as its own point", () => {
    const highlight = selectionHighlight({ ...at(3), selection: { type: "detection", kind: "signal", id: "d" } });

    expect(highlight).toEqual({ pointId: "d", clusterKey: null });
  });

  it("rings the cluster that holds a selected signal at a low zoom", () => {
    const view = at(3);
    const highlight = selectionHighlight({ ...view, selection: { type: "detection", kind: "signal", id: "c" } });

    expect(highlight.pointId).toBeNull();
    expect(highlight.clusterKey).toBe(view.clusters[0]?.key);
  });

  it("rings the stacked cluster at the deepest zoom", () => {
    const view = at(22);
    const stack = view.clusters.find((c) => c.stacked);
    const highlight = selectionHighlight({ ...view, selection: { type: "stack", kind: "signal", coordinates: [30, 15] } });

    expect(stack).toBeDefined();
    expect(highlight).toEqual({ pointId: null, clusterKey: stack?.key });
  });

  it("finds a stack from a URL point rounded to 5 decimals", () => {
    const highlight = selectionHighlight({
      ...at(22),
      selection: { type: "stack", kind: "signal", coordinates: [30.000004, 14.999996] },
    });

    expect(highlight.clusterKey).not.toBeNull();
  });

  it("rings nothing for an event or alert, even with a signal's id", () => {
    const none = { pointId: null, clusterKey: null };

    expect(selectionHighlight({ ...at(3), selection: { type: "detection", kind: "event", id: "d" } })).toEqual(none);
    expect(selectionHighlight({ ...at(22), selection: { type: "stack", kind: "alert", coordinates: [30, 15] } })).toEqual(
      none,
    );
  });

  it("shows nothing for a selection that is not in the data", () => {
    expect(selectionHighlight({ ...at(3), selection: { type: "detection", kind: "signal", id: "gone" } })).toEqual({
      pointId: null,
      clusterKey: null,
    });
    expect(selectionHighlight({ ...at(3), selection: { type: "stack", kind: "signal", coordinates: [0, 0] } })).toEqual({
      pointId: null,
      clusterKey: null,
    });
  });
});
