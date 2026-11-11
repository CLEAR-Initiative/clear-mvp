import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import { NextIntlClientProvider } from "next-intl";
import enMessages from "../../../../messages/en.json";
import { withShares, type DetectionMetricsResult, type GqlDetectionMetrics } from "~/lib/detection-metrics";
import type { AgentMetrics, AgentMetricsResult, AgentQuestionsResult } from "~/lib/agent-metrics";

/** The /metrics page's states, with metrics.detection stubbed. The page
 * reads it three times per render, in order: the picked range, the trend,
 * and the previous period. */

type QueryState = {
  data?: DetectionMetricsResult;
  error?: { message: string; data?: { code: string } } | null;
  isFetching?: boolean;
  isLoading?: boolean;
  isPlaceholderData?: boolean;
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
// Location precision has its own query; the page tests pin the TTD states and
// only check that the section renders (its own tests cover its states).
let precisionState: { data?: unknown; error?: { message: string; data?: { code: string } } | null } = {};
const usePrecisionQuery = vi.fn((..._args: unknown[]) => ({ isFetching: false, error: null, ...precisionState }));
// "Progress over time" has its own query too; left loading here, its own tests cover its states.
const useSeriesQuery = vi.fn((..._args: unknown[]) => ({ isFetching: false, error: null }));
let agentState: {
  data?: AgentMetricsResult;
  error?: { message: string; data?: { code: string } } | null;
} = {};
const useAgentQuery = vi.fn((..._args: unknown[]) => ({ isFetching: false, error: null, ...agentState }));
let questionsState: { data?: AgentQuestionsResult; error?: { message: string } | null; isPending?: boolean } = {};
const refetchQuestions = vi.fn();
const useQuestionsQuery = vi.fn((..._args: unknown[]) => ({
  isPending: false,
  isFetching: false,
  error: null,
  refetch: refetchQuestions,
  ...questionsState,
}));
vi.mock("~/trpc/react", () => ({
  api: {
    useUtils: () => ({ metrics: { annotations: { invalidate: vi.fn() } } }),
    metrics: {
      detection: { useQuery: (...args: unknown[]) => useQuery(...args) },
      locationPrecision: { useQuery: (...args: unknown[]) => usePrecisionQuery(...args) },
      definitions: { useQuery: (...args: unknown[]) => useSeriesQuery(...args) },
      series: { useQuery: (...args: unknown[]) => useSeriesQuery(...args) },
      // No Replay run in these tests: the progress chart shows its history line only.
      replayRuns: { useQuery: () => ({ isFetching: false, error: null, data: { status: "ok", runs: [] } }) },
      annotations: { useQuery: (...args: unknown[]) => useSeriesQuery(...args) },
      createAnnotation: { useMutation: () => ({ mutate: vi.fn(), isPending: false, error: null }) },
      deleteAnnotation: { useMutation: () => ({ mutate: vi.fn(), isPending: false, error: null }) },
      agent: { useQuery: (...args: unknown[]) => useAgentQuery(...args) },
      agentQuestions: { useQuery: (...args: unknown[]) => useQuestionsQuery(...args) },
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
  trendState = {};
  previousState = {};
  precisionState = {};
  agentState = {};
  questionsState = {};
  search = "";
  replace.mockClear();
  tree = TREE;
  useQuery.mockClear();
  usePrecisionQuery.mockClear();
  useAgentQuery.mockClear();
  useQuestionsQuery.mockClear();
  refetchQuestions.mockClear();
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
    expect(screen.queryByText("Measured coverage")).not.toBeInTheDocument();
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
    expect(screen.getByText("Measured coverage")).toBeInTheDocument();
    expect(screen.getByText("3 of 4 measured")).toBeInTheDocument();
    expect(screen.getByText("Days from onset to first signal")).toBeInTheDocument();
    expect(screen.getByText("Trend")).toBeInTheDocument();
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
    expect(lastInput("main")).toEqual({});
  });

  it("restores the range and country from the URL and writes a change back to it", () => {
    search = "from=2026-10-20&to=2026-10-27&location=loc-sdn&metric=DISTRICT_OR_FINER";
    queryState = { data: { status: "ok", metrics: withShares(NONE_MEASURED) } };
    renderPage();
    expect(lastInput("main")).toEqual({
      from: "2026-10-20T00:00:00.000Z",
      to: "2026-10-27T23:59:59.999Z",
      locationId: "loc-sdn",
    });
    expect(screen.getByLabelText("From")).toHaveValue("2026-10-20");
    fireEvent.change(screen.getByLabelText("To"), { target: { value: "2026-10-31" } });
    expect(replace).toHaveBeenCalledWith("/metrics?from=2026-10-20&to=2026-10-31&location=loc-sdn&metric=DISTRICT_OR_FINER", { scroll: false });
  });
  it("trends at least 26 weeks ending at the picked end, whatever the picked range", () => {
    queryState = { data: { status: "ok", metrics: withShares(NONE_MEASURED) } };
    renderPage();
    fireEvent.change(screen.getByLabelText("From"), { target: { value: "2026-10-05" } });
    fireEvent.change(screen.getByLabelText("To"), { target: { value: "2026-10-11" } });
    // 26 weeks to the week of Oct 5, plus 3 weeks of lead-in for the rolling window.
    expect(lastInput("trend")).toEqual({ from: "2026-03-23T00:00:00.000Z", to: "2026-10-11T23:59:59.999Z" });
  });

  it("keeps the country on the trend and the previous period", async () => {
    queryState = { data: { status: "ok", metrics: withShares(NONE_MEASURED) } };
    renderPage();
    fireEvent.click(screen.getByRole("textbox", { name: "Country" }));
    fireEvent.click(await screen.findByRole("option", { name: "Sudan" }));
    expect(lastInput("trend")).toMatchObject({ locationId: "loc-sdn" });
    expect(lastInput("previous")).toMatchObject({ locationId: "loc-sdn" });
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

  it("compares nothing while the tiles still show the last country's figures", () => {
    const before = withShares({ ...NONE_MEASURED, counted: 4, sameDay: 1, byNextDay: 3 });
    // keepPreviousData: the main query shows the old country's figures.
    queryState = {
      data: { status: "ok", metrics: withShares({ ...NONE_MEASURED, counted: 4, sameDay: 2, byNextDay: 3 }) },
      isPlaceholderData: true,
    };
    // The previous-period query holds data of its own (another key's).
    previousState = { data: { status: "ok", metrics: before } };
    renderPage();
    expect(lastOptions("previous").enabled).toBe(false);
    expect(screen.queryByText(/pts/)).not.toBeInTheDocument();
    expect(screen.queryByText(/compared with/)).not.toBeInTheDocument();
  });

  it("waits for the picked range before asking for the previous period", () => {
    renderPage();
    expect(lastOptions("previous").enabled).toBe(false);
  });
});

const AGENT: AgentMetrics = {
  from: "2026-07-20T00:00:00.000Z",
  to: "2026-10-14T12:00:00.000Z",
  turns: 34,
  turnsUnrecorded: 1,
  conversations: 14,
  newConversations: 12,
  users: 5,
  totalCostUsd: 7.51,
  costPerTurnUsd: 0.2208,
  costPerTurnP95Usd: 0.52,
  costPerConversationUsd: 0.536,
  latencyMedianMs: 26513,
  latencyP95Ms: 45000,
  totalInputTokens: 3194000,
  totalOutputTokens: 112000,
  inputTokensPerTurn: 93955,
  outputTokensPerTurn: 3291,
  toolCallsPerTurn: 3.4,
  turnsWithoutTools: 3,
  turnsWithManyToolCalls: 4,
  budgetLimitUsd: 2,
  budgetHits: 0,
  byModel: [{ model: "anthropic/claude-sonnet-5-5", turns: 34, costUsd: 7.51, inputTokens: 3194000, outputTokens: 112000 }],
  byTool: [
    { tool: "clear_list_events", calls: 30, turns: 22 },
    { tool: "clear_find_location", calls: 25, turns: 9 },
  ],
  byPage: [
    { page: "/dashboard", turns: 14 },
    { page: "unknown", turns: 2 },
  ],
  weekly: [
    {
      isoWeek: "2026-W41",
      weekStart: "2026-10-05T00:00:00.000Z",
      isPartial: false,
      turns: 10,
      conversations: 4,
      users: 3,
      costUsd: 2.29,
      costPerTurnUsd: 0.229,
      latencyMedianMs: 25000,
      inputTokensPerTurn: 90000,
      toolCallsPerTurn: 3.1,
      models: ["anthropic/claude-sonnet-5-5"],
    },
    {
      isoWeek: "2026-W42",
      weekStart: "2026-10-12T00:00:00.000Z",
      isPartial: true,
      turns: 4,
      conversations: 2,
      users: 2,
      costUsd: 0.5,
      costPerTurnUsd: 0.125,
      latencyMedianMs: 12000,
      inputTokensPerTurn: 40000,
      toolCallsPerTurn: 2,
      models: ["anthropic/claude-haiku-5-5"],
    },
  ],
};

describe("MetricsPage, CLEAR Agent section", () => {
  it("asks for the Agent metrics with the dates only, never the country", async () => {
    queryState = { data: { status: "ok", metrics: withShares(NONE_MEASURED) } };
    agentState = { data: { status: "ok", metrics: AGENT } };
    renderPage();
    expect(useAgentQuery.mock.calls.at(-1)![0]).toEqual({});
    fireEvent.change(screen.getByLabelText("From"), { target: { value: "2026-01-05" } });
    fireEvent.click(screen.getByRole("textbox", { name: "Country" }));
    fireEvent.click(await screen.findByRole("option", { name: "Sudan" }));
    expect(useAgentQuery.mock.calls.at(-1)![0]).toEqual({ from: "2026-01-05T00:00:00.000Z" });
    expect(lastInput("main")).toEqual({ from: "2026-01-05T00:00:00.000Z", locationId: "loc-sdn" });
  });

  it("shows the tiles, the three weekly charts, the breakdowns and the model change", () => {
    queryState = { data: { status: "ok", metrics: withShares(NONE_MEASURED) } };
    agentState = { data: { status: "ok", metrics: AGENT } };
    renderPage();
    expect(screen.getByRole("heading", { name: "CLEAR Agent" })).toBeInTheDocument();
    expect(screen.getByText("Cost per turn")).toBeInTheDocument();
    expect(screen.getByText("$0.221")).toBeInTheDocument();
    expect(screen.getByText("Median latency")).toBeInTheDocument();
    expect(screen.getByText("26.5 sec")).toBeInTheDocument();
    expect(screen.getByText("14 conversations · 5 users")).toBeInTheDocument();
    expect(screen.getByText("Cost per turn by week")).toBeInTheDocument();
    expect(screen.getByText("Latency by week")).toBeInTheDocument();
    expect(screen.getByText("Input tokens by week")).toBeInTheDocument();
    // W42 switched to Haiku: every chart carries the legend entry.
    expect(screen.getAllByText("model changed")).toHaveLength(3);
    expect(screen.getByText("What the Agent is used for")).toBeInTheDocument();
    expect(screen.getByText("clear_find_location")).toBeInTheDocument();
    expect(
      screen.getByText("Budget $2.00 per user per day · no user-day reached it. 1 answer has no usage record and is not counted."),
    ).toBeInTheDocument();
  });

  it("loads the recent questions only when asked, and lists them without a user", () => {
    queryState = { data: { status: "ok", metrics: withShares(NONE_MEASURED) } };
    agentState = { data: { status: "ok", metrics: AGENT } };
    questionsState = {
      data: {
        status: "ok",
        from: AGENT.from,
        to: AGENT.to,
        questions: [{ askedAt: "2026-10-06T09:00:00.000Z", question: "What's new in the last 24 hours?", page: "/dashboard" }],
      },
    };
    renderPage();
    expect(useQuestionsQuery.mock.calls.at(-1)![1]).toMatchObject({ enabled: false });
    expect(screen.queryByText("What's new in the last 24 hours?")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Show the last 20" }));
    expect(useQuestionsQuery.mock.calls.at(-1)![0]).toEqual({ first: 20 });
    expect(useQuestionsQuery.mock.calls.at(-1)![1]).toMatchObject({ enabled: true });
    expect(screen.getByText("What's new in the last 24 hours?")).toBeInTheDocument();
  });

  it("asks again after a date change before reading questions for the new range", () => {
    queryState = { data: { status: "ok", metrics: withShares(NONE_MEASURED) } };
    agentState = { data: { status: "ok", metrics: AGENT } };
    questionsState = {
      data: {
        status: "ok",
        from: AGENT.from,
        to: AGENT.to,
        questions: [{ askedAt: "2026-10-06T09:00:00.000Z", question: "What's new in the last 24 hours?", page: "/dashboard" }],
      },
    };
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: "Show the last 20" }));
    expect(screen.getByText("What's new in the last 24 hours?")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("From"), { target: { value: "2026-01-05" } });
    expect(useQuestionsQuery.mock.calls.at(-1)![0]).toEqual({ from: "2026-01-05T00:00:00.000Z", first: 20 });
    expect(useQuestionsQuery.mock.calls.at(-1)![1]).toMatchObject({ enabled: false });
    expect(screen.queryByText("What's new in the last 24 hours?")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Show the last 20" })).toBeEnabled();
  });

  it("lets the admin retry a failed questions read", () => {
    queryState = { data: { status: "ok", metrics: withShares(NONE_MEASURED) } };
    agentState = { data: { status: "ok", metrics: AGENT } };
    questionsState = { error: { message: "clear-api timed out" } };
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: "Show the last 20" }));
    expect(screen.getByText("clear-api timed out")).toBeInTheDocument();
    const button = screen.getByRole("button", { name: "Show the last 20" });
    expect(button).toBeEnabled();
    fireEvent.click(button);
    expect(refetchQuestions).toHaveBeenCalledTimes(1);
  });

  it("shows the Agent's own range refusal when the filters are not showing one", () => {
    queryState = { error: { message: "Network error" } };
    agentState = { error: { message: "The range can span at most 364 days", data: { code: "BAD_REQUEST" } } };
    renderPage();
    expect(screen.getByRole("heading", { name: "CLEAR Agent" })).toBeInTheDocument();
    expect(screen.getByText("The range can span at most 364 days")).toBeInTheDocument();
  });

  it("with no turns, says so and still explains the method", () => {
    queryState = { data: { status: "ok", metrics: withShares(NONE_MEASURED) } };
    agentState = { data: { status: "ok", metrics: { ...AGENT, turns: 0, turnsUnrecorded: 0, weekly: [] } } };
    renderPage();
    expect(screen.getByText("No Agent turns in this range")).toBeInTheDocument();
    expect(screen.queryByText("Cost per turn by week")).not.toBeInTheDocument();
    expect(screen.getAllByText("How this is measured")).toHaveLength(2);
  });

  it("says the Agent metrics API is not deployed yet, apart from the detection metrics", () => {
    queryState = { data: { status: "ok", metrics: withShares(NONE_MEASURED) } };
    agentState = { data: { status: "unavailable" } };
    renderPage();
    expect(screen.getByText("Agent metrics API not deployed yet")).toBeInTheDocument();
    expect(screen.queryByText("Metrics API not deployed yet")).not.toBeInTheDocument();
  });

  it("hides the Agent section while the dates are refused, since the filters show the error", () => {
    queryState = { error: { message: "The range can span at most 364 days", data: { code: "BAD_REQUEST" } } };
    renderPage();
    expect(screen.queryByRole("heading", { name: "CLEAR Agent" })).not.toBeInTheDocument();
    expect(useAgentQuery).not.toHaveBeenCalled();
  });

});
