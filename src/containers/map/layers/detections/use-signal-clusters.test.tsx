import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { SignalFeature, SignalFeatureCollection } from "./to-features";
import { useSignalClusters } from "./use-signal-clusters";

const camera = { west: 20, south: 5, east: 40, north: 25, zoom: 3 };
const listeners = new Map<string, () => void>();

const fakeMap = {
  getZoom: () => camera.zoom,
  getBounds: () => ({
    getWest: () => camera.west,
    getSouth: () => camera.south,
    getEast: () => camera.east,
    getNorth: () => camera.north,
  }),
  on: vi.fn((event: string, listener: () => void) => listeners.set(event, listener)),
  off: vi.fn(),
};

const mapRef = { getMap: () => fakeMap };

vi.mock("react-map-gl/mapbox", () => ({ useMap: () => ({ current: mapRef }) }));

function signal(id: string, lng: number, lat: number): SignalFeature {
  return {
    type: "Feature",
    geometry: { type: "Point", coordinates: [lng, lat] },
    properties: { id, title: null, severity: "high" },
  };
}

describe("useSignalClusters", () => {
  it("clusters new data at once while map tiles are still loading", () => {
    const empty: SignalFeatureCollection = { type: "FeatureCollection", features: [] };
    const loaded: SignalFeatureCollection = {
      type: "FeatureCollection",
      features: [signal("a", 30, 15), signal("b", 30.01, 15.01)],
    };
    const { result, rerender } = renderHook(({ collection }) => useSignalClusters(collection, "clusters"), {
      initialProps: { collection: empty },
    });

    rerender({ collection: loaded });

    expect(result.current.clusters.map((c) => c.count)).toEqual([2]);
    expect(result.current.points.features).toEqual([]);
  });

  it("keeps the same points object when a pan stays at the same zoom level", () => {
    const signals: SignalFeatureCollection = {
      type: "FeatureCollection",
      features: [signal("a", 30, 15), signal("b", 30.01, 15.01), signal("c", -70, -10)],
    };
    const { result } = renderHook(() => useSignalClusters(signals, "clusters"));
    const before = result.current.points;

    act(() => {
      Object.assign(camera, { west: 25, east: 45, zoom: 3.4 });
      listeners.get("moveend")?.();
    });

    expect(result.current.points).toBe(before);
  });

  it("shows clusters in a newly reached area while the pan is still moving", () => {
    vi.useFakeTimers();
    Object.assign(camera, { west: 20, south: 5, east: 40, north: 25, zoom: 3 });
    const signals: SignalFeatureCollection = {
      type: "FeatureCollection",
      features: [signal("a", 100, 15), signal("b", 100.01, 15.01)],
    };
    const { result } = renderHook(() => useSignalClusters(signals, "clusters"));
    expect(result.current.clusters).toEqual([]);

    act(() => {
      Object.assign(camera, { west: 90, east: 110 });
      listeners.get("move")?.();
      vi.advanceTimersByTime(150);
    });

    expect(result.current.clusters.map((c) => c.count)).toEqual([2]);
    vi.useRealTimers();
  });

  it("in stacked grouping, marks only signals at the same location, and only once points are drawn", () => {
    Object.assign(camera, { west: 20, south: 5, east: 40, north: 25, zoom: 4 });
    const signals: SignalFeatureCollection = {
      type: "FeatureCollection",
      features: [signal("a", 30, 15), signal("b", 30, 15), signal("c", 30.01, 15.01)],
    };
    const { result } = renderHook(() => useSignalClusters(signals, "stacked"));
    expect(result.current.clusters).toEqual([]);

    act(() => {
      camera.zoom = 6;
      listeners.get("moveend")?.();
    });

    expect(result.current.clusters.map((c) => ({ count: c.count, stacked: c.stacked }))).toEqual([
      { count: 2, stacked: true },
    ]);
    expect(result.current.points.features.map((f) => f.properties.id)).toEqual(["c"]);
  });
});
