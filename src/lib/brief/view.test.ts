import { describe, expect, it } from "vitest";
import type { BriefItem } from "./types";
import { TOP_TYPES, toBriefView, toCountRow } from "./view";
import { LABELS, brief, item } from "./test-fixtures";

describe("toBriefView", () => {
  it("groups items Alerts → Events → Signals, each by position, whatever order they arrive in", () => {
    const view = toBriefView(
      brief({
        items: [
          item({ id: "s1", kind: "signal", position: 0 }),
          item({ id: "e2", kind: "event", position: 1 }),
          item({ id: "a1", kind: "alert", position: 0 }),
          item({ id: "e1", kind: "event", position: 0 }),
        ],
      }),
      LABELS,
    );
    expect(view.groups.map((g) => [g.label, g.items.map((i) => i.id)])).toEqual([
      ["Alerts", ["a1"]],
      ["Events", ["e1", "e2"]],
      ["Signals", ["s1"]],
    ]);
  });

  it("keeps empty groups so every rendering has the same sections", () => {
    expect(toBriefView(brief(), LABELS).groups.map((g) => g.items.length)).toEqual([0, 0, 0]);
  });

  it("marks an item from before the window with its date, and only that one", () => {
    const view = toBriefView(
      brief({
        items: [
          item({ id: "old", kind: "event", position: 0, snapshot: { occurredAt: "2026-10-20T09:00:00.000Z" } as BriefItem["snapshot"] }),
          item({ id: "new", kind: "event", position: 1 }),
        ],
      }),
      LABELS,
    );
    expect(view.groups[1]!.items.map((i) => i.earlier)).toEqual(["from 2026-10-20", null]);
  });

  it("drops a blank note and labels severity and types", () => {
    const [i] = toBriefView(brief({ items: [item({ id: "a1", kind: "alert", position: 0, note: "  " })] }), LABELS)
      .groups[0]!.items;
    expect(i).toMatchObject({ note: null, severity: "high", severityLabel: "HIGH", types: ["type:fl"] });
  });

  it("formats the window and carries the text sections", () => {
    const view = toBriefView(brief({ summary: "S", closingNotes: "C" }), LABELS);
    expect(view).toMatchObject({ windowLabel: "2026-10-29T12:00 to 2026-10-30T12:00", summary: "S", closingNotes: "C" });
  });
});

describe("toCountRow", () => {
  it("folds severities 1 to 5 into the Brief's buckets, most severe first", () => {
    const row = toCountRow(
      "event",
      {
        total: 7,
        bySeverity: [
          { key: "1", count: 1 },
          { key: "2", count: 2 },
          { key: "5", count: 3 },
          { key: "(unknown)", count: 1 },
        ],
        byType: [],
      },
      LABELS,
    );
    expect(row.bySeverity).toEqual([
      { key: "critical", label: "CRITICAL", count: 3 },
      { key: "low", label: "LOW", count: 3 },
      { key: "unknown", label: "UNKNOWN", count: 1 },
    ]);
  });

  it("labels Event types but keeps Signal sources as they are, top few by count", () => {
    const byType = Array.from({ length: TOP_TYPES + 2 }, (_, i) => ({ key: `k${i}`, count: i + 1 }));
    const events = toCountRow("event", { total: 1, bySeverity: [], byType }, LABELS);
    const signals = toCountRow("signal", { total: 1, bySeverity: [], byType: [{ key: "Dataminr", count: 4 }] }, LABELS);
    expect(events.byType[0]).toEqual({ key: `k${TOP_TYPES + 1}`, label: `type:k${TOP_TYPES + 1}`, count: TOP_TYPES + 2 });
    expect(events.byType).toHaveLength(TOP_TYPES);
    expect(events.moreTypes).toBe(2);
    expect(signals.byType).toEqual([{ key: "Dataminr", label: "Dataminr", count: 4 }]);
  });
});
