import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import { NextIntlClientProvider } from "next-intl";
import enMessages from "../../../../../messages/en.json";
import type { MetricAnnotationsResult, MetricDefinition, MetricDefinitionsResult, MetricSeries, MetricSeriesResult, ReplayRunsResult, SeriesMarker } from "~/lib/metric-series";

/**
 * The "Progress over time" section with metrics.definitions, metrics.series
 * and metrics.annotations stubbed: the selector built from the registry, the
 * lines, the recorded changes drawn as markers and listed, the form that
 * records one, the before-and-after, the controls that re-ask clear-api, the
 * table, and the unavailable state.
 */

type SeriesState = { data?: MetricSeriesResult; error?: { message: string; data?: { code: string } } | null };
let seriesStates: Record<string, SeriesState> = {};
const useSeries = vi.fn((input: { metric: string; granularity?: string; replayRunId?: string }, _options?: unknown): SeriesState & { isFetching: boolean } => {
  // The replay series of a run is its own query; with no run chosen it is not enabled and has no data.
  if ("replayRunId" in input) return { isFetching: false, error: null, ...(input.replayRunId ? (seriesStates[`replay:${input.replayRunId}`] ?? {}) : {}) };
  const key = `${input.metric}:${input.granularity ?? ""}`;
  return { isFetching: false, error: null, ...(seriesStates[key] ?? seriesStates["*"] ?? {}) };
});
let replayRunsState: { data?: ReplayRunsResult; error?: { message: string; data?: { code: string } } | null } = {};
const useReplayRuns = vi.fn((..._args: unknown[]) => ({ isFetching: false, error: null, ...replayRunsState }));
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
      replayRuns: { useQuery: (...args: unknown[]) => useReplayRuns(...args) },
      annotations: { useQuery: (...args: unknown[]) => useAnnotations(...args) },
      createAnnotation: { useMutation: () => ({ mutate: createMutate, isPending: false, error: null }) },
      deleteAnnotation: { useMutation: () => ({ mutate: deleteMutate, isPending: false, error: null }) },
    },
  },
}));
let search = "";
const replace = vi.fn();
vi.mock("next/navigation", () => ({
  usePathname: () => "/metrics",
  useRouter: () => ({ replace }),
  useSearchParams: () => new URLSearchParams(search),
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
const { MetricsUrlProvider } = await import("./metrics-url-state");

const DEFINITIONS: MetricDefinition[] = [
  { key: "DETECTED_BY_NEXT_DAY", name: "Detected by next day", dimension: "TIMELINESS", unit: "EVENTS", description: "Share of measured events first signalled by the next day.", timeBasis: "The first ingested signal.", groupable: false, adr: "ADR-0011" },
  { key: "DETECTED_SAME_DAY", name: "Detected same day", dimension: "TIMELINESS", unit: "EVENTS", description: "Share of measured events first signalled on the onset day.", timeBasis: "The first ingested signal.", groupable: false, adr: "ADR-0011" },
  { key: "DISTRICT_OR_FINER", name: "At district or finer", dimension: "ACCURACY", unit: "SIGNALS", description: "Share of located signals at a district or a point.", timeBasis: "The instant the signal was located.", groupable: true, adr: "ADR-0012" },
];
/** Source health reads every country: the page's country filter must not reach it. */
const EVERY_COUNTRY: MetricDefinition = {
  key: "SOURCES_ON_SCHEDULE",
  name: "Sources on schedule",
  dimension: "RELIABILITY",
  unit: "SOURCE_DAYS",
  description: "Share of source-days on schedule.",
  timeBasis: "Each UTC day.",
  groupable: true,
  locationScoped: false,
  adr: "ADR-0017",
};
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
  replayRunsState = {};
  useReplayRuns.mockClear();
  search = "";
  replace.mockClear();
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
      <MantineProvider>
        <MetricsUrlProvider>{ui}</MetricsUrlProvider>
      </MantineProvider>
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
/** The history series the component asked for; the replay series is its own query. */
const seriesCalls = () =>
  useSeries.mock.calls.map(([input]) => input as Record<string, unknown>).filter((input) => !("replayRunId" in input));

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

describe("ProgressOverTime, overview tiles and URL state", () => {
  it("shows every registry metric at a glance and selects one on click, writing it to the URL", () => {
    seriesStates["*"] = { data: { status: "ok", series: daily(27, 31) } };
    wrap(<ProgressOverTime filters={filters("2026-10-27", "2026-10-31")} />);
    expect(screen.getByText("At a glance")).toBeInTheDocument();
    for (const name of ["Detected by next day", "Detected same day", "At district or finer"]) {
      expect(screen.getByRole("button", { name: `Show ${name}` })).toBeInTheDocument();
    }
    expect(screen.getByRole("button", { name: "Show At district or finer" })).toHaveAttribute("aria-pressed", "true");
    // Each tile reads the weekly series, ungrouped; the latest day with data is 31 Oct, 39 of 60 plus 50 of 51 = 80%.
    expect(seriesCalls().some((input) => input.metric === "DETECTED_SAME_DAY" && input.granularity === "WEEK" && input.groupBy === undefined)).toBe(true);
    expect(screen.getByTestId("tile-value-DISTRICT_OR_FINER")).toHaveTextContent("80%");
    fireEvent.click(screen.getByRole("button", { name: "Show Detected same day" }));
    expect(screen.getByRole("button", { name: "Show Detected same day" })).toHaveAttribute("aria-pressed", "true");
    expect(seriesCalls().some((input) => input.metric === "DETECTED_SAME_DAY" && input.granularity === "DAY")).toBe(true);
    expect(replace).toHaveBeenCalledWith("/metrics?metric=DETECTED_SAME_DAY", { scroll: false });
  });

  it("reads the metric, bucket size and grouping from the URL on load", () => {
    search = "metric=DETECTED_SAME_DAY&granularity=month&lines=all&from=2026-10-01";
    seriesStates["*"] = { data: { status: "ok", series: { ...daily(27, 31), metric: "DETECTED_SAME_DAY", groups: [], buckets: daily(27, 31).buckets.filter((b) => b.group === "sudan-war-x").map((b) => ({ ...b, group: null })) } } };
    wrap(<ProgressOverTime filters={filters("2026-10-01", "2026-10-31")} />);
    expect(screen.getByRole("textbox", { name: "Metric" })).toHaveValue("Detected same day");
    expect(screen.getByLabelText("Month")).toBeChecked();
    expect(seriesCalls()[0]).toMatchObject({ metric: "DETECTED_SAME_DAY", granularity: "MONTH" });
    fireEvent.click(screen.getByLabelText("Week"));
    expect(replace).toHaveBeenCalledWith("/metrics?metric=DETECTED_SAME_DAY&granularity=week&lines=all&from=2026-10-01", { scroll: false });
  });

  it("copies the page's link", async () => {
    const writeText = vi.fn(async () => undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    seriesStates["*"] = { data: { status: "ok", series: daily(27, 31) } };
    wrap(<ProgressOverTime filters={filters("2026-10-27", "2026-10-31")} />);
    fireEvent.click(screen.getByText("Copy link"));
    // The link names the view, also when the page's own URL does not.
    expect(writeText).toHaveBeenCalledWith(`${window.location.href}?view=as-delivered`);
    expect(await screen.findByText("Link copied")).toBeInTheDocument();
  });
});

describe("ProgressOverTime, the two views", () => {
  /** An ungrouped delay series over the same days as `daily`. */
  const delay = (metric: string): MetricSeries => ({
    ...daily(25, 30),
    metric,
    groups: [],
    buckets: daily(25, 30).buckets.filter((b) => b.group === "sudan-war-x").map((b) => ({ ...b, group: null })),
  });
  const delayMarkers: SeriesMarker[] = [{ ...MARKERS[0]!, metricKeys: ["DETECTED_BY_NEXT_DAY", "DISTRICT_OR_FINER"] }];

  it("opens on As delivered, says what it is on the page, and sends no onset basis", () => {
    seriesStates["*"] = { data: { status: "ok", series: daily(25, 30) } };
    wrap(<ProgressOverTime filters={filters("2026-10-25", "2026-10-30")} />);
    expect(screen.getByRole("tab", { name: "As delivered" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: "Same ruler" })).toHaveAttribute("aria-selected", "false");
    expect(screen.getByTestId("view-description")).toHaveTextContent("Every value as the pipeline gave it at the time.");
    expect(screen.getByTestId("view-description")).toHaveTextContent("past weeks do not move");
    // Every read of this tab, the chart's and the tiles', is the default view.
    expect(seriesCalls().length).toBeGreaterThan(0);
    expect(seriesCalls().every((input) => input.onsetBasis === undefined)).toBe(true);
    // The card and the legend name the view.
    expect(screen.getByText("At district or finer · As delivered")).toBeInTheDocument();
    expect(screen.getByTestId("legend-view")).toHaveTextContent("As delivered");
    expect(screen.getByTestId("before-after")).toBeInTheDocument();
  });

  it("switches to Same ruler: the delay metrics only, onsetBasis CURRENT, the markers and no before-and-after", async () => {
    seriesStates["*"] = { data: { status: "ok", series: delay("DETECTED_BY_NEXT_DAY") } };
    annotationsState = { data: { status: "ok", annotations: delayMarkers } };
    const writeText = vi.fn(async () => undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    wrap(<ProgressOverTime filters={filters("2026-10-25", "2026-10-30")} />);
    useSeries.mockClear();
    fireEvent.click(screen.getByRole("tab", { name: "Same ruler" }));

    expect(screen.getByRole("tab", { name: "Same ruler" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByTestId("view-description")).toHaveTextContent("measured against the start date CLEAR knows today");
    expect(screen.getByTestId("view-description")).toHaveTextContent("past weeks move when CLEAR learns a better start date");
    // District precision has one view, so the tab opens on a delay metric and writes both to the URL.
    expect(replace).toHaveBeenLastCalledWith("/metrics?metric=DETECTED_BY_NEXT_DAY&view=same-ruler", { scroll: false });
    expect(screen.getByRole("textbox", { name: "Metric" })).toHaveValue("Detected by next day");
    // The tiles and the selector offer the delay metrics only.
    expect(screen.getByRole("button", { name: "Show Detected same day" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Show At district or finer" })).not.toBeInTheDocument();
    // jsdom has no scrollIntoView, and the open dropdown calls it.
    Element.prototype.scrollIntoView = vi.fn();
    fireEvent.click(screen.getByRole("textbox", { name: "Metric" }));
    expect(screen.getByRole("option", { name: "Detected same day" })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "At district or finer" })).not.toBeInTheDocument();
    // The open tab's panel holds the content and names its tab.
    expect(screen.getByRole("tabpanel")).toHaveAccessibleName("Same ruler");
    expect(within(screen.getByRole("tabpanel")).getByTestId("view-description")).toBeInTheDocument();
    // Every read on this tab asks for the onset known today.
    expect(seriesCalls().length).toBeGreaterThan(0);
    expect(seriesCalls().every((input) => input.onsetBasis === "CURRENT")).toBe(true);
    expect(seriesCalls().every((input) => ["DETECTED_BY_NEXT_DAY", "DETECTED_SAME_DAY"].includes(input.metric as string))).toBe(true);
    // The card and the legend name the view; the deploy marker stays; the before-and-after does not.
    expect(screen.getByText("Detected by next day · Same ruler")).toBeInTheDocument();
    expect(screen.getByTestId("legend-view")).toHaveTextContent("Same ruler");
    expect(screen.getAllByText("Geocoding inside the model's area").length).toBeGreaterThan(0);
    expect(screen.queryByTestId("before-after")).not.toBeInTheDocument();
    // The copied link names the view.
    fireEvent.click(screen.getByText("Copy link"));
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining("view=same-ruler"));
    expect(await screen.findByText("Link copied")).toBeInTheDocument();

    // Back on As delivered, every metric is offered again and the reads carry no onset basis.
    useSeries.mockClear();
    fireEvent.click(screen.getByRole("tab", { name: "As delivered" }));
    expect(screen.getByRole("button", { name: "Show At district or finer" })).toBeInTheDocument();
    expect(seriesCalls().every((input) => input.onsetBasis === undefined)).toBe(true);
    expect(screen.getByText("Detected by next day · As delivered")).toBeInTheDocument();
    expect(screen.getByTestId("before-after")).toBeInTheDocument();
  });

  it("opens the tab a link names, and a delay metric when the link asks Same ruler for another metric", () => {
    search = "view=same-ruler&metric=DETECTED_SAME_DAY";
    seriesStates["*"] = { data: { status: "ok", series: delay("DETECTED_SAME_DAY") } };
    wrap(<ProgressOverTime filters={filters("2026-10-25", "2026-10-30")} />);
    expect(screen.getByRole("tab", { name: "Same ruler" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("textbox", { name: "Metric" })).toHaveValue("Detected same day");
    expect(seriesCalls().every((input) => input.onsetBasis === "CURRENT")).toBe(true);
    cleanup();

    search = "view=same-ruler&metric=DISTRICT_OR_FINER";
    wrap(<ProgressOverTime filters={filters("2026-10-25", "2026-10-30")} />);
    expect(screen.getByRole("textbox", { name: "Metric" })).toHaveValue("Detected by next day");
    expect(screen.getByText("Detected by next day · Same ruler")).toBeInTheDocument();
  });
});


describe("ProgressOverTime and a metric that reads every country", () => {
  it("reads it without the country filter and says so, while scoped metrics keep the country", () => {
    definitionsState = { data: { status: "ok", definitions: [...DEFINITIONS, EVERY_COUNTRY] } };
    seriesStates["*"] = { data: { status: "ok", series: { ...daily(27, 31), metric: "SOURCES_ON_SCHEDULE" } } };
    search = "metric=SOURCES_ON_SCHEDULE";
    wrap(<ProgressOverTime filters={{ from: "2026-10-27", to: "2026-10-31", locationId: "loc-sdn" }} />);
    const chartCalls = seriesCalls().filter((input) => input.metric === "SOURCES_ON_SCHEDULE");
    expect(chartCalls.length).toBeGreaterThan(0);
    expect(chartCalls.every((input) => input.locationId === undefined)).toBe(true);
    expect(screen.getByTestId("every-country")).toHaveTextContent("Reads every country: the country filter does not apply to this metric.");
    expect(seriesCalls().some((input) => input.metric === "DISTRICT_OR_FINER" && input.locationId === "loc-sdn")).toBe(true);
    // The tile says so too, in a word.
    expect(screen.getByRole("button", { name: "Show Sources on schedule" })).toHaveTextContent("every country");
  });
});

describe("ProgressOverTime and a Replay run", () => {
  const RUN = { runId: "place-names-backfill:plan.jsonl", pipelineVersion: "def4567890abc", startedAt: "2026-11-09T10:00:00.000Z", signals: 150 };
  /** What the run does with sudan-war-x: more Signals at a district, for part of the Signals in range. */
  function replayed(): MetricSeries {
    const series = daily(25, 30);
    return {
      ...series,
      groups: ["sudan-war-x"],
      buckets: series.buckets
        .filter((bucket) => bucket.group === "sudan-war-x" && bucket.denominator > 0)
        .map((bucket) => ({ ...bucket, numerator: 40, denominator: 50 })),
    };
  }

  it("offers no run selector when no run re-located a Signal in range, or for a metric with no replay series", () => {
    seriesStates["*"] = { data: { status: "ok", series: daily(25, 30) } };
    replayRunsState = { data: { status: "ok", runs: [] } };
    wrap(<ProgressOverTime filters={filters("2026-10-25", "2026-10-30")} />);
    expect(screen.queryByRole("textbox", { name: "Replay run" })).not.toBeInTheDocument();
    expect(screen.queryByTestId("replay-coverage")).not.toBeInTheDocument();
    cleanup();

    // A failed read is said, not shown as "no runs".
    replayRunsState = { error: { message: "clear-api timed out" } };
    wrap(<ProgressOverTime filters={filters("2026-10-25", "2026-10-30")} />);
    expect(screen.getByTestId("replay-runs-error")).toHaveTextContent("Could not load the Replay runs: clear-api timed out");
    cleanup();

    replayRunsState = { data: { status: "ok", runs: [RUN] } };
    search = "metric=DETECTED_BY_NEXT_DAY";
    wrap(<ProgressOverTime filters={filters("2026-10-25", "2026-10-30")} />);
    expect(screen.queryByRole("textbox", { name: "Replay run" })).not.toBeInTheDocument();
  });

  it("draws the chosen run as a second line, with its version in the legend and its coverage", () => {
    seriesStates["DISTRICT_OR_FINER:DAY"] = { data: { status: "ok", series: daily(25, 30) } };
    seriesStates[`replay:${RUN.runId}`] = { data: { status: "ok", series: replayed() } };
    replayRunsState = { data: { status: "ok", runs: [RUN] } };
    const { container } = wrap(<ProgressOverTime filters={filters("2026-10-25", "2026-10-30")} />);
    // The runs are asked for the page's range.
    expect(useReplayRuns.mock.calls[0]?.[0]).toMatchObject({ from: "2026-10-25T00:00:00.000Z" });
    expect(container.querySelectorAll(".recharts-line")).toHaveLength(2);

    fireEvent.click(screen.getByRole("textbox", { name: "Replay run" }));
    fireEvent.click(screen.getByRole("option", { name: /^def4567 · Nov 9, 2026, 10:00.*· 150 Signals$/, hidden: true }));

    // The replay series is asked for the same range, bucket size and grouping, with the run.
    const asked = useSeries.mock.calls.map(([input]) => input as Record<string, unknown>).filter((input) => input.replayRunId === RUN.runId);
    expect(asked.at(-1)).toMatchObject({ metric: "DISTRICT_OR_FINER", granularity: "DAY", groupBy: "SOURCE", from: "2026-10-25T00:00:00.000Z" });
    expect(container.querySelectorAll(".recharts-line")).toHaveLength(3);
    expect(screen.getByLabelText("Legend")).toHaveTextContent("Replay (def4567)");
    // sudan-war-x has 368 Signals in range (27 to 30 Oct); the run re-processed 4 days of 50.
    expect(screen.getByTestId("replay-coverage")).toHaveTextContent("Replay run def4567, started Nov 9, 2026: it re-processed 200 of 368 Signals in range (sudan-war-x).");
  });
});
