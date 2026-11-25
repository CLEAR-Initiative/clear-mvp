import { describe, expect, it } from "vitest";
import type { GqlLocation } from "~/lib/types/graphql";
import { commonLocationName, detectionsAtPoint, severityCounts, sortStackItems, stackPeriod } from "./detection-stack";

function location(id: string, name: string, level: number, ancestorIds: string[] = []): GqlLocation {
  return { id, name, level, ancestorIds, geometry: { type: "Point", coordinates: [30, 15] } } as GqlLocation;
}

function item(id: string, severity: number | null, date: string, location: GqlLocation | null = null) {
  return { id, severity, date, location };
}

describe("detectionsAtPoint", () => {
  it("keeps the items drawn at the point, matched to the URL's 5 decimals", () => {
    const items = [
      { id: "here", point: [30, 15] as [number, number] },
      { id: "rounded", point: [30.000004, 14.999996] as [number, number] },
      { id: "near", point: [30.01, 15] as [number, number] },
      { id: "nowhere", point: null },
    ];

    expect(detectionsAtPoint(items, [30, 15]).map((i) => i.id)).toEqual(["here", "rounded"]);
  });
});

describe("sortStackItems", () => {
  it("puts the most severe first, unknown last, and the newest first within a severity", () => {
    const sorted = sortStackItems([
      item("unknown", null, "2026-11-20T00:00:00Z"),
      item("high-old", 4, "2026-11-01T00:00:00Z"),
      item("low", 1, "2026-11-22T00:00:00Z"),
      item("high-new", 4, "2026-11-10T00:00:00Z"),
      item("critical", 5, "2026-10-01T00:00:00Z"),
    ]);

    expect(sorted.map((s) => s.id)).toEqual(["critical", "high-new", "high-old", "low", "unknown"]);
  });
});

describe("severityCounts", () => {
  it("counts each severity in order and leaves out empty ones", () => {
    const counts = severityCounts([
      item("a", 4, "2026-11-01T00:00:00Z"),
      item("b", 5, "2026-11-01T00:00:00Z"),
      item("c", 4, "2026-11-01T00:00:00Z"),
      item("d", null, "2026-11-01T00:00:00Z"),
    ]);

    expect(counts).toEqual([
      { bucket: "critical", count: 1 },
      { bucket: "high", count: 2 },
      { bucket: "unknown", count: 1 },
    ]);
  });
});

describe("commonLocationName", () => {
  const locationById = new Map([
    ["sd", { name: "Sudan", level: 0 }],
    ["kd", { name: "Kadugli", level: 2 }],
  ]);

  it("names the place most of the items share, through their district when the point is unnamed", () => {
    const name = commonLocationName(
      [
        item("a", 4, "2026-11-01T00:00:00Z", location("p1", "Drone strike near Kadugli", 4, ["sd", "kd"])),
        item("b", 4, "2026-11-01T00:00:00Z", location("p2", "Shelling", 4, ["sd", "kd"])),
        item("c", 4, "2026-11-01T00:00:00Z", location("sd", "Sudan", 0)),
      ],
      locationById,
    );

    expect(name).toBe("Kadugli");
  });

  it("is null when no item has a place name", () => {
    expect(commonLocationName([item("a", 4, "2026-11-01T00:00:00Z")], locationById)).toBeNull();
  });
});

describe("stackPeriod", () => {
  const now = new Date(2026, 10, 23, 15, 0);

  it("words the default window as the last 30 days", () => {
    expect(stackPeriod({ from: new Date(2026, 9, 24).toISOString() }, now)).toEqual({ kind: "lastDays", days: 30 });
  });

  it("words a range ending today in days", () => {
    const filters = { from: new Date(2026, 10, 16).toISOString(), to: new Date(2026, 10, 23, 23, 59).toISOString() };

    expect(stackPeriod(filters, now)).toEqual({ kind: "lastDays", days: 7 });
  });

  it("gives the dates of a range that ends before today", () => {
    const from = new Date(2026, 8, 1);
    const to = new Date(2026, 8, 30);

    expect(stackPeriod({ from: from.toISOString(), to: to.toISOString() }, now)).toEqual({ kind: "range", from, to });
  });

  it("gives the dates of a range that does not start at midnight", () => {
    const from = new Date(2026, 10, 20, 12, 0);

    expect(stackPeriod({ from: from.toISOString() }, now)).toEqual({ kind: "range", from, to: now });
  });
});
