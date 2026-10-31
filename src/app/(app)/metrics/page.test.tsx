import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import { NextIntlClientProvider } from "next-intl";
import enMessages from "../../../../messages/en.json";
import { withShares, type DetectionMetricsResult, type GqlDetectionMetrics } from "~/lib/detection-metrics";

/** The /metrics page's states, with metrics.detection stubbed. */

let queryState: {
  data?: DetectionMetricsResult;
  error?: { message: string; data?: { code: string } } | null;
  isFetching?: boolean;
} = {};
const useQuery = vi.fn((..._args: unknown[]) => ({ isFetching: false, error: null, ...queryState }));
// Location precision has its own query; the page tests pin the TTD states and
// only check that the section renders (its own tests cover its states).
let precisionState: { data?: unknown; error?: { message: string; data?: { code: string } } | null } = {};
const usePrecisionQuery = vi.fn((..._args: unknown[]) => ({ isFetching: false, error: null, ...precisionState }));
// "Progress over time" has its own query too; left loading here, its own tests cover its states.
const useSeriesQuery = vi.fn((..._args: unknown[]) => ({ isFetching: false, error: null }));
vi.mock("~/trpc/react", () => ({
  api: {
    useUtils: () => ({ metrics: { annotations: { invalidate: vi.fn() } } }),
    metrics: {
      detection: { useQuery: (...args: unknown[]) => useQuery(...args) },
      locationPrecision: { useQuery: (...args: unknown[]) => usePrecisionQuery(...args) },
      definitions: { useQuery: (...args: unknown[]) => useSeriesQuery(...args) },
      series: { useQuery: (...args: unknown[]) => useSeriesQuery(...args) },
      annotations: { useQuery: (...args: unknown[]) => useSeriesQuery(...args) },
      createAnnotation: { useMutation: () => ({ mutate: vi.fn(), isPending: false, error: null }) },
      deleteAnnotation: { useMutation: () => ({ mutate: vi.fn(), isPending: false, error: null }) },
    },
  },
}));
// The location tree as useLocations serves it; empty when locations.tree
// failed, while `countries` falls back to names with no ids.
const TREE = [
  { id: "loc-tcd", name: "Chad", states: [] },
  { id: "loc-sdn", name: "Sudan", states: [] },
];
let tree: Array<{ id: string; name: string; states: never[] }> = TREE;
vi.mock("~/hooks/use-locations", () => ({
  useLocations: () => ({ countries: ["Chad", "Sudan"], tree, isLoading: false }),
}));
vi.mock("recharts", async () => {
  const actual = await vi.importActual<typeof import("recharts")>("recharts");
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: React.ReactElement<{ width?: number; height?: number }> }) =>
      React.cloneElement(children, { width: 640, height: 240 }),
  };
});
let search = "";
const replace = vi.fn();
vi.mock("next/navigation", () => ({
  usePathname: () => "/metrics",
  useRouter: () => ({ replace }),
  useSearchParams: () => new URLSearchParams(search),
}));

const { default: MetricsPage } = await import("./page");

afterEach(() => {
  cleanup();
  queryState = {};
  precisionState = {};
  search = "";
  replace.mockClear();
  tree = TREE;
  useQuery.mockClear();
  usePrecisionQuery.mockClear();
});

function renderPage() {
  return render(
    <NextIntlClientProvider locale="en" messages={enMessages}>
      <MantineProvider>
        <MetricsPage />
      </MantineProvider>
    </NextIntlClientProvider>,
  );
}

const HISTOGRAM = [
  ...Array.from({ length: 8 }, (_, d) => ({ daysAfterOnset: d, isOpenEnded: false, count: 0 })),
  { daysAfterOnset: 8, isOpenEnded: true, count: 0 },
];
const EXCLUSIONS = [
  { reason: "NO_INGESTED_SIGNAL", count: 2 },
  { reason: "NO_ONSET", count: 3 },
  { reason: "DATE_ONLY_FIRST_SIGNAL", count: 0 },
  { reason: "BEFORE_ONSET", count: 0 },
];
const NONE_MEASURED: GqlDetectionMetrics = {
  from: "2026-07-20T00:00:00.000Z",
  to: "2026-10-14T12:00:00.000Z",
  eventsInRange: 5,
  withOnset: 2,
  counted: 0,
  sameDay: 0,
  byNextDay: 0,
  histogram: HISTOGRAM,
  weekly: [],
  exclusions: EXCLUSIONS,
};

describe("MetricsPage", () => {
  it("says the API is not deployed yet when clear-api lacks the field", () => {
    queryState = { data: { status: "unavailable" } };
    renderPage();
    expect(screen.getByText("Metrics API not deployed yet")).toBeInTheDocument();
  });

  it("shows clear-api's error message", () => {
    queryState = { error: { message: "Metrics are for platform admins", data: { code: "FORBIDDEN" } } };
    renderPage();
    expect(screen.getByText("Metrics are for platform admins")).toBeInTheDocument();
  });

  it("with nothing measured, says so and still lists the exclusions", () => {
    queryState = { data: { status: "ok", metrics: withShares(NONE_MEASURED) } };
    renderPage();
    expect(screen.getByText("No measurable events in this range")).toBeInTheDocument();
    // The tiles stay away; the metric selector above also names "Detected by next day", so test a tile-only text.
    expect(screen.queryByText("Events measured")).not.toBeInTheDocument();
    expect(screen.getByText("No ingested signal")).toBeInTheDocument();
    expect(screen.getByText("How this is measured")).toBeInTheDocument();
  });

  it("with events measured, shows the tiles, both charts and the exclusions", () => {
    queryState = {
      data: {
        status: "ok",
        metrics: withShares({
          ...NONE_MEASURED,
          counted: 4,
          sameDay: 1,
          byNextDay: 3,
          histogram: HISTOGRAM.map((r, i) => ({ ...r, count: i === 0 ? 1 : i === 1 ? 2 : i === 3 ? 1 : 0 })),
        }),
      },
    };
    renderPage();
    expect(screen.getByText("Events measured")).toBeInTheDocument();
    expect(screen.getByText("3 of 4 measured")).toBeInTheDocument();
    expect(screen.getByText("Days from onset to first signal")).toBeInTheDocument();
    expect(screen.getByText("Weekly trend")).toBeInTheDocument();
    expect(screen.getByText("Not measured")).toBeInTheDocument();
  });

  it("asks clear-api for its default range until a date is picked, then for the picked days", () => {
    queryState = { data: { status: "ok", metrics: withShares(NONE_MEASURED) } };
    renderPage();
    expect(useQuery.mock.calls.at(-1)![0]).toEqual({});
    fireEvent.change(screen.getByLabelText("From"), { target: { value: "2026-01-05" } });
    fireEvent.change(screen.getByLabelText("To"), { target: { value: "2026-03-29" } });
    expect(useQuery.mock.calls.at(-1)![0]).toEqual({
      from: "2026-01-05T00:00:00.000Z",
      to: "2026-03-29T23:59:59.999Z",
    });
    expect(screen.getByText("Showing Jul 20, 2026 to Oct 14, 2026")).toBeInTheDocument();
  });

  it("shows clear-api's range error by the dates, not as a page error", () => {
    queryState = { error: { message: "The range can span at most 364 days", data: { code: "BAD_REQUEST" } } };
    renderPage();
    expect(screen.getByRole("alert")).toHaveTextContent("The range can span at most 364 days");
    expect(screen.queryByText("Couldn't load the metrics")).not.toBeInTheDocument();
  });

  it("filters by the picked country's location id", async () => {
    queryState = { data: { status: "ok", metrics: withShares(NONE_MEASURED) } };
    renderPage();
    fireEvent.click(screen.getByRole("textbox", { name: "Country" }));
    fireEvent.click(await screen.findByRole("option", { name: "Sudan" }));
    expect(useQuery.mock.calls.at(-1)![0]).toEqual({ locationId: "loc-sdn" });
  });

  it("renders the location precision section below time to detection, sharing the filters", () => {
    queryState = { data: { status: "ok", metrics: withShares(NONE_MEASURED) } };
    precisionState = { data: { status: "unavailable" } };
    renderPage();
    expect(screen.getByRole("heading", { name: "Location precision" })).toBeInTheDocument();
    expect(screen.getByText("Location precision not deployed yet")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("From"), { target: { value: "2026-01-05" } });
    expect(usePrecisionQuery.mock.calls.at(-1)![0]).toEqual({ from: "2026-01-05T00:00:00.000Z" });
  });

  it("offers no country when the location tree did not load, rather than names without ids", () => {
    tree = [];
    queryState = { data: { status: "ok", metrics: withShares(NONE_MEASURED) } };
    renderPage();
    expect(screen.getByRole("textbox", { name: "Country" })).toBeDisabled();
    expect(useQuery.mock.calls.at(-1)![0]).toEqual({});
  });

  it("restores the range and country from the URL and writes a change back to it", () => {
    search = "from=2026-10-20&to=2026-10-27&location=loc-sdn&metric=DISTRICT_OR_FINER";
    queryState = { data: { status: "ok", metrics: withShares(NONE_MEASURED) } };
    renderPage();
    expect(useQuery.mock.calls.at(-1)![0]).toEqual({
      from: "2026-10-20T00:00:00.000Z",
      to: "2026-10-27T23:59:59.999Z",
      locationId: "loc-sdn",
    });
    expect(screen.getByLabelText("From")).toHaveValue("2026-10-20");
    fireEvent.change(screen.getByLabelText("To"), { target: { value: "2026-10-31" } });
    expect(replace).toHaveBeenCalledWith("/metrics?from=2026-10-20&to=2026-10-31&location=loc-sdn&metric=DISTRICT_OR_FINER", { scroll: false });
  });
});
