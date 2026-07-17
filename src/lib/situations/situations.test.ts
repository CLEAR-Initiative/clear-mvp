import { describe, expect, it } from "vitest";
import type { GqlEvent, GqlLocation } from "~/lib/types/graphql";
import {
  assembleSituations,
  computeAttentionScore,
  freshnessScore,
  isEscalatingSituation,
  newnessCutoff,
  readOverviewLastSeen,
  smartDestination,
  writeOverviewLastSeen,
  ATTENTION_BOOSTS,
  NEW_FALLBACK_MS,
  OVERVIEW_LAST_SEEN_KEY,
  SITUATION_SOFT_CAP,
} from "./index";

function pointLoc(id: string, ancestors: string[] = []): GqlLocation {
  return {
    id,
    name: id,
    level: 2,
    ancestorIds: ancestors,
    geometry: { type: "Point", coordinates: [30, 15] },
  };
}

function baseEvent(overrides: Partial<GqlEvent> = {}): GqlEvent {
  return {
    id: "evt-1",
    title: "Test event",
    description: "A short blurb about the situation.",
    types: ["Conflict"],
    severity: 3,
    rank: 0.5,
    validFrom: "2026-07-01T00:00:00.000Z",
    validTo: "2026-07-16T00:00:00.000Z",
    firstSignalCreatedAt: "2026-07-15T00:00:00.000Z",
    lastSignalCreatedAt: "2026-07-16T10:00:00.000Z",
    populationAffected: null,
    populationDisplaced: null,
    casualties: null,
    originLocation: null,
    destinationLocation: null,
    generalLocation: pointLoc("loc-district", ["loc-country"]),
    signals: [
      {
        id: "sig-1",
        source: { id: "s", name: "ACLED", type: "acled" },
        title: null,
        description: null,
        severity: 3,
        url: null,
        publishedAt: "2026-07-16T10:00:00.000Z",
        collectedAt: "2026-07-16T10:00:00.000Z",
        originLocation: null,
        destinationLocation: null,
        generalLocation: null,
        events: [{ id: "evt-1" }],
      },
    ],
    alerts: [],
    ...overrides,
  };
}

const NOW = new Date("2026-07-16T12:00:00.000Z");

describe("freshnessScore", () => {
  it("is ~1 for a signal at now", () => {
    expect(freshnessScore(NOW.toISOString(), NOW)).toBeCloseTo(1, 2);
  });

  it("decays toward ~0.5 at 24h", () => {
    const yesterday = new Date(NOW.getTime() - 24 * 60 * 60 * 1000);
    expect(freshnessScore(yesterday.toISOString(), NOW)).toBeCloseTo(0.5, 1);
  });
});

describe("isEscalatingSituation", () => {
  it("requires severity ≥ 4, ≥2 signals, recent last, and span", () => {
    const escalating = baseEvent({
      severity: 5,
      firstSignalCreatedAt: "2026-07-14T00:00:00.000Z",
      lastSignalCreatedAt: "2026-07-16T10:00:00.000Z",
      signals: [
        baseEvent().signals[0]!,
        { ...baseEvent().signals[0]!, id: "sig-2" },
      ],
    });
    expect(isEscalatingSituation(escalating, NOW)).toBe(true);
  });

  it("rejects single-signal or low severity", () => {
    expect(
      isEscalatingSituation(
        baseEvent({
          severity: 5,
          firstSignalCreatedAt: "2026-07-14T00:00:00.000Z",
          lastSignalCreatedAt: "2026-07-16T10:00:00.000Z",
          signals: [baseEvent().signals[0]!],
        }),
        NOW,
      ),
    ).toBe(false);
    expect(
      isEscalatingSituation(
        baseEvent({
          severity: 3,
          firstSignalCreatedAt: "2026-07-14T00:00:00.000Z",
          lastSignalCreatedAt: "2026-07-16T10:00:00.000Z",
          signals: [
            baseEvent().signals[0]!,
            { ...baseEvent().signals[0]!, id: "sig-2" },
          ],
        }),
        NOW,
      ),
    ).toBe(false);
  });
});

describe("computeAttentionScore / boosts", () => {
  it("applies draft, escalating, and new boosts", () => {
    const base = computeAttentionScore({
      severity: 4,
      lastSignalAt: NOW.toISOString(),
      hasDraftAlert: false,
      isEscalating: false,
      isNewSinceVisit: false,
      now: NOW,
    });
    const withDraft = computeAttentionScore({
      severity: 4,
      lastSignalAt: NOW.toISOString(),
      hasDraftAlert: true,
      isEscalating: false,
      isNewSinceVisit: false,
      now: NOW,
    });
    expect(withDraft - base).toBeCloseTo(ATTENTION_BOOSTS.draft, 5);

    const withEsc = computeAttentionScore({
      severity: 4,
      lastSignalAt: NOW.toISOString(),
      hasDraftAlert: false,
      isEscalating: true,
      isNewSinceVisit: false,
      now: NOW,
    });
    expect(withEsc - base).toBeCloseTo(ATTENTION_BOOSTS.escalating, 5);

    const withNew = computeAttentionScore({
      severity: 4,
      lastSignalAt: NOW.toISOString(),
      hasDraftAlert: false,
      isEscalating: false,
      isNewSinceVisit: true,
      now: NOW,
    });
    expect(withNew - base).toBeCloseTo(ATTENTION_BOOSTS.newSinceVisit, 5);
  });
});

describe("newnessCutoff / last-seen", () => {
  it("falls back to 24h when last-seen is missing", () => {
    const cutoff = newnessCutoff(null, NOW);
    expect(NOW.getTime() - cutoff.getTime()).toBe(NEW_FALLBACK_MS);
  });

  it("uses stored last-seen when present", () => {
    const seen = "2026-07-16T06:00:00.000Z";
    expect(newnessCutoff(seen, NOW).toISOString()).toBe(seen);
  });

  it("reads and writes localStorage", () => {
    const mem = new Map<string, string>();
    const storage = {
      getItem: (k: string) => mem.get(k) ?? null,
      setItem: (k: string, v: string) => {
        mem.set(k, v);
      },
    };
    expect(readOverviewLastSeen(storage)).toBeNull();
    const written = writeOverviewLastSeen(NOW, storage);
    expect(written).toBe(NOW.toISOString());
    expect(mem.get(OVERVIEW_LAST_SEEN_KEY)).toBe(NOW.toISOString());
    expect(readOverviewLastSeen(storage)).toBe(NOW.toISOString());
  });
});

describe("smartDestination", () => {
  it("prefers draft alert over published over event", () => {
    expect(
      smartDestination({
        eventId: "evt-1",
        alerts: [
          { id: "a-pub", status: "published" },
          { id: "a-draft", status: "draft" },
        ],
      }),
    ).toEqual({
      kind: "alert",
      alertId: "a-draft",
      eventId: "evt-1",
      href: "/event/evt-1",
    });

    expect(
      smartDestination({
        eventId: "evt-1",
        alerts: [{ id: "a-pub", status: "published" }],
      }),
    ).toMatchObject({ kind: "alert", alertId: "a-pub" });

    expect(
      smartDestination({ eventId: "evt-1", alerts: [] }),
    ).toEqual({ kind: "event", eventId: "evt-1", href: "/event/evt-1" });
  });
});

describe("assembleSituations", () => {
  it("ranks by attention score (draft boost beats plain high severity)", () => {
    const plainHigh = baseEvent({
      id: "plain",
      severity: 5,
      title: "Plain critical",
      lastSignalCreatedAt: "2026-07-16T08:00:00.000Z",
      alerts: [],
      signals: [baseEvent().signals[0]!],
    });
    const draftMed = baseEvent({
      id: "drafty",
      severity: 3,
      title: "Draft medium",
      lastSignalCreatedAt: "2026-07-16T08:00:00.000Z",
      alerts: [{ id: "d1", status: "draft" }],
      signals: [baseEvent().signals[0]!],
    });

    const ranked = assembleSituations({
      events: [plainHigh, draftMed],
      lastSeenAt: "2026-07-10T00:00:00.000Z",
      now: NOW,
    });
    expect(ranked.map((s) => s.eventId)).toEqual(["drafty", "plain"]);
    expect(ranked[0]!.hasDraftAlert).toBe(true);
  });

  it("soft-caps at ~8", () => {
    const events = Array.from({ length: 20 }, (_, i) =>
      baseEvent({
        id: `evt-${i}`,
        severity: 5 - (i % 5),
        lastSignalCreatedAt: new Date(NOW.getTime() - i * 60_000).toISOString(),
      }),
    );
    const ranked = assembleSituations({
      events,
      lastSeenAt: null,
      now: NOW,
    });
    expect(ranked).toHaveLength(SITUATION_SOFT_CAP);
  });

  it("scopes to location id / ancestors", () => {
    const inScope = baseEvent({
      id: "in",
      generalLocation: pointLoc("district-a", ["country-sd"]),
    });
    const outOfScope = baseEvent({
      id: "out",
      generalLocation: pointLoc("district-b", ["country-et"]),
    });
    const ranked = assembleSituations({
      events: [inScope, outOfScope],
      lastSeenAt: null,
      now: NOW,
      locationId: "country-sd",
    });
    expect(ranked.map((s) => s.eventId)).toEqual(["in"]);
  });

  it("marks new-since-visit using last-seen; missing → 24h window", () => {
    const recent = baseEvent({
      id: "recent",
      lastSignalCreatedAt: "2026-07-16T11:00:00.000Z",
    });
    const older = baseEvent({
      id: "older",
      lastSignalCreatedAt: "2026-07-14T00:00:00.000Z",
    });

    const withSeen = assembleSituations({
      events: [recent, older],
      lastSeenAt: "2026-07-16T10:30:00.000Z",
      now: NOW,
      softCap: 10,
    });
    expect(withSeen.find((s) => s.eventId === "recent")!.isNewSinceVisit).toBe(true);
    expect(withSeen.find((s) => s.eventId === "older")!.isNewSinceVisit).toBe(false);

    const fallback = assembleSituations({
      events: [older],
      lastSeenAt: null,
      now: NOW,
    });
    // older is >24h before NOW → not new under fallback
    expect(fallback[0]!.isNewSinceVisit).toBe(false);

    const within24h = assembleSituations({
      events: [
        baseEvent({
          id: "day",
          lastSignalCreatedAt: "2026-07-16T00:00:00.000Z",
        }),
      ],
      lastSeenAt: null,
      now: NOW,
    });
    expect(within24h[0]!.isNewSinceVisit).toBe(true);
  });

  it("never invents orphan-signal rows (events-only input)", () => {
    // Contract: callers pass events; assemble does not accept bare signals.
    const ranked = assembleSituations({
      events: [baseEvent({ id: "only-event", signals: [] })],
      lastSeenAt: null,
      now: NOW,
    });
    expect(ranked).toHaveLength(1);
    expect(ranked[0]!.eventId).toBe("only-event");
    expect(ranked[0]!.signalCount).toBe(0);
  });
});
