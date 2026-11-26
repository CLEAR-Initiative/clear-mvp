import { describe, expect, it } from "vitest";
import {
  DEFAULT_TIMEFRAME,
  barsToTimeframe,
  clampTimeframe,
  parseTimeframe,
  serializeTimeframe,
  stepHandle,
  timelineExtent,
} from "./model";

const extent = timelineExtent(new Date("2026-11-23T10:00:00Z"));

describe("parseTimeframe / clampTimeframe", () => {
  it("reads relative and fixed values and rejects the rest", () => {
    expect(parseTimeframe("7d")).toEqual({ kind: "rolling", days: 7 });
    expect(serializeTimeframe(parseTimeframe("1d")!)).toBe("24h");
    expect(parseTimeframe("40d")).toEqual({ kind: "rolling", days: 40 });
    expect(parseTimeframe("2026-10-18..2026-11-17")).toEqual({ kind: "fixed", from: "2026-10-18", to: "2026-11-17" });
    for (const bad of ["", "0d", "91d", "abc", "2026-02-30..2026-03-01", "2026-11-17..2026-10-18"])
      expect(parseTimeframe(bad)).toBeNull();
  });

  it("clamps a range that starts before the timeline and drops one wholly outside it", () => {
    expect(clampTimeframe({ kind: "fixed", from: "2026-08-01", to: "2026-09-10" }, extent)).toEqual({
      kind: "fixed",
      from: "2026-08-26",
      to: "2026-09-10",
    });
    expect(clampTimeframe({ kind: "fixed", from: "2026-06-01", to: "2026-06-30" }, extent)).toEqual(DEFAULT_TIMEFRAME);
  });
});

describe("barsToTimeframe", () => {
  it("keeps a range that ends today rolling and freezes any other", () => {
    expect(barsToTimeframe([60, 89], extent)).toEqual({ kind: "rolling", days: 30 });
    expect(barsToTimeframe([53, 83], extent)).toEqual({ kind: "fixed", from: "2026-10-18", to: "2026-11-17" });
  });
});

describe("stepHandle", () => {
  it("moves a handle by key without crossing the other handle or leaving the timeline", () => {
    expect(stepHandle([10, 20], "start", "ArrowRight", false)).toEqual([11, 20]);
    expect(stepHandle([10, 20], "start", "ArrowRight", true)).toEqual([9, 20]);
    expect(stepHandle([20, 20], "start", "PageUp", false)).toEqual([20, 20]);
    expect(stepHandle([0, 20], "start", "ArrowLeft", false)).toEqual([0, 20]);
    expect(stepHandle([10, 85], "end", "End", false)).toEqual([10, 89]);
    expect(stepHandle([10, 20], "end", "Tab", false)).toBeNull();
  });
});
