import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import { NextIntlClientProvider } from "next-intl";
import enMessages from "../../../../messages/en.json";
import { withShares, type DetectionMetricsResult, type GqlDetectionMetrics } from "~/lib/detection-metrics";

/** The /metrics page's states, with metrics.detection stubbed. The page
 * reads it three times per render, in order: the picked range, the trend,
 * and the previous period. */

type QueryState = {
  data?: DetectionMetricsResult;
  error?: { message: string; data?: { code: string } } | null;
  isFetching?: boolean;
  isLoading?: boolean;
};
const KINDS = ["main", "trend", "previous"] as const;
type Kind = (typeof KINDS)[number];
let queryState: QueryState = {};
let trendState: QueryState = {};
let previousState: QueryState = {};
const useQuery = vi.fn((..._args: unknown[]) => {
  const kind = KINDS[(useQuery.mock.calls.length - 1) % 3]!;
  const state = kind === "main" ? queryState : kind === "trend" ? trendState : previousState;
  return { isFetching: false, isLoading: false, isPlaceholderData: false, error: null, ...state };
});
/** The inputs metrics.detection was last called with for one of the three reads. */
function lastInput(kind: Kind) {
  const calls = useQuery.mock.calls.filter((_, i) => KINDS[i % 3] === kind);
  return calls.at(-1)![0];
}
function lastOptions(kind: Kind) {
  const calls = useQuery.mock.calls.filter((_, i) => KINDS[i % 3] === kind);
  return calls.at(-1)![1] as { enabled?: boolean };
}
vi.mock("~/trpc/react", () => ({
  api: { metrics: { detection: { useQuery: (...args: unknown[]) => useQuery(...args) } } },
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

const { default: MetricsPage } = await import("./page");

afterEach(() => {
  cleanup();
  queryState = {};
  trendState = {};
  previousState = {};
  tree = TREE;
  useQuery.mockClear();
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
    expect(screen.queryByText("Detected by next day")).not.toBeInTheDocument();
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
    expect(screen.getByText("Detected by next day")).toBeInTheDocument();
    expect(screen.getByText("Days from onset to first signal")).toBeInTheDocument();
    expect(screen.getByText("Time to detection over time")).toBeInTheDocument();
    expect(screen.getByText("Not measured")).toBeInTheDocument();
  });

  it("asks clear-api for its default range until a date is picked, then for the picked days", () => {
    queryState = { data: { status: "ok", metrics: withShares(NONE_MEASURED) } };
    renderPage();
    expect(lastInput("main")).toEqual({});
    fireEvent.change(screen.getByLabelText("From"), { target: { value: "2026-01-05" } });
    fireEvent.change(screen.getByLabelText("To"), { target: { value: "2026-03-29" } });
    expect(lastInput("main")).toEqual({
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
    expect(lastInput("main")).toEqual({ locationId: "loc-sdn" });
    expect(lastInput("trend")).toMatchObject({ locationId: "loc-sdn" });
    expect(lastInput("previous")).toMatchObject({ locationId: "loc-sdn" });
  });

  it("offers no country when the location tree did not load, rather than names without ids", () => {
    tree = [];
    queryState = { data: { status: "ok", metrics: withShares(NONE_MEASURED) } };
    renderPage();
    expect(screen.getByRole("textbox", { name: "Country" })).toBeDisabled();
    expect(lastInput("main")).toEqual({});
  });

  it("trends at least 26 weeks ending at the picked end, whatever the picked range", () => {
    queryState = { data: { status: "ok", metrics: withShares(NONE_MEASURED) } };
    renderPage();
    fireEvent.change(screen.getByLabelText("From"), { target: { value: "2026-10-05" } });
    fireEvent.change(screen.getByLabelText("To"), { target: { value: "2026-10-11" } });
    // 26 weeks to the week of Oct 5, plus 3 weeks of lead-in for the rolling window.
    expect(lastInput("trend")).toEqual({ from: "2026-03-23T00:00:00.000Z", to: "2026-10-11T23:59:59.999Z" });
  });

  it("compares the tiles with the same-length period just before the range clear-api resolved", () => {
    const current = withShares({ ...NONE_MEASURED, counted: 4, sameDay: 2, byNextDay: 3 });
    const before = withShares({
      ...NONE_MEASURED,
      from: "2026-04-24T11:59:59.999Z",
      to: "2026-07-19T23:59:59.999Z",
      counted: 4,
      sameDay: 1,
      byNextDay: 3,
    });
    queryState = { data: { status: "ok", metrics: current } };
    previousState = { data: { status: "ok", metrics: before } };
    renderPage();
    expect(lastOptions("previous").enabled).toBe(true);
    expect(lastInput("previous")).toEqual({ from: "2026-04-24T11:59:59.999Z", to: "2026-07-19T23:59:59.999Z" });
    // Same day 50%, was 25%.
    expect(screen.getByText("+25 pts")).toBeInTheDocument();
    expect(screen.getByText(/compared with Apr 24, 2026 to Jul 19, 2026/)).toBeInTheDocument();
  });

  it("waits for the picked range before asking for the previous period", () => {
    renderPage();
    expect(lastOptions("previous").enabled).toBe(false);
  });
});
