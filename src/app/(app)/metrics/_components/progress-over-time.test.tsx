import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import { NextIntlClientProvider } from "next-intl";
import enMessages from "../../../../../messages/en.json";
import type { MetricAnnotationsResult, MetricDefinition, MetricDefinitionsResult, MetricSeries, MetricSeriesResult, SeriesMarker } from "~/lib/metric-series";

/**
 * The "Progress over time" section with metrics.definitions, metrics.series
 * and metrics.annotations stubbed: the selector built from the registry, the
 * lines, the recorded changes drawn as markers and listed, the form that
 * records one, the before-and-after, the controls that re-ask clear-api, the
 * table, and the unavailable state.
 */

type SeriesState = { data?: MetricSeriesResult; error?: { message: string; data?: { code: string } } | null };
let seriesStates: Record<string, SeriesState> = {};
const useSeries = vi.fn((input: { metric: string; granularity?: string }, _options?: unknown): SeriesState & { isFetching: boolean } => {
  const key = `${input.metric}:${input.granularity ?? ""}`;
  return { isFetching: false, error: null, ...(seriesStates[key] ?? seriesStates["*"] ?? {}) };
});
let definitionsState: { data?: MetricDefinitionsResult; error?: { message: string; data?: { code: string } } | null } = {};
const useDefinitions = vi.fn((..._args: unknown[]) => ({ isFetching: false, error: null, ...definitionsState }));
let annotationsState: { data?: MetricAnnotationsResult; error?: { message: string; data?: { code: string } } | null } = {};
const useAnnotations = vi.fn((..._args: unknown[]) => ({ isFetching: false, error: null, ...annotationsState }));
const createMutate = vi.fn();
const deleteMutate = vi.fn();
const invalidate = vi.fn();
vi.mock("~/trpc/react", () => ({
  api: {
    useUtils: () => ({ metrics: { annotations: { invalidate } } }),
    metrics: {
      definitions: { useQuery: (...args: unknown[]) => useDefinitions(...args) },
      series: { useQuery: (...args: unknown[]) => useSeries(...(args as [{ metric: string; granularity?: string }, unknown])) },
      annotations: { useQuery: (...args: unknown[]) => useAnnotations(...args) },
      createAnnotation: { useMutation: () => ({ mutate: createMutate, isPending: false, error: null }) },
      deleteAnnotation: { useMutation: () => ({ mutate: deleteMutate, isPending: false, error: null }) },
    },
  },
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

const DEFINITIONS: MetricDefinition[] = [
  { key: "DETECTED_BY_NEXT_DAY", name: "Detected by next day", dimension: "TIMELINESS", unit: "EVENTS", description: "Share of measured events first signalled by the next day.", timeBasis: "The first ingested signal.", groupable: false, adr: "ADR-0011" },
  { key: "DETECTED_SAME_DAY", name: "Detected same day", dimension: "TIMELINESS", unit: "EVENTS", description: "Share of measured events first signalled on the onset day.", timeBasis: "The first ingested signal.", groupable: false, adr: "ADR-0011" },
  { key: "DISTRICT_OR_FINER", name: "At district or finer", dimension: "ACCURACY", unit: "SIGNALS", description: "Share of located signals at a district or a point.", timeBasis: "The instant the signal was located.", groupable: true, adr: "ADR-0012" },
];
const marker = (id: string, at: string, label: string): SeriesMarker => ({ id, at, label, description: null, link: null, metricKeys: ["DISTRICT_OR_FINER"] });
const MARKERS: SeriesMarker[] = [
  marker("a1", "2026-10-29T18:33:00.000Z", "Geocoding inside the model's area"),
  marker("a2", "2026-10-31T13:13:00.000Z", "darfur24 located from text"),
  marker("a3", "2026-10-31T13:13:00.000Z", "Incident site over impact area (prompt v3)"),
  marker("a4", "2026-10-31T13:45:00.000Z", "Arabic gazetteer names"),
];

afterEach(() => {
  cleanup();
  seriesStates = {};
  definitionsState = {};
  annotationsState = {};
  useSeries.mockClear();
  useDefinitions.mockClear();
  useAnnotations.mockClear();
  createMutate.mockClear();
  deleteMutate.mockClear();
  invalidate.mockClear();
});

function wrap(ui: React.ReactElement) {
  if (!definitionsState.data && !definitionsState.error) definitionsState = { data: { status: "ok", definitions: DEFINITIONS } };
  if (!annotationsState.data && !annotationsState.error) annotationsState = { data: { status: "ok", annotations: MARKERS } };
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
    metric: "DISTRICT_OR_FINER",
    granularity: "DAY",
    from: `2026-10-${fromDay}T00:00:00.000Z`,
    to: `2026-10-${toDay}T23:59:59.999Z`,
    groups: ["sudan-war-x", "dataminr"],
    buckets,
  };
}
const filters = (from: string, to: string) => ({ from, to, locationId: null });
const seriesCalls = () => useSeries.mock.calls.map(([input]) => input as Record<string, unknown>);

describe("ProgressOverTime", () => {
  it("draws the metric by day with the recorded changes as markers, the before-and-after and the definition", () => {
    seriesStates["DISTRICT_OR_FINER:DAY"] = { data: { status: "ok", series: daily(25, 30) } };
    const { container } = wrap(<ProgressOverTime filters={filters("2026-10-25", "2026-10-30")} />);
    expect(screen.getByText("Progress over time")).toBeInTheDocument();
    expect(seriesCalls()[0]).toMatchObject({ metric: "DISTRICT_OR_FINER", granularity: "DAY", groupBy: "SOURCE", from: "2026-10-25T00:00:00.000Z" });
    // The changes are asked for the range the series covers and the metric shown.
    expect(useAnnotations.mock.calls.some(([input]) => JSON.stringify(input) === JSON.stringify({ from: "2026-10-25T00:00:00.000Z", to: "2026-10-30T23:59:59.999Z", metric: "DISTRICT_OR_FINER" }))).toBe(true);
    expect(screen.getByLabelText("Legend")).toHaveTextContent("sudan-war-x");
    expect(container.querySelectorAll(".recharts-line")).toHaveLength(2);
    // The one change inside the dates: drawn on the chart and listed under it.
    expect(screen.getAllByText("Geocoding inside the model's area").length).toBeGreaterThan(0);
    expect(screen.queryByText("Arabic gazetteer names")).not.toBeInTheDocument();
    const chip = screen.getByTestId("before-after");
    expect(chip).toHaveTextContent("Since Geocoding inside the model's area (Oct 29, 2026):");
    expect(chip).toHaveTextContent("sudan-war-x 39% in the 7 days before, 64% since (n = 184 and 74)");
    expect(seriesCalls().some((input) => input.granularity === "DAY" && input.from === "2026-10-22T00:00:00.000Z" && input.to === "2026-10-30T23:59:59.999Z")).toBe(true);
    expect(screen.getByTestId("definition")).toHaveTextContent("Time basis: The instant the signal was located. · ADR-0012");
  });

  it("groups several changes in one bucket under one label and hides a comparison with too little data", () => {
    seriesStates["DISTRICT_OR_FINER:DAY"] = { data: { status: "ok", series: daily(27, 31) } };
    wrap(<ProgressOverTime filters={filters("2026-10-27", "2026-10-31")} />);
    expect(screen.getByText("3 changes")).toBeInTheDocument();
    expect(screen.queryByTestId("before-after")).not.toBeInTheDocument();
    // All four are listed as changes in range.
    expect(screen.getByText("darfur24 located from text")).toBeInTheDocument();
    expect(screen.getByText("Arabic gazetteer names")).toBeInTheDocument();
  });

  it("records a change from the form and removes a listed one", () => {
    seriesStates["DISTRICT_OR_FINER:DAY"] = { data: { status: "ok", series: daily(25, 30) } };
    wrap(<ProgressOverTime filters={filters("2026-10-25", "2026-10-30")} />);
    fireEvent.click(screen.getByText("Add a change"));
    fireEvent.change(screen.getByLabelText(/^When \(UTC\)/), { target: { value: "2026-10-30T09:00" } });
    fireEvent.change(screen.getByLabelText(/^Label/), { target: { value: " Onset parser fix " } });
    fireEvent.click(screen.getByText("Save"));
    expect(createMutate).toHaveBeenCalledWith({
      at: "2026-10-30T09:00:00.000Z",
      label: "Onset parser fix",
      link: undefined,
      metricKeys: ["DISTRICT_OR_FINER"],
    });
    fireEvent.click(screen.getByLabelText("Remove Geocoding inside the model's area"));
    expect(deleteMutate).toHaveBeenCalledWith({ id: "a1" });
  });

  it("does not send an incomplete change", () => {
    seriesStates["DISTRICT_OR_FINER:DAY"] = { data: { status: "ok", series: daily(25, 30) } };
    wrap(<ProgressOverTime filters={filters("2026-10-25", "2026-10-30")} />);
    fireEvent.click(screen.getByText("Add a change"));
    fireEvent.change(screen.getByLabelText(/^Label/), { target: { value: "No date" } });
    expect(screen.getByText("Save").closest("button")).toBeDisabled();
    fireEvent.click(screen.getByText("Save"));
    expect(createMutate).not.toHaveBeenCalled();
  });

  it("builds the selector from the registry, translating known keys and naming the rest in English", () => {
    definitionsState = {
      data: {
        status: "ok",
        definitions: [
          ...DEFINITIONS,
          { key: "SOURCES_ON_SCHEDULE", name: "Sources on schedule", dimension: "RELIABILITY", unit: "SIGNALS", description: "d", timeBasis: "t", groupable: false, adr: "ADR-0016" },
        ],
      },
    };
    seriesStates["*"] = { data: { status: "ok", series: daily(27, 31) } };
    wrap(<ProgressOverTime filters={filters("2026-10-27", "2026-10-31")} />);
    fireEvent.click(screen.getByRole("textbox", { name: "Metric" }));
    expect(screen.getByRole("option", { name: "Detected same day" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Sources on schedule" })).toBeInTheDocument();
    expect(screen.getByText("Reliability")).toBeInTheDocument();
  });

  it("asks clear-api again when the metric, the bucket size or the grouping changes", () => {
    seriesStates["*"] = { data: { status: "ok", series: daily(27, 31) } };
    wrap(<ProgressOverTime filters={filters("2026-10-27", "2026-10-31")} />);
    fireEvent.click(screen.getByLabelText("Week"));
    expect(seriesCalls().some((input) => input.metric === "DISTRICT_OR_FINER" && input.granularity === "WEEK")).toBe(true);
    fireEvent.click(screen.getByLabelText("Lines per source"));
    expect(seriesCalls().some((input) => input.metric === "DISTRICT_OR_FINER" && input.groupBy === undefined)).toBe(true);
    fireEvent.click(screen.getByRole("textbox", { name: "Metric" }));
    fireEvent.click(screen.getByRole("option", { name: "Detected same day" }));
    expect(seriesCalls().some((input) => input.metric === "DETECTED_SAME_DAY" && input.groupBy === undefined)).toBe(true);
    expect(screen.queryByLabelText("Lines per source")).not.toBeInTheDocument();
  });

  it("offers a table of every bucket and every source, beyond the six lines drawn", () => {
    const groups = Array.from({ length: 7 }, (_, i) => `src${i + 1}`);
    const buckets: MetricSeries["buckets"] = [];
    for (const group of groups) {
      for (const d of [27, 28]) {
        buckets.push({ start: `2026-10-${d}T00:00:00.000Z`, label: `2026-10-${d}`, isPartial: false, group, numerator: 5, denominator: 10 });
      }
    }
    seriesStates["DISTRICT_OR_FINER:DAY"] = {
      data: { status: "ok", series: { metric: "DISTRICT_OR_FINER", granularity: "DAY", from: "2026-10-27T00:00:00.000Z", to: "2026-10-28T23:59:59.999Z", groups, buckets } },
    };
    annotationsState = { data: { status: "ok", annotations: [] } };
    const { container } = wrap(<ProgressOverTime filters={filters("2026-10-27", "2026-10-28")} />);
    expect(container.querySelectorAll(".recharts-line")).toHaveLength(6);
    expect(screen.getByLabelText("Legend")).not.toHaveTextContent("src7");
    expect(screen.getByText("No change recorded in this range yet.")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Table view"));
    const table = screen.getByRole("table");
    expect(within(table).getAllByRole("columnheader")).toHaveLength(8);
    expect(within(table).getByText("src7")).toBeInTheDocument();
  });

  it("says the registry is not deployed yet, and shows clear-api's error otherwise", () => {
    definitionsState = { data: { status: "unavailable" } };
    wrap(<ProgressOverTime filters={filters("", "")} />);
    expect(screen.getByText("Metric registry not deployed yet")).toBeInTheDocument();
    expect(useSeries.mock.calls.every(([, options]) => (options as { enabled?: boolean }).enabled === false)).toBe(true);
    cleanup();
    definitionsState = {};
    seriesStates = { "*": { error: { message: "Metrics are for platform admins", data: { code: "FORBIDDEN" } } } };
    wrap(<ProgressOverTime filters={filters("", "")} />);
    expect(screen.getByText("Metrics are for platform admins")).toBeInTheDocument();
  });
});

describe("ProgressOverTime, after review", () => {
  it("keeps the changes panel and the definition when the metric has no measured data", () => {
    const empty = { ...daily(27, 28), buckets: daily(27, 28).buckets.map((b) => ({ ...b, numerator: 0, denominator: 0 })) };
    seriesStates["DISTRICT_OR_FINER:DAY"] = { data: { status: "ok", series: empty } };
    annotationsState = { data: { status: "ok", annotations: [] } };
    wrap(<ProgressOverTime filters={filters("2026-10-27", "2026-10-28")} />);
    expect(screen.getByText("Nothing to plot in this range")).toBeInTheDocument();
    expect(screen.getByText("Add a change")).toBeInTheDocument();
    expect(screen.getByText("No change recorded in this range yet.")).toBeInTheDocument();
    expect(screen.getByTestId("definition")).toBeInTheDocument();
    expect(screen.queryByText("Table view")).not.toBeInTheDocument();
  });

  it("says when the changes could not be read, instead of claiming there are none", () => {
    seriesStates["DISTRICT_OR_FINER:DAY"] = { data: { status: "ok", series: daily(27, 30) } };
    annotationsState = { error: { message: "Metrics are for platform admins", data: { code: "FORBIDDEN" } } };
    wrap(<ProgressOverTime filters={filters("2026-10-27", "2026-10-30")} />);
    expect(screen.getByText("Couldn't load the changes: Metrics are for platform admins")).toBeInTheDocument();
    expect(screen.queryByText("No change recorded in this range yet.")).not.toBeInTheDocument();
  });
});

