import { describe, expect, it } from "vitest";
import {
  buildCrisisRecommendContext,
  eventMatchesSearch,
  rankEventsForCrisis,
  scoreEventAgainstCrisis,
} from "./recommend-events";

const crisisEvents = [
  {
    id: "c1",
    title: "Khartoum flood",
    types: ["fl"],
    severity: 4,
    lastSignalCreatedAt: "2026-08-10T12:00:00.000Z",
    generalLocation: { id: "loc-a2", name: "Khartoum", ancestorIds: ["loc-a1", "loc-country"] },
    signals: [{ source: { name: "GDACS" } }],
  },
];

describe("scoreEventAgainstCrisis", () => {
  const ctx = buildCrisisRecommendContext(crisisEvents);

  it("scores location + time + type + severity + source overlap", () => {
    const { score, reasons } = scoreEventAgainstCrisis(
      {
        id: "e2",
        types: ["fl"],
        severity: 4,
        lastSignalCreatedAt: "2026-08-12T12:00:00.000Z",
        generalLocation: { id: "loc-other", ancestorIds: ["loc-a1"] },
        signals: [{ source: { name: "GDACS" } }],
      },
      ctx,
    );
    expect(reasons).toEqual(expect.arrayContaining(["location", "time", "type", "severity", "source"]));
    expect(score).toBe(40 + 25 + 20 + 10 + 5);
  });

  it("ignores unrelated events", () => {
    const { score, reasons } = scoreEventAgainstCrisis(
      {
        id: "e3",
        types: ["eq"],
        severity: 1,
        lastSignalCreatedAt: "2025-01-01T00:00:00.000Z",
        generalLocation: { id: "elsewhere", ancestorIds: [] },
        signals: [{ source: { name: "Other" } }],
      },
      ctx,
    );
    expect(reasons).toEqual([]);
    expect(score).toBe(0);
  });
});

describe("rankEventsForCrisis", () => {
  it("excludes linked events and returns top scored", () => {
    const ranked = rankEventsForCrisis(
      [
        {
          id: "c1",
          types: ["fl"],
          severity: 4,
          lastSignalCreatedAt: "2026-08-10T12:00:00.000Z",
          generalLocation: { id: "loc-a2", ancestorIds: ["loc-a1"] },
        },
        {
          id: "best",
          types: ["fl"],
          severity: 4,
          lastSignalCreatedAt: "2026-08-11T12:00:00.000Z",
          generalLocation: { id: "loc-a2", ancestorIds: ["loc-a1"] },
          signals: [{ source: { name: "GDACS" } }],
        },
        {
          id: "weak",
          types: ["eq"],
          severity: 2,
          lastSignalCreatedAt: "2026-01-01T00:00:00.000Z",
          generalLocation: { id: "elsewhere", ancestorIds: [] },
        },
      ],
      crisisEvents,
      { limit: 5 },
    );
    expect(ranked.map((r) => r.event.id)).toEqual(["best"]);
  });

  it("still excludes crisis-linked events when a custom excludeIds set is passed", () => {
    const ranked = rankEventsForCrisis(
      [
        {
          id: "c1",
          types: ["fl"],
          severity: 4,
          lastSignalCreatedAt: "2026-08-10T12:00:00.000Z",
          generalLocation: { id: "loc-a2", ancestorIds: ["loc-a1"] },
        },
        {
          id: "best",
          types: ["fl"],
          severity: 4,
          lastSignalCreatedAt: "2026-08-11T12:00:00.000Z",
          generalLocation: { id: "loc-a2", ancestorIds: ["loc-a1"] },
        },
        {
          id: "also-out",
          types: ["fl"],
          severity: 4,
          lastSignalCreatedAt: "2026-08-12T12:00:00.000Z",
          generalLocation: { id: "loc-a2", ancestorIds: ["loc-a1"] },
        },
      ],
      crisisEvents,
      { excludeIds: new Set(["also-out"]), limit: 5 },
    );
    expect(ranked.map((r) => r.event.id)).toEqual(["best"]);
  });
});

describe("eventMatchesSearch", () => {
  it("matches title and location name", () => {
    const event = {
      id: "e",
      title: "Blue Nile flooding",
      generalLocation: { name: "Wad Madani" },
    };
    expect(eventMatchesSearch(event, "blue")).toBe(true);
    expect(eventMatchesSearch(event, "madani")).toBe(true);
    expect(eventMatchesSearch(event, "darfur")).toBe(false);
  });
});
