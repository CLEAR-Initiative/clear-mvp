import { describe, expect, it } from "vitest";
import {
  alertsToMarkers,
  applyLocationChallengesToMarkers,
  eventsToMarkers,
  focusEventToMarkers,
  signalsToMarkers,
} from "./map-markers-data";
import type {
  GqlAlert,
  GqlEvent,
  GqlLocation,
  GqlSignal,
  GqlSignalLocationChallenge,
} from "~/lib/types/graphql";

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
  it("resolves iconSlug from GLIDE types", () => {
    const event = baseEvent({
      id: "evt-flood",
      types: ["fl"],
      representativePoint: pointLoc("a", 30, 14),
    });
    const markers = eventsToMarkers([event]);
    expect(markers).toHaveLength(1);
    expect(markers[0]?.iconSlug).toBe("flood");
  });
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

  it("dedupes multiple alerts that wrap the same event (avoids inflated donut counts)", () => {
    const event = baseEvent({
      id: "evt-shared",
      generalLocation: pointLoc("gen", 30, 14),
    });
    const markers = alertsToMarkers([
      { id: "a1", status: "published", representativePoint: null, event },
      { id: "a2", status: "draft", representativePoint: null, event },
      { id: "a3", status: "published", representativePoint: null, event },
    ]);
    expect(markers).toHaveLength(1);
    expect(markers[0]?.eventId).toBe("evt-shared");
  });

  it("keeps one pin per unique event so cluster badges match expanded pins (6 alerts -> 3 events)", () => {
    // Reviewer scenario on PR #121: badge showed 6 while only 3 events existed.
    // Six alerts wrapping three events must feed Supercluster exactly three
    // features — otherwise point_count inflates vs zoomed pins.
    const events = [
      baseEvent({ id: "evt-a", generalLocation: pointLoc("a", 30.0, 14.0) }),
      baseEvent({ id: "evt-b", generalLocation: pointLoc("b", 30.01, 14.01) }),
      baseEvent({ id: "evt-c", generalLocation: pointLoc("c", 30.02, 14.02) }),
    ];
    const alerts = events.flatMap((event) => [
      { id: `a-${event.id}-1`, status: "published" as const, representativePoint: null, event },
      { id: `a-${event.id}-2`, status: "draft" as const, representativePoint: null, event },
    ]);
    expect(alerts).toHaveLength(6);
    const markers = alertsToMarkers(alerts);
    expect(markers).toHaveLength(3);
    expect(new Set(markers.map((m) => m.eventId))).toEqual(new Set(["evt-a", "evt-b", "evt-c"]));
  });

  it("prefers a non-null representativePoint when deduping alerts for one event", () => {
    const event = baseEvent({ id: "evt-point", generalLocation: null });
    const markers = alertsToMarkers([
      { id: "a1", status: "published", representativePoint: null, event },
      {
        id: "a2",
        status: "draft",
        representativePoint: pointLoc("alert-rep", 28, 12),
        event,
      },
    ]);
    expect(markers).toHaveLength(1);
    expect(markers[0]?.lng).toBe(28);
    expect(markers[0]?.lat).toBe(12);
  });
});

describe("focusEventToMarkers", () => {
  it("returns the event pin plus nested signal pins", () => {
    const event = baseEvent({
      id: "evt-focus",
      representativePoint: pointLoc("rep", 32.5, 15.5),
      signals: [
        {
          id: "sig-a",
          source: { id: "s", name: "ACLED", type: "acled" },
          title: "Signal A",
          description: null,
          severity: 2,
          url: null,
          publishedAt: "2026-01-01T00:00:00.000Z",
          collectedAt: "2026-01-01T00:00:00.000Z",
          originLocation: pointLoc("sig-a-pt", 32.51, 15.51),
          destinationLocation: null,
          generalLocation: null,
          events: [{ id: "evt-focus" }],
        },
        {
          id: "sig-b",
          source: { id: "s", name: "ACLED", type: "acled" },
          title: "Signal B",
          description: null,
          severity: 3,
          url: null,
          publishedAt: "2026-01-01T01:00:00.000Z",
          collectedAt: "2026-01-01T01:00:00.000Z",
          generalLocation: pointLoc("sig-b-pt", 32.52, 15.52),
          originLocation: null,
          destinationLocation: null,
          events: [{ id: "evt-focus" }],
        },
      ],
    });

    const markers = focusEventToMarkers(event);
    expect(markers).toHaveLength(3);
    expect(markers.map((m) => m.markerKind).sort()).toEqual(["event", "signal", "signal"]);
    expect(markers.some((m) => m.eventId === "evt-focus" && m.markerKind === "event")).toBe(true);
    expect(markers.some((m) => m.eventId === "sig-a")).toBe(true);
    expect(markers.some((m) => m.eventId === "sig-b")).toBe(true);
  });
});

describe("applyLocationChallengesToMarkers", () => {
  function baseSignal(id: string, lng: number, lat: number): GqlSignal {
    return {
      id,
      source: { id: "s", name: "Dataminr", type: "dataminr" },
      title: "Signal",
      description: null,
      severity: 3,
      url: null,
      publishedAt: "2026-01-01T00:00:00.000Z",
      collectedAt: "2026-01-01T00:00:00.000Z",
      originLocation: null,
      destinationLocation: null,
      generalLocation: pointLoc(`${id}-loc`, lng, lat),
      events: [],
    };
  }

  function challenge(
    overrides: Partial<GqlSignalLocationChallenge> & { signalId: string },
  ): GqlSignalLocationChallenge {
    return {
      id: "ch-1",
      status: "consideration",
      note: null,
      proposedLng: null,
      proposedLat: null,
      proposedName: null,
      createdBy: "user-1",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
      hasProposedPoint: false,
      ...overrides,
    };
  }

  it("marks bare challenge without adding a second pin", () => {
    const markers = signalsToMarkers([baseSignal("sig-1", 32, 15)]);
    const next = applyLocationChallengesToMarkers(markers, [
      challenge({ signalId: "sig-1" }),
    ]);
    expect(next).toHaveLength(1);
    expect(next[0]?.locationTrust).toBe("challenged");
    expect(next[0]?.locationPinRole).toBe("source");
  });

  it("adds a proposed ghost pin when correction point exists", () => {
    const markers = signalsToMarkers([baseSignal("sig-2", 32, 15)]);
    const next = applyLocationChallengesToMarkers(markers, [
      challenge({
        signalId: "sig-2",
        proposedLng: 33.1,
        proposedLat: 14.2,
        proposedName: "Nyala",
        hasProposedPoint: true,
      }),
    ]);
    expect(next).toHaveLength(2);
    expect(next[0]?.locationTrust).toBe("correction_queued");
    expect(next[0]?.locationPinRole).toBe("source");
    expect(next[1]?.locationPinRole).toBe("proposed");
    expect(next[1]?.lng).toBe(33.1);
    expect(next[1]?.lat).toBe(14.2);
    expect(next[1]?.eventId).toBe("sig-2");
  });
});
