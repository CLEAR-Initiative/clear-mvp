import { describe, expect, it } from "vitest";
import type { GqlLocation, GqlSignal } from "~/lib/types/graphql";
import { signalsToFeatures } from "./to-features";

function location(geometry: GqlLocation["geometry"]): GqlLocation {
  return { id: "loc", name: "Somewhere", level: 1, geometry };
}

function signal(overrides: Partial<GqlSignal>): GqlSignal {
  return {
    id: "s1",
    source: { id: "src", name: "Source" } as GqlSignal["source"],
    title: null,
    description: null,
    severity: 3,
    url: null,
    publishedAt: "2026-11-01T00:00:00Z",
    collectedAt: "2026-11-01T00:00:00Z",
    originLocation: null,
    destinationLocation: null,
    generalLocation: null,
    events: [],
    ...overrides,
  };
}

const point = (lng: number, lat: number) => location({ type: "Point", coordinates: [lng, lat] });

describe("signalsToFeatures", () => {
  it("places a signal at its general location with its title and severity bucket", () => {
    const { features } = signalsToFeatures([
      signal({ id: "a", title: "Flood in Juba", severity: 5, generalLocation: point(10, 20) }),
    ]);
    expect(features).toEqual([
      {
        type: "Feature",
        geometry: { type: "Point", coordinates: [10, 20] },
        properties: { id: "a", title: "Flood in Juba", severity: "critical" },
      },
    ]);
  });

  it("falls back to the origin location when there is no general location", () => {
    const { features } = signalsToFeatures([signal({ originLocation: point(1, 2) })]);
    expect(features[0]?.geometry.coordinates).toEqual([1, 2]);
  });

  it("skips a signal with no point location", () => {
    const polygon = location({ type: "Polygon", coordinates: [[[0, 0], [1, 0], [1, 1], [0, 0]]] });
    const { features } = signalsToFeatures([signal({}), signal({ generalLocation: polygon })]);
    expect(features).toEqual([]);
  });

  it("puts a signal without severity in the unknown bucket", () => {
    const { features } = signalsToFeatures([signal({ severity: null, generalLocation: point(0, 0) })]);
    expect(features[0]?.properties.severity).toBe("unknown");
  });
});
