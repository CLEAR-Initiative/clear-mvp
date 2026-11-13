import { describe, expect, it } from "vitest";
import {
  deltaPoints,
  previousRange,
  rollingWeekly,
  startOfIsoWeek,
  trendRange,
  withShares,
  type DetectionWeek,
  type GqlDetectionMetrics,
} from "./detection-metrics";

/** The trend's helpers: the rolling window, the trend and previous ranges,
 * and the tiles' change in points. */

const week = (
  isoWeek: string,
  weekStart: string,
  counts: { inRange: number | null; counted: number; sameDay: number; byNextDay: number },
): DetectionWeek => {
  const raw: GqlDetectionMetrics["weekly"][number] = {
    isoWeek,
    weekStart,
    eventsInRange: counts.inRange,
    counted: counts.counted,
    sameDay: counts.sameDay,
    byNextDay: counts.byNextDay,
    isPartial: false,
  };
  return withShares({
    from: weekStart,
    to: weekStart,
    eventsInRange: 0,
    withOnset: 0,
    counted: 0,
    sameDay: 0,
    byNextDay: 0,
    histogram: [],
    weekly: [raw],
    exclusions: [],
  }).weekly[0]!;
};

describe("rollingWeekly", () => {
  const weeks = [
    week("2026-W38", "2026-09-14T00:00:00.000Z", { inRange: 10, counted: 4, sameDay: 2, byNextDay: 4 }),
    week("2026-W39", "2026-09-21T00:00:00.000Z", { inRange: 10, counted: 0, sameDay: 0, byNextDay: 0 }),
    week("2026-W40", "2026-09-28T00:00:00.000Z", { inRange: 20, counted: 16, sameDay: 4, byNextDay: 12 }),
    week("2026-W41", "2026-10-05T00:00:00.000Z", { inRange: 0, counted: 0, sameDay: 0, byNextDay: 0 }),
    week("2026-W42", "2026-10-12T00:00:00.000Z", { inRange: 10, counted: 10, sameDay: 10, byNextDay: 10 }),
  ];

  it("pools the window's counts, so a busy week outweighs a quiet one", () => {
    const rolled = rollingWeekly(weeks, 4);
    expect(rolled.map((w) => w.windowWeeks)).toEqual([1, 2, 3, 4, 4]);
    // W40's window: W38..W40 = 20 measured of 40, 6 same day, 16 by next day.
    expect(rolled[2]).toMatchObject({ counted: 20, eventsInRange: 40, sameDay: 6, byNextDay: 16 });
    expect(rolled[2]!.sameDayShare).toBeCloseTo(0.3);
    expect(rolled[2]!.byNextDayShare).toBeCloseTo(0.8);
    expect(rolled[2]!.measuredShare).toBeCloseTo(0.5);
    // W42's window drops W38: W39..W42 = 26 measured of 40.
    expect(rolled[4]).toMatchObject({ counted: 26, eventsInRange: 40, sameDay: 14 });
  });

  it("has no coverage for a window holding a week without eventsInRange", () => {
    const older = [weeks[0]!, { ...weeks[1]!, eventsInRange: null, measuredShare: null }, weeks[2]!];
    const rolled = rollingWeekly(older, 2);
    expect(rolled.map((w) => w.measuredShare)).toEqual([0.4, null, null]);
    // The TTD shares still pool.
    expect(rolled[1]!.byNextDayShare).toBe(1);
  });

  it("leaves a week with nothing measured in its window without shares", () => {
    const rolled = rollingWeekly([weeks[1]!, weeks[3]!], 4);
    expect(rolled[1]).toMatchObject({ counted: 0, sameDayShare: null, byNextDayShare: null, measuredShare: 0 });
  });
});

describe("trendRange", () => {
  const now = new Date("2026-10-14T09:00:00Z"); // a Wednesday in 2026-W42

  it("defaults to 26 weeks ending in now's week, plus three weeks of lead-in", () => {
    const { input, showFrom } = trendRange({}, now);
    expect(showFrom).toBe("2026-04-20T00:00:00.000Z");
    expect(input).toEqual({ from: "2026-03-30T00:00:00.000Z" });
    // The 26th week shown is now's.
    expect(new Date(showFrom).getTime() + 25 * 7 * 86_400_000).toBe(startOfIsoWeek(now).getTime());
  });

  it("ends at the picked `to`, keeps the country, and widens to a longer picked range", () => {
    expect(
      trendRange({ from: "2026-10-05T00:00:00.000Z", to: "2026-10-11T23:59:59.999Z", locationId: "loc-sdn" }, now),
    ).toEqual({
      input: { from: "2026-03-23T00:00:00.000Z", to: "2026-10-11T23:59:59.999Z", locationId: "loc-sdn" },
      showFrom: "2026-04-13T00:00:00.000Z",
    });
    // A picked range starting mid-week shows from that week's Monday.
    expect(trendRange({ from: "2026-01-07T00:00:00.000Z" }, now).showFrom).toBe("2026-01-05T00:00:00.000Z");
  });

  it("stays within clear-api's 364 days, trimming the lead-in first", () => {
    const to = "2026-10-11T23:59:59.999Z";
    const { input, showFrom } = trendRange({ from: "2025-10-13T00:00:00.000Z", to }, now);
    const span = new Date(to).getTime() - new Date(input.from!).getTime();
    expect(span).toBeLessThanOrEqual(364 * 86_400_000);
    expect(input.from).toBe(showFrom);
    expect(new Date(showFrom).getUTCDay()).toBe(1);
  });
});

describe("previousRange", () => {
  it("is the same length, ending just before `from`", () => {
    expect(previousRange({ from: "2026-10-05T00:00:00.000Z", to: "2026-10-11T23:59:59.999Z" })).toEqual({
      from: "2026-09-28T00:00:00.000Z",
      to: "2026-10-04T23:59:59.999Z",
    });
  });
});

describe("deltaPoints", () => {
  it("is the difference between the rounded percents", () => {
    expect(deltaPoints(0.61, 0.55)).toBe(6);
    // 61% and 55% on screen, so 6 points, though the raw gap is 5.2.
    expect(deltaPoints(0.6149, 0.5451)).toBe(6);
    expect(deltaPoints(0.5, 0.5)).toBe(0);
    expect(deltaPoints(0.4, 0.55)).toBe(-15);
  });

  it("is null when either side has no denominator", () => {
    expect(deltaPoints(null, 0.5)).toBeNull();
    expect(deltaPoints(0.5, null)).toBeNull();
  });
});
