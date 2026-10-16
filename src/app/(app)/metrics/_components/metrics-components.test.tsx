import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import { NextIntlClientProvider } from "next-intl";
import enMessages from "../../../../../messages/en.json";
import { withShares, type GqlDetectionMetrics } from "~/lib/detection-metrics";
import { StatTiles } from "./stat-tiles";
import { bucketLabelKey, TtdHistogram } from "./ttd-histogram";
import { WeeklyTrend } from "./weekly-trend";
import { ExclusionsCard } from "./exclusions-card";
import { metricsQueryInput } from "./metrics-filters";
import { createTranslator } from "next-intl";
import { fireEvent } from "@testing-library/react";

afterEach(() => cleanup());

// jsdom lays nothing out, so give the charts a fixed size to draw into.
vi.mock("recharts", async () => {
  const actual = await vi.importActual<typeof import("recharts")>("recharts");
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: React.ReactElement<{ width?: number; height?: number }> }) =>
      React.cloneElement(children, { width: 640, height: 240 }),
  };
});

function wrap(ui: React.ReactElement) {
  return render(
    <NextIntlClientProvider locale="en" messages={enMessages}>
      <MantineProvider>{ui}</MantineProvider>
    </NextIntlClientProvider>,
  );
}

const HISTOGRAM = [
  ...Array.from({ length: 8 }, (_, d) => ({ daysAfterOnset: d, isOpenEnded: false, count: 0 })),
  { daysAfterOnset: 8, isOpenEnded: true, count: 0 },
];

const RAW: GqlDetectionMetrics = {
  from: "2026-07-20T00:00:00.000Z",
  to: "2026-10-14T12:00:00.000Z",
  eventsInRange: 40,
  withOnset: 30,
  counted: 20,
  sameDay: 5,
  byNextDay: 15,
  histogram: HISTOGRAM.map((row, i) => ({ ...row, count: i === 0 ? 5 : i === 1 ? 10 : i === 8 ? 5 : 0 })),
  weekly: [
    { isoWeek: "2026-W41", weekStart: "2026-10-05T00:00:00.000Z", counted: 4, sameDay: 1, byNextDay: 3, isPartial: false },
    { isoWeek: "2026-W42", weekStart: "2026-10-12T00:00:00.000Z", counted: 0, sameDay: 0, byNextDay: 0, isPartial: true },
  ],
  exclusions: [
    { reason: "NO_INGESTED_SIGNAL", count: 6 },
    { reason: "NO_ONSET", count: 10 },
    { reason: "DATE_ONLY_FIRST_SIGNAL", count: 3 },
    { reason: "BEFORE_ONSET", count: 1 },
  ],
};

const EMPTY: GqlDetectionMetrics = {
  ...RAW,
  eventsInRange: 0,
  withOnset: 0,
  counted: 0,
  sameDay: 0,
  byNextDay: 0,
  histogram: HISTOGRAM,
  weekly: [],
  exclusions: RAW.exclusions.map((e) => ({ ...e, count: 0 })),
};

describe("StatTiles", () => {
  it("shows each share as a whole percent with its n, coverage last", () => {
    wrap(<StatTiles metrics={withShares(RAW)} />);
    expect(screen.getByText("Detected by next day")).toBeInTheDocument();
    expect(screen.getAllByText("75%")).toHaveLength(2);
    expect(screen.getByText("25%")).toBeInTheDocument();
    expect(screen.getByText("15 of 20 measured")).toBeInTheDocument();
    expect(screen.getByText("30 of 40 in range")).toBeInTheDocument();
    expect(screen.getByText("Measured coverage")).toBeInTheDocument();
    expect(screen.getByText("50%")).toBeInTheDocument();
    expect(screen.getByText("20 of 40 in range")).toBeInTheDocument();
    // No previous period, no change line.
    expect(screen.queryByText(/pts/)).not.toBeInTheDocument();
  });

  it("shows a share with no denominator as —", () => {
    wrap(<StatTiles metrics={withShares(EMPTY)} />);
    expect(screen.getAllByText("—")).toHaveLength(4);
    expect(screen.getAllByText("0 of 0 measured")).toHaveLength(2);
  });

  it("says how many points each share moved since the previous period, up in green", () => {
    // By next day 60% (was 75%), same day 25% (unchanged), onset 80% (was 75%), coverage 50% (was 50%).
    const previous = withShares(RAW);
    const current = withShares({ ...RAW, byNextDay: 12, withOnset: 32 });
    wrap(<StatTiles metrics={current} previous={previous} />);
    const down = screen.getByText("-15 pts");
    expect(down).toHaveStyle({ color: "var(--color-critical)" });
    expect(screen.getByText("+5 pts")).toHaveStyle({ color: "var(--color-success)" });
    expect(screen.getAllByText("0 pts")).toHaveLength(2);
    expect(screen.getAllByText(/vs 75% before/)).toHaveLength(2);
  });

  it("says there is no earlier figure when the previous period measured nothing", () => {
    wrap(<StatTiles metrics={withShares(RAW)} previous={withShares(EMPTY)} />);
    expect(screen.getAllByText("No earlier figure")).toHaveLength(4);
  });
});

describe("TtdHistogram", () => {
  it("labels the nine buckets same day, next day, +2d … +7d, 8d+", () => {
    const t = createTranslator({ locale: "en", messages: enMessages, namespace: "metrics.histogram.buckets" });
    const labels = withShares(RAW).histogram.map((row) => {
      const { key, days } = bucketLabelKey(row);
      return t(key, { days });
    });
    expect(labels).toEqual(["Same day", "Next day", "+2d", "+3d", "+4d", "+5d", "+6d", "+7d", "8d+"]);
  });

  it("draws a bar per bucket, labelled, with the measured total", () => {
    const { container } = wrap(<TtdHistogram metrics={withShares(RAW)} />);
    expect(screen.getByText("Days from onset to first signal")).toBeInTheDocument();
    expect(screen.getByText(/Out of 20 measured events/)).toBeInTheDocument();
    // Multi-word labels wrap, one word per line.
    const ticks = [...container.querySelectorAll(".recharts-xAxis-tick-labels text")].map((text) =>
      [...text.querySelectorAll("tspan")].map((line) => line.textContent).join(" "),
    );
    expect(ticks).toEqual(["Same day", "Next day", "+2d", "+3d", "+4d", "+5d", "+6d", "+7d", "8d+"]);
    const fills = [...container.querySelectorAll(".recharts-bar-rectangle path")].map((p) => p.getAttribute("fill"));
    expect(fills.length).toBeGreaterThan(0);
    expect(fills.every((f) => f === "var(--color-accent)")).toBe(true);
  });
});

const SHOW_ALL = "2026-01-01T00:00:00.000Z";

describe("WeeklyTrend", () => {
  it("draws by next day solid and same day dashed, with a legend", () => {
    const { container } = wrap(<WeeklyTrend metrics={withShares(RAW)} showFrom={SHOW_ALL} defaultMode="weekly" />);
    expect(screen.getByText("By next day")).toBeInTheDocument();
    expect(screen.getByText("Same day")).toBeInTheDocument();
    const curves = [...container.querySelectorAll("path.recharts-line-curve")];
    expect(curves.map((c) => [c.getAttribute("stroke"), c.getAttribute("stroke-dasharray")])).toEqual([
      ["var(--color-accent)", null],
      ["var(--color-info)", "5 4"],
    ]);
  });

  it("labels the partial week and draws its marker hollow", () => {
    const partial = withShares({
      ...RAW,
      weekly: [RAW.weekly[0]!, { ...RAW.weekly[1]!, counted: 2, sameDay: 1, byNextDay: 2 }],
    });
    const { container } = wrap(<WeeklyTrend metrics={partial} showFrom={SHOW_ALL} defaultMode="weekly" />);
    // Once in the legend, once under the partial week's tick.
    expect(screen.getAllByText("partial")).toHaveLength(2);
    const hollow = [...container.querySelectorAll("circle")].filter(
      (c) => c.getAttribute("fill") === "var(--color-bg-white)",
    );
    expect(hollow).toHaveLength(2);
  });

  it("adds a dotted coverage line once clear-api reports each week's events in range", () => {
    const withCoverage = withShares({
      ...RAW,
      weekly: RAW.weekly.map((w, i) => ({ ...w, eventsInRange: i === 0 ? 8 : 0 })),
    });
    const { container } = wrap(<WeeklyTrend metrics={withCoverage} showFrom={SHOW_ALL} defaultMode="weekly" />);
    expect(screen.getByText("Measured coverage")).toBeInTheDocument();
    const curves = [...container.querySelectorAll("path.recharts-line-curve")];
    expect(curves.map((c) => c.getAttribute("stroke-dasharray"))).toEqual([null, "5 4", "2 3"]);
    expect(screen.getByText(/Coverage is the share of events in range/)).toBeInTheDocument();
  });

  it("says coverage needs a newer API when the weeks lack it", () => {
    wrap(<WeeklyTrend metrics={withShares(RAW)} showFrom={SHOW_ALL} />);
    expect(screen.queryByText("Measured coverage")).not.toBeInTheDocument();
    expect(screen.getByText(/A coverage line appears once/)).toBeInTheDocument();
  });

  it("draws only the weeks from showFrom, and switches between rolling and weekly", () => {
    const weeks = Array.from({ length: 6 }, (_, i) => ({
      isoWeek: `2026-W${37 + i}`,
      weekStart: new Date(Date.UTC(2026, 8, 7 + 7 * i)).toISOString(),
      eventsInRange: 10,
      counted: 10,
      sameDay: i,
      byNextDay: 10,
      isPartial: false,
    }));
    const metrics = withShares({ ...RAW, weekly: weeks });
    // Show from W40: W37..W39 are the lead-in for the first rolling window.
    const { container } = wrap(<WeeklyTrend metrics={metrics} showFrom={weeks[3]!.weekStart} />);
    const ticks = () => [...container.querySelectorAll(".recharts-xAxis-tick-labels text")].map((t) => t.textContent);
    expect(ticks()).toEqual(["Sep 28", "Oct 5", "Oct 12"]);
    expect(screen.getByText("Share of measured events over the 4 weeks to each week")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Weekly"));
    expect(screen.getByText("Share of each ISO week's measured events")).toBeInTheDocument();
    expect(ticks()).toEqual(["Sep 28", "Oct 5", "Oct 12"]);
  });

  it("shows a loading state and an error in the card", () => {
    wrap(<WeeklyTrend showFrom={SHOW_ALL} loading />);
    expect(screen.getByLabelText("Loading the trend…")).toBeInTheDocument();
    cleanup();
    wrap(<WeeklyTrend showFrom={SHOW_ALL} error="boom" />);
    expect(screen.getByRole("alert")).toHaveTextContent("Couldn't load the trend: boom");
  });
});

describe("ExclusionsCard", () => {
  it("lists the four reasons in plain language with their counts", () => {
    wrap(<ExclusionsCard metrics={withShares(RAW)} />);
    expect(screen.getByText("20 of 40 events in range, by reason")).toBeInTheDocument();
    for (const [label, count] of [
      ["No ingested signal", "6"],
      ["No onset date", "10"],
      ["First signal has no time", "3"],
      ["First signal before onset", "1"],
    ]) {
      const row = screen.getByText(label).closest("div")!.parentElement!;
      expect(row).toHaveTextContent(count!);
    }
  });

  it("shows a reason it has no words for by its code", () => {
    wrap(<ExclusionsCard metrics={withShares({ ...RAW, exclusions: [{ reason: "SOMETHING_NEW", count: 2 }] })} />);
    expect(screen.getByText("SOMETHING_NEW")).toBeInTheDocument();
  });
});

describe("metricsQueryInput", () => {
  it("omits what is empty, so clear-api applies its default", () => {
    expect(metricsQueryInput({ from: "", to: "", locationId: null })).toEqual({});
  });

  it("covers whole UTC days and sends the country by id", () => {
    expect(metricsQueryInput({ from: "2026-01-05", to: "2026-03-29", locationId: "loc-sdn" })).toEqual({
      from: "2026-01-05T00:00:00.000Z",
      to: "2026-03-29T23:59:59.999Z",
      locationId: "loc-sdn",
    });
  });
});
