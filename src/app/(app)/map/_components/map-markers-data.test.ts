import { describe, expect, it } from "vitest";
import { alertsToMarkers, eventsToMarkers } from "./map-markers-data";
import type { GqlAlert, GqlEvent, GqlLocation } from "~/lib/types/graphql";

function pointLoc(id: string, lng: number, lat: number): GqlLocation {
  return {
    id,
    name: id,
    level: 2,
    ancestorIds: [],
    geometry: { type: "Point", coordinates: [lng, lat] },
  };
}

function baseEvent(overrides: Partial<GqlEvent> = {}): GqlEvent {
  return {
    id: "evt-1",
    title: "Test event",
    description: null,
    types: ["Conflict"],
    severity: 3,
    rank: 0.5,
    validFrom: "2026-01-01T00:00:00.000Z",
    validTo: "2026-01-02T00:00:00.000Z",
    firstSignalCreatedAt: "2026-01-01T00:00:00.000Z",
    lastSignalCreatedAt: "2026-01-01T00:00:00.000Z",
    populationAffected: null,
    populationDisplaced: null,
    casualties: null,
    originLocation: null,
    destinationLocation: null,
    generalLocation: null,
    signals: [],
    alerts: [],
    ...overrides,
  };
}

describe("eventsToMarkers / representativePoint", () => {
  it("prefers representativePoint over event and signal locations", () => {
    const event = baseEvent({
      representativePoint: pointLoc("rep", 32.5, 15.5),
      generalLocation: pointLoc("gen", 10, 10),
      signals: [
        {
          id: "sig-1",
          source: { id: "s", name: "ACLED", type: "acled" },
          title: null,
          description: null,
          severity: 2,
          url: null,
          publishedAt: "2026-01-01T00:00:00.000Z",
          collectedAt: "2026-01-01T00:00:00.000Z",
          originLocation: pointLoc("sig-origin", 1, 1),
          destinationLocation: null,
          generalLocation: null,
          events: [{ id: "evt-1" }],
        },
      ],
    });

    const markers = eventsToMarkers([event]);
    expect(markers).toHaveLength(1);
    expect(markers[0]?.lng).toBe(32.5);
    expect(markers[0]?.lat).toBe(15.5);
    expect(markers[0]?.locationId).toBe("rep");
  });

  it("falls back to event Point when representativePoint is missing", () => {
    const event = baseEvent({
      originLocation: pointLoc("origin", 30, 12),
    });
    const markers = eventsToMarkers([event]);
    expect(markers).toHaveLength(1);
    expect(markers[0]?.locationId).toBe("origin");
  });

  it("uses alert.representativePoint when event omits it", () => {
    const alert: GqlAlert = {
      id: "alert-1",
      status: "published",
      representativePoint: pointLoc("alert-rep", 25, 13),
      event: baseEvent({ id: "evt-2", alerts: [] }),
    };
    const markers = alertsToMarkers([alert]);
    expect(markers).toHaveLength(1);
    expect(markers[0]?.lng).toBe(25);
    expect(markers[0]?.lat).toBe(13);
    expect(markers[0]?.status).toBe("published");
  });
});
