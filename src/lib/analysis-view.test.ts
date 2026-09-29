import { describe, expect, it } from "vitest";
import {
  addArea,
  combineGeometries,
  containsPoint,
  createdWindowStart,
  eventsByArea,
  fundingSplit,
  isStale,
  pickCountry,
  sameLocations,
  scopeLabel,
  timelineLayout,
} from "~/lib/analysis-view";
import type { AnalysisEvent } from "~/server/api/routers/analysis";

function ev(id: string, startedAt: string, severity: number | null, admin1: AnalysisEvent["admin1"] = null): AnalysisEvent {
  return {
    id,
    title: id,
    types: [],
    severity,
    startedAt,
    lastSignalAt: startedAt,
    casualties: null,
    populationDisplaced: null,
    point: null,
    locationName: null,
    admin1,
  };
}

describe("eventsByArea", () => {
  it("counts per admin-1, most first, skipping events with no area", () => {
    const nd = { id: "nd", name: "North Darfur" };
    const kh = { id: "kh", name: "Khartoum" };
    expect(eventsByArea([ev("a", "2026-01-01", 1, nd), ev("b", "2026-01-02", 1, kh), ev("c", "2026-01-03", 1, nd), ev("d", "2026-01-04", 1)])).toEqual([
      { id: "nd", name: "North Darfur", count: 2 },
      { id: "kh", name: "Khartoum", count: 1 },
    ]);
  });
});

describe("timelineLayout", () => {
  const start = new Date("2026-01-01T00:00:00Z");
  const end = new Date("2026-05-01T00:00:00Z");

  it("puts month ticks and dots on a 0..1 axis and drops out-of-window events", () => {
    const layout = timelineLayout(
      [ev("late", "2026-03-01T00:00:00Z", 2), ev("early", "2026-01-01T00:00:00Z", 1), ev("before", "2025-12-01T00:00:00Z", 5)],
      start,
      end,
    );
    expect(layout.months.map((m) => m.label.toISOString().slice(0, 7))).toEqual(["2026-01", "2026-02", "2026-03", "2026-04", "2026-05"]);
    expect(layout.months[0]!.x).toBe(0);
    expect(layout.months.at(-1)!.x).toBe(1);
    expect(layout.dots.map((d) => d.event.id)).toEqual(["early", "late"]);
    expect(layout.dots[1]!.x).toBeCloseTo(59 / 120);
  });

  it("highlights the most severe events, ties to the most recent, shown in time order", () => {
    const layout = timelineLayout(
      [
        ev("a", "2026-01-10T00:00:00Z", 5),
        ev("b", "2026-02-10T00:00:00Z", 3),
        ev("c", "2026-03-10T00:00:00Z", 5),
        ev("d", "2026-04-10T00:00:00Z", 3),
        ev("e", "2026-04-20T00:00:00Z", null),
      ],
      start,
      end,
      3,
    );
    expect(layout.highlights.map((h) => h.event.id)).toEqual(["a", "c", "d"]);
  });
});

describe("fundingSplit", () => {
  it("computes shares and the gap", () => {
    expect(fundingSplit(1.2e9, 3e9)).toEqual({ receivedShare: 0.4, gap: 1.8e9, gapShare: 0.6 });
  });
  it("caps overfunding and needs both figures", () => {
    expect(fundingSplit(4, 2)).toEqual({ receivedShare: 1, gap: 0, gapShare: 0 });
    expect(fundingSplit(null, 2)).toBeNull();
    expect(fundingSplit(1, 0)).toBeNull();
  });
});

describe("pickCountry", () => {
  const options = [
    { id: "afg", name: "Afghanistan" },
    { id: "sdn", name: "Sudan" },
    { id: "ven", name: "Venezuela" },
  ];
  it("prefers the user's pick, then the working country", () => {
    expect(pickCountry(options, "ven", "afg")?.id).toBe("ven");
    expect(pickCountry(options, null, "afg")?.id).toBe("afg");
  });
  it("defaults to Sudan when no single country is set, else the first", () => {
    expect(pickCountry(options, null, null)?.id).toBe("sdn");
    expect(pickCountry(options.filter((c) => c.id !== "sdn"), null, null)?.id).toBe("afg");
    expect(pickCountry([], null, null)).toBeNull();
  });
});

describe("created analysis helpers", () => {
  const chain = [
    { id: "sdn", name: "Sudan", level: 0 },
    { id: "nk", name: "North Kordofan", level: 1 },
  ];
  const loc = (id: string, name: string, ancestors = chain) => ({ id, name, parent: null, ancestors });

  it("names a scope like the pipeline does", () => {
    expect(scopeLabel([loc("s", "Sheikan")])).toBe("Sheikan, North Kordofan, Sudan");
    expect(scopeLabel([loc("s", "Sheikan"), loc("u", "Um Rawaba")])).toBe("Sheikan and Um Rawaba, North Kordofan, Sudan");
    expect(scopeLabel([loc("s", "Sheikan"), loc("k", "Kassala", [chain[0]!, { id: "ks", name: "Kassala", level: 1 }])])).toBe(
      "Sheikan and Kassala, Sudan",
    );
    expect(scopeLabel(["A", "B", "C", "D", "E"].map((n) => loc(n, n)))).toBe("A, B, C and 2 more, North Kordofan, Sudan");
    expect(scopeLabel([])).toBe("");
  });

  it("flags an analysis older than its frequency plus a day", () => {
    const now = new Date("2026-09-29T12:00:00Z");
    expect(isStale("2026-09-22T12:00:00Z", "weekly", now)).toBe(false);
    expect(isStale("2026-09-21T11:00:00Z", "weekly", now)).toBe(true);
    expect(isStale("2026-09-27T11:00:00Z", "daily", now)).toBe(true);
    expect(isStale(null, "daily", now)).toBe(false);
    expect(isStale("2025-01-01T00:00:00Z", "manual", now)).toBe(false);
  });

  it("starts a created window at UTC midnight 90 days back", () => {
    expect(createdWindowStart(new Date("2026-09-29T15:30:00Z"))).toBe("2026-07-01T00:00:00.000Z");
  });

  it("combines district polygons for the map and compares scopes regardless of order", () => {
    const poly = { type: "Polygon", coordinates: [[[0, 0], [1, 0], [1, 1], [0, 0]]] };
    const multi = { type: "MultiPolygon", coordinates: [[[[2, 2], [3, 2], [3, 3], [2, 2]]]] };
    expect(combineGeometries([poly, multi, null, { type: "Point", coordinates: [1, 1] }])?.coordinates).toHaveLength(2);
    expect(combineGeometries([null])).toBeNull();
    expect(sameLocations(["a", "b"], ["b", "a"])).toBe(true);
    expect(sameLocations(["a"], ["a", "b"])).toBe(false);
  });
});

describe("area picking", () => {
  const square = { type: "Polygon", coordinates: [[[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]], [[4, 4], [6, 4], [6, 6], [4, 6], [4, 4]]] };

  it("hits a polygon but not its hole or the outside", () => {
    expect(containsPoint(square, [2, 2])).toBe(true);
    expect(containsPoint(square, [5, 5])).toBe(false);
    expect(containsPoint(square, [11, 2])).toBe(false);
    expect(containsPoint({ type: "MultiPolygon", coordinates: [square.coordinates] }, [2, 2])).toBe(true);
    expect(containsPoint(null, [2, 2])).toBe(false);
  });

  it("lets a state absorb its districts and skips districts already covered", () => {
    const areas = new Map([
      ["nk", { id: "nk", level: 1 as const, stateId: null }],
      ["sheikan", { id: "sheikan", level: 2 as const, stateId: "nk" }],
      ["kassala", { id: "kassala", level: 2 as const, stateId: "ks" }],
    ]);
    const a = (id: string) => areas.get(id)!;
    expect(addArea(["sheikan", "kassala"], a("nk"), areas)).toEqual(["kassala", "nk"]);
    expect(addArea(["nk"], a("sheikan"), areas)).toEqual(["nk"]);
    expect(addArea(["kassala"], a("kassala"), areas)).toEqual(["kassala"]);
  });
});
