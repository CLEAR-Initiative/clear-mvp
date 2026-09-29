import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import type { Analysis } from "~/server/api/mappers/analysis";
import type { CreatedAnalysis } from "~/server/api/routers/analysis";

vi.mock("next-intl", () => ({
  useTranslations: (ns?: string) => (key: string, vars?: Record<string, unknown>) =>
    `${ns ? `${ns}.` : ""}${key}${vars ? `:${JSON.stringify(vars)}` : ""}`,
  useFormatter: () => ({
    dateTime: (d: Date) => d.toISOString().slice(0, 10),
    relativeTime: () => "2 days ago",
    number: (n: number) => `${Math.round(n * 100)}%`,
  }),
  useNow: () => new Date("2026-09-29T12:00:00Z"),
  useLocale: () => "en",
}));
let role = "analyst";
let activeTeamId: string | null = "team-1";
vi.mock("~/providers/team-provider", () => ({ useTeam: () => ({ activeTeamId }) }));
vi.mock("next/dynamic", () => ({ default: () => () => <div data-testid="crisis-map" /> }));
vi.mock("~/components/map/minimap-card", () => ({ MinimapCard: () => <div data-testid="minimap" /> }));
const notify = vi.fn();
vi.mock("@mantine/notifications", () => ({ notifications: { show: (o: unknown) => notify(o) } }));

let analysisResult: { data: Analysis | null | undefined; isLoading: boolean; isError: boolean };
const currentQuery = vi.fn();
const frameQuery = vi.fn();
const refreshMutate = vi.fn();
let refreshOpts: { onSuccess?: () => void; onError?: () => void } = {};
const invalidateScopes = vi.fn();
const utils = {
  locations: { getById: { fetch: async () => ({ geometry: null }) } },
  analysis: { scopes: { invalidate: invalidateScopes } },
};
vi.mock("~/trpc/react", () => ({
  api: {
    useUtils: () => utils,
    auth: { me: { useQuery: () => ({ data: { user: { role } } }) } },
    analysis: {
      current: {
        useQuery: (input: unknown, opts: { enabled?: boolean }) => (
          currentQuery(input, opts), opts.enabled ? analysisResult : { data: undefined, isLoading: false, isError: false }
        ),
      },
      forFrame: {
        useQuery: (input: unknown, opts: { enabled?: boolean }) => (
          frameQuery(input, opts), opts.enabled ? analysisResult : { data: undefined, isLoading: false, isError: false }
        ),
      },
      events: { useQuery: () => ({ data: { totalCount: 0, items: [] } }) },
      figures: { useQuery: () => ({ data: undefined }) },
      refresh: {
        useMutation: (opts: typeof refreshOpts) => {
          refreshOpts = opts;
          return { mutate: refreshMutate, isPending: false };
        },
      },
    },
    locations: { getById: { useQuery: () => ({ data: { geometry: null } }) } },
  },
}));
vi.mock("@react-pdf/renderer", () => ({ pdf: () => ({ toBlob: async () => new Blob([]) }) }));
vi.mock("./report/report-document", () => ({ ReportDocument: () => null }));

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
vi.stubGlobal("ResizeObserver", ResizeObserverStub);

const { AnalysisDetail } = await import("./analysis-detail");
type Scope = Parameters<typeof AnalysisDetail>[0]["scope"];

function analysis(overrides: Partial<Analysis["crisis"]> = {}, scope: Partial<Analysis["scope"]> = {}): Analysis {
  return {
    id: "a1",
    scope: { locationIds: ["sdn"], name: "Sudan", windowStart: "2026-01-01T00:00:00Z", windowEnd: "2026-12-31T23:59:59Z", ...scope },
    crisis: {
      country: "Sudan",
      year: "2026",
      generatedAt: "2026-09-27T06:00:00Z",
      generatedByModel: "claude-sonnet-4-6",
      schemaVersion: "v4",
      reportCount: 1,
      qualityScore: 0.7,
      freshestSourceAt: null,
      ...overrides,
    },
    summary: "Summary.",
    summaryRefs: [],
    summaryLineRefs: {},
    stats: [],
    figures: { displaced: null, affected: null, inNeed: null, returnees: null, fundingRequired: null, fundingReceived: null },
    contextRisks: [],
    hazards: { hazards: [], vulnerabilities: [] },
    displacement: { push: [], return: [] },
    sectors: [],
    sources: [],
    changes: { comparedTo: null, notes: {} },
    scenarios: { description: null, mostLikely: null, bestCase: null, worstCase: null, refs: [] },
    eventSourceIds: [],
    keyFindings: [],
  };
}

const created = (overrides: Partial<CreatedAnalysis> = {}): CreatedAnalysis => ({
  id: "auto-1",
  name: "Sheikan, North Kordofan, Sudan",
  locationIds: ["sheikan"],
  eventTypes: ["conflict"],
  needSectors: ["health"],
  countryId: "sdn",
  windowStart: "2026-07-01T00:00:00.000Z",
  cadence: "weekly",
  enabled: true,
  createdAt: "2026-09-28T00:00:00.000Z",
  analysisId: "a2",
  generatedAt: "2026-09-28T08:00:00.000Z",
  ...overrides,
});

const COUNTRY: Scope = { kind: "country", countryId: "sdn", countryName: "Sudan" };
const createdScope = (c: CreatedAnalysis): Scope => ({ kind: "created", countryId: "sdn", countryName: "Sudan", created: c });
const renderDetail = (scope: Scope) =>
  render(
    <MantineProvider>
      <AnalysisDetail scope={scope} onBack={() => {}} />
    </MantineProvider>,
  );

beforeEach(() => {
  role = "analyst";
  activeTeamId = "team-1";
  analysisResult = { data: analysis(), isLoading: false, isError: false };
  refreshOpts = {};
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("AnalysisDetail header", () => {
  it("states the end date of a frame that has closed", () => {
    analysisResult.data = analysis({}, { windowStart: "2025-01-01T00:00:00Z", windowEnd: "2025-12-31T23:59:59Z" });
    renderDetail(COUNTRY);
    expect(screen.getByTestId("analysis-meta")).toHaveTextContent('analysis.meta.period:{"start":"2025-01-01","end":"2025-12-31"}');
  });

  it("shows the period the analysis covers", () => {
    renderDetail(COUNTRY);
    expect(screen.getByTestId("analysis-meta")).toHaveTextContent('analysis.meta.covers:{"start":"2026-01-01"}');
  });

  it("flags an old version as out of date and a fresh one not", () => {
    analysisResult.data = analysis({ generatedAt: "2026-09-10T00:00:00Z" });
    renderDetail(COUNTRY);
    expect(screen.getByTestId("analysis-stale")).toHaveTextContent("analysis.meta.stale");
    cleanup();
    analysisResult.data = analysis();
    renderDetail(COUNTRY);
    expect(screen.queryByTestId("analysis-stale")).not.toBeInTheDocument();
  });

  it("flags a created analysis by its own cadence, and never one that updates on request", () => {
    analysisResult.data = analysis({ generatedAt: "2026-09-26T00:00:00Z" });
    renderDetail(createdScope(created({ cadence: "daily" })));
    expect(screen.getByTestId("analysis-stale")).toBeInTheDocument();
    cleanup();
    analysisResult.data = analysis({ generatedAt: "2026-01-01T00:00:00Z" });
    renderDetail(createdScope(created({ enabled: false })));
    expect(screen.queryByTestId("analysis-stale")).not.toBeInTheDocument();
  });

  it("hides Update now from viewers", () => {
    role = "viewer";
    renderDetail(COUNTRY);
    expect(screen.queryByTestId("analysis-refresh")).not.toBeInTheDocument();
    expect(screen.getByTestId("analysis-create-report")).toBeInTheDocument();
  });

  it("requests a new version of the country frame", () => {
    renderDetail(COUNTRY);
    fireEvent.click(screen.getByTestId("analysis-refresh"));
    expect(refreshMutate).toHaveBeenCalledWith({
      locationIds: ["sdn"],
      eventTypes: [],
      needSectors: [],
      windowStart: "2026-01-01T00:00:00Z",
      windowEnd: "2026-12-31T23:59:59Z",
      teamId: null,
    });
  });

  it("requests a new version of a created frame, then polls with a notice until it lands", () => {
    const scope = createdScope(created());
    analysisResult.data = analysis({}, { locationIds: ["sheikan"], windowStart: "2026-07-01T00:00:00.000Z", windowEnd: null });
    const view = renderDetail(scope);
    fireEvent.click(screen.getByTestId("analysis-refresh"));
    expect(refreshMutate).toHaveBeenCalledWith({
      locationIds: ["sheikan"],
      eventTypes: ["conflict"],
      needSectors: ["health"],
      windowStart: "2026-07-01T00:00:00.000Z",
      windowEnd: null,
      teamId: "team-1",
    });
    expect(screen.queryByTestId("analysis-refresh-requested")).not.toBeInTheDocument();

    React.act(() => refreshOpts.onSuccess?.());
    expect(screen.getByTestId("analysis-refresh-requested")).toHaveTextContent("analysis.refresh.requested");
    expect(screen.getByTestId("analysis-refresh")).toBeDisabled();
    const interval = (frameQuery.mock.lastCall![1] as { refetchInterval: (q: unknown) => number | false }).refetchInterval;
    expect(interval({ state: { data: analysisResult.data } })).toBe(30_000);

    // The new version lands: the notice clears and polling stops.
    const newer = analysis({ generatedAt: "2026-09-29T11:00:00Z" });
    analysisResult.data = newer;
    view.rerender(
      <MantineProvider>
        <AnalysisDetail scope={scope} onBack={() => {}} />
      </MantineProvider>,
    );
    expect(screen.queryByTestId("analysis-refresh-requested")).not.toBeInTheDocument();
    expect(screen.getByTestId("analysis-refresh")).toBeEnabled();
    const after = (frameQuery.mock.lastCall![1] as { refetchInterval: (q: unknown) => number | false }).refetchInterval;
    expect(after({ state: { data: newer } })).toBe(false);
    // The landing list is refreshed so its status matches.
    expect(invalidateScopes).toHaveBeenCalledTimes(1);
  });

  it("stops waiting for a requested version that never lands", () => {
    const scope = createdScope(created());
    analysisResult.data = analysis({}, { locationIds: ["sheikan"], windowStart: "2026-07-01T00:00:00.000Z", windowEnd: null });
    const start = Date.now();
    const clock = vi.spyOn(Date, "now").mockReturnValue(start);
    const view = renderDetail(scope);
    fireEvent.click(screen.getByTestId("analysis-refresh"));
    React.act(() => refreshOpts.onSuccess?.());
    expect(screen.getByTestId("analysis-refresh")).toBeDisabled();

    clock.mockReturnValue(start + 16 * 60_000);
    view.rerender(
      <MantineProvider>
        <AnalysisDetail scope={scope} onBack={() => {}} />
      </MantineProvider>,
    );
    expect(screen.queryByTestId("analysis-refresh-requested")).not.toBeInTheDocument();
    expect(screen.getByTestId("analysis-refresh")).toBeEnabled();
    const interval = (frameQuery.mock.lastCall![1] as { refetchInterval: (q: unknown) => number | false }).refetchInterval;
    expect(interval({ state: { data: analysisResult.data } })).toBe(false);
    expect(invalidateScopes).not.toHaveBeenCalled();
    clock.mockRestore();
  });

  it("reports a failed request", () => {
    renderDetail(COUNTRY);
    fireEvent.click(screen.getByTestId("analysis-refresh"));
    React.act(() => refreshOpts.onError?.());
    expect(notify).toHaveBeenCalledWith(expect.objectContaining({ color: "red", message: "analysis.refresh.error" }));
    expect(screen.queryByTestId("analysis-refresh-requested")).not.toBeInTheDocument();
  });
});
