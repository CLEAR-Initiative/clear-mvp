import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import { NextIntlClientProvider } from "next-intl";
import enMessages from "../../../../../messages/en.json";
import type { MetricSeries, MetricSeriesResult } from "~/lib/metric-series";

/**
 * The "Progress over time" section with metrics.series stubbed: the lines,
 * the deploy markers grouped per bucket, the before-and-after, the controls
 * that re-ask clear-api, the table, and the unavailable state.
 */

type QueryState = { data?: MetricSeriesResult; error?: { message: string; data?: { code: string } } | null };
let states: Record<string, QueryState> = {};
const useQuery = vi.fn((input: { metric: string; granularity?: string }, _options?: unknown): QueryState & { isFetching: boolean } => {
  const key = `${input.metric}:${input.granularity ?? ""}`;
  return { isFetching: false, error: null, ...(states[key] ?? states["*"] ?? {}) };
});
vi.mock("~/trpc/react", () => ({
  api: { metrics: { series: { useQuery: (...args: unknown[]) => useQuery(...(args as [{ metric: string; granularity?: string }, unknown])) } } },
}));
// jsdom lays nothing out, so give the chart a fixed size to draw into.
vi.mock("recharts", async () => {
  const actual = await vi.importActual<typeof import("recharts")>("recharts");
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: React.ReactElement<{ width?: number; height?: number }> }) =>
      React.cloneElement(children, { width: 640, height: 260 }),
  };
});

const { ProgressOverTime } = await import("./progress-over-time");

afterEach(() => {
  cleanup();
  states = {};
  useQuery.mockClear();
});

function wrap(ui: React.ReactElement) {
  return render(
    <NextIntlClientProvider locale="en" messages={enMessages}>
      <MantineProvider>{ui}</MantineProvider>
    </NextIntlClientProvider>,
  );
}

/** sudan-war-x by day around the 29 Oct deploy (dev's real shape), plus a steady dataminr. */
const X: Record<number, [number, number]> = { 27: [33, 85], 28: [39, 99], 29: [37, 110], 30: [47, 74], 31: [39, 60] };
function daily(fromDay: number, toDay: number): MetricSeries {
  const buckets: MetricSeries["buckets"] = [];
  for (const group of ["sudan-war-x", "dataminr"]) {
    for (let d = fromDay; d <= toDay; d++) {
      const [numerator, denominator] = group === "sudan-war-x" ? (X[d] ?? [0, 0]) : [50, 51];
      buckets.push({ start: `2026-10-${d}T00:00:00.000Z`, label: `2026-10-${d}`, isPartial: false, group, numerator, denominator });
    }
  }
  return {
    metric: "districtOrFiner",
    granularity: "DAY",
    from: `2026-10-${fromDay}T00:00:00.000Z`,
    to: `2026-10-${toDay}T23:59:59.999Z`,
    groups: ["sudan-war-x", "dataminr"],
    buckets,
  };
}
const filters = (from: string, to: string) => ({ from, to, locationId: null });

describe("ProgressOverTime", () => {
  it("draws the metric by day, one line per source, with the deploy marker and the before-and-after", () => {
    states["districtOrFiner:DAY"] = { data: { status: "ok", series: daily(25, 30) } };
    const { container } = wrap(<ProgressOverTime filters={filters("2026-10-25", "2026-10-30")} />);
    expect(screen.getByText("Progress over time")).toBeInTheDocument();
    // A short range reads by day without being asked.
    expect(useQuery.mock.calls[0]![0]).toMatchObject({ metric: "districtOrFiner", granularity: "DAY", from: "2026-10-25T00:00:00.000Z" });
    expect(screen.getByLabelText("Legend")).toHaveTextContent("sudan-war-x");
    expect(screen.getByLabelText("Legend")).toHaveTextContent("dataminr");
    expect(container.querySelectorAll(".recharts-line")).toHaveLength(2);
    // The 29 Oct deploy is the only marker in range: its own name, once.
    expect(screen.getByText("Geocoding inside the model's area")).toBeInTheDocument();
    // 22 to 28 Oct before (27 and 28 have data: 72 of 184), 30 Oct after (47 of 74).
    const chip = screen.getByTestId("before-after");
    expect(chip).toHaveTextContent("Since Geocoding inside the model's area (Oct 29, 2026):");
    expect(chip).toHaveTextContent("sudan-war-x 39% in the 7 days before, 64% since (n = 184 and 74)");
  });

  it("groups several changes in one bucket under one label and hides a comparison with too little data", () => {
    states["districtOrFiner:DAY"] = { data: { status: "ok", series: daily(27, 31) } };
    wrap(<ProgressOverTime filters={filters("2026-10-27", "2026-10-31")} />);
    expect(screen.getByText("3 changes")).toBeInTheDocument();
    expect(screen.getByText("Geocoding inside the model's area")).toBeInTheDocument();
    // The latest marker is on 31 Oct and nothing follows it yet.
    expect(screen.queryByTestId("before-after")).not.toBeInTheDocument();
  });

  it("asks clear-api again when the metric or the bucket size changes", () => {
    states["*"] = { data: { status: "ok", series: daily(27, 31) } };
    wrap(<ProgressOverTime filters={filters("2026-10-27", "2026-10-31")} />);
    fireEvent.click(screen.getByLabelText("Week"));
    expect(useQuery.mock.calls.some(([input]) => input.metric === "districtOrFiner" && input.granularity === "WEEK")).toBe(true);
    fireEvent.click(screen.getByRole("textbox", { name: "Metric" }));
    fireEvent.click(screen.getByRole("option", { name: "Detected same day" }));
    expect(useQuery.mock.calls.some(([input]) => input.metric === "detectedSameDay")).toBe(true);
    // Time to detection has no per-source lines, so the switch goes away.
    expect(screen.queryByLabelText("Lines per source")).not.toBeInTheDocument();
  });

  it("offers a table of every bucket and line", () => {
    states["districtOrFiner:DAY"] = { data: { status: "ok", series: daily(27, 31) } };
    wrap(<ProgressOverTime filters={filters("2026-10-27", "2026-10-31")} />);
    fireEvent.click(screen.getByText("Table view"));
    const table = screen.getByRole("table");
    expect(within(table).getByText("2026-10-30")).toBeInTheDocument();
    expect(within(table).getByText("64% (74)")).toBeInTheDocument();
    expect(screen.getByText("Hide table")).toBeInTheDocument();
  });

  it("says the series are not deployed yet, and shows clear-api's error otherwise", () => {
    states["*"] = { data: { status: "unavailable" } };
    wrap(<ProgressOverTime filters={filters("", "")} />);
    expect(screen.getByText("Day, week and month series not deployed yet")).toBeInTheDocument();
    cleanup();
    states = { "*": { error: { message: "Metrics are for platform admins", data: { code: "FORBIDDEN" } } } };
    wrap(<ProgressOverTime filters={filters("", "")} />);
    expect(screen.getByText("Metrics are for platform admins")).toBeInTheDocument();
  });
});
