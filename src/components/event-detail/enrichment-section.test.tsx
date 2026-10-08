import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import type { GqlCaseProposal, GqlComputedImpactPrior, GqlImpactPrior, GqlTask } from "~/lib/types/graphql";

/**
 * The Enrichment section (clear-api ADR-0010): hidden behind the flag, the
 * empty state, a Task row with its status and (when the server let us see
 * it) its error, the web cases each with its own decision, and the priors
 * computed from history. Whole-prior proposals are not shown (V4).
 */

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string, vars?: Record<string, unknown>) =>
    vars ? `${key}:${JSON.stringify(vars)}` : key,
  useFormatter: () => ({ dateTime: () => "10 Aug 2021", relativeTime: () => "2 hours ago", number: (n: number, o?: Intl.NumberFormatOptions) => n.toLocaleString("en", o) }),
}));

/** `event_enrichment`; `flags` overrides per key (impact_prior_review). */
let flagEnabled = true;
let flags: Record<string, boolean> = {};
vi.mock("~/components/feature-flags-provider", () => ({
  useFeatureEnabled: (key: string) => flags[key] ?? flagEnabled,
}));
const showNotification = vi.fn();
vi.mock("@mantine/notifications", () => ({ notifications: { show: (n: unknown) => showNotification(n) } }));

let role = "viewer";
let data: { tasks: GqlTask[]; impactPriors: GqlImpactPrior[]; caseProposals?: GqlCaseProposal[] } = { tasks: [], impactPriors: [] };
let queryError: Error | null = null;
const useQuery = vi.fn((..._args: unknown[]) => ({ data: queryError ? undefined : data, isFetching: false, isError: !!queryError, error: queryError }));
const decideMutate = vi.fn();
const decideCaseMutate = vi.fn();
let computed: GqlComputedImpactPrior[] = [];
const computedQuery = vi.fn((_input: unknown, opts: { enabled: boolean }) => ({ data: opts.enabled ? computed : undefined }));
const invalidate = vi.fn(async () => undefined);
vi.mock("~/trpc/react", () => ({
  api: {
    useUtils: () => ({
      tasks: {
        proposedImpactPriors: { invalidate },
        proposedCaseProposals: { invalidate },
        reviewCount: { invalidate },
        forEvent: { invalidate },
        computedPriors: { invalidate },
      },
    }),
    auth: { me: { useQuery: () => ({ data: { user: { id: "u", role } } }) } },
    tasks: {
      forEvent: { useQuery: (...args: unknown[]) => useQuery(...args) },
      computedPriors: { useQuery: (input: unknown, opts: { enabled: boolean }) => computedQuery(input, opts) },
      decideImpactPrior: {
        useMutation: () => ({ mutate: decideMutate, isPending: false, isError: false, error: null, variables: undefined }),
      },
      decideCaseProposal: {
        useMutation: () => ({ mutate: decideCaseMutate, isPending: false, isError: false, error: null, variables: undefined }),
      },
    },
  },
}));

const { EnrichmentSection } = await import("./enrichment-section");

const TASK: GqlTask = {
  id: "task-1",
  kind: "event.impact_prior.clear",
  requestId: "req-1",
  subjectType: "event",
  subjectId: "evt-1",
  status: "FAILED",
  origin: "user",
  requesterId: "u",
  requester: { id: "u", name: "Ana" },
  leaseOwner: null,
  teamId: null,
  attempts: 3,
  maxAttempts: 3,
  lastError: "model timed out",
  cancelRequestedAt: null,
  outcome: null,
  model: null,
  costUsd: null,
  completedAt: null,
  createdAt: "2026-10-06T10:00:00.000Z",
  updatedAt: "2026-10-06T10:00:00.000Z",
};

const PRIOR: GqlImpactPrior = {
  id: "ip-1",
  eventId: "evt-1",
  taskId: "task-0",
  sourceKind: "event.impact_prior.clear",
  state: "proposed",
  hazardType: "FL",
  countryLocationId: "sdn",
  geographicScope: "district",
  horizonYears: 10,
  populationGroup: null,
  metric: null,
  lowerBound: null,
  upperBound: null,
  numberOfCases: 2,
  basis: [
    { tier: "clear", eventId: "evt-2021", occurredAt: "2021-08-10", scope: "district", quote: "The Nile burst its banks." },
    { tier: "web", sourceUrl: "https://example.test/floods-2019", scope: "country", quote: "Floods displaced thousands." },
  ],
  methodVersion: "clear-impact-prior@0.1.0",
  supersedesId: null,
  decidedById: null,
  decidedAt: null,
  decisionRationale: null,
  createdAt: "2026-10-06T11:00:00.000Z",
};

const CASE: GqlCaseProposal = {
  id: "cp-1",
  eventId: "evt-1",
  taskId: "task-web",
  state: "proposed",
  sourceUrl: "https://example.test/floods-2019",
  quote: "Floods displaced 12,000 households.",
  occurredAt: "2019-08-10T00:00:00.000Z",
  locationLabel: "Khartoum",
  locationId: null,
  hazardType: "fl",
  geographicScope: "country",
  figures: [{ metric: "households_affected", value: 12000 }],
  matchedEventId: null,
  methodVersion: "web-cases@1",
  decidedById: null,
  decidedAt: null,
  decisionRationale: null,
  resultSignalId: null,
  resultEventId: null,
  createdAt: "2026-10-06T12:00:00.000Z",
};

function renderSection() {
  return render(
    <MantineProvider>
      <EnrichmentSection eventId="evt-1" />
    </MantineProvider>,
  );
}

describe("EnrichmentSection", () => {
  afterEach(() => {
    cleanup();
    flagEnabled = true;
    flags = {};
    role = "viewer";
    data = { tasks: [], impactPriors: [] };
    queryError = null;
    useQuery.mockClear();
    decideMutate.mockReset();
    decideCaseMutate.mockReset();
    showNotification.mockClear();
    computed = [];
    computedQuery.mockClear();
  });

  it("shows a load error instead of the empty state when the query fails", () => {
    queryError = new Error("FORBIDDEN");
    renderSection();
    expect(screen.getByTestId("enrichment-load-error")).toBeTruthy();
    expect(screen.queryByText("empty")).toBeNull();
  });

  it("renders nothing while the event_enrichment flag is off, and does not query", () => {
    flagEnabled = false;
    renderSection();
    expect(screen.queryByTestId("enrichment-section")).toBeNull();
    expect(useQuery).toHaveBeenCalledWith({ eventId: "evt-1" }, expect.objectContaining({ enabled: false }));
  });

  it("shows the empty state when nothing was requested", () => {
    renderSection();
    expect(screen.getByTestId("enrichment-section")).toBeTruthy();
    expect(screen.getByText("empty")).toBeTruthy();
  });

  it("lists a Task with its kind, status, requester and the error the server returned", () => {
    data = { tasks: [TASK], impactPriors: [] };
    renderSection();
    const row = screen.getByTestId("enrichment-task");
    expect(row.getAttribute("data-status")).toBe("FAILED");
    expect(row.getAttribute("data-kind")).toBe("event.impact_prior.clear");
    // One row per kind: the family name and the source it came from.
    expect(screen.getByText("kinds.impactPrior · sourceKind.clear")).toBeTruthy();
    expect(screen.getByText("status.FAILED")).toBeTruthy();
    expect(screen.getByText(/requestedBy:.*Ana/)).toBeTruthy();
    expect(screen.getByTestId("enrichment-task-error").textContent).toContain("model timed out");
  });

  it("omits the error line when the server redacted it", () => {
    data = { tasks: [{ ...TASK, lastError: null }], impactPriors: [] };
    renderSection();
    expect(screen.queryByTestId("enrichment-task-error")).toBeNull();
  });

  it("calls the web Worker's request a web search", () => {
    data = { tasks: [{ ...TASK, kind: "event.impact_prior.web", lastError: null }], impactPriors: [] };
    renderSection();
    expect(screen.getByText("webSearch")).toBeTruthy();
  });

  it("names the Worker that held a Task when the server returned it", () => {
    data = {
      tasks: [{ ...TASK, status: "COMPLETED", lastError: null, outcome: "produced", leaseOwner: { id: "w", name: "CLEAR Worker (Dagster)" } }],
      impactPriors: [],
    };
    renderSection();
    expect(screen.getByText(/worker:\{"name":"CLEAR Worker \(Dagster\)"\}/)).toBeTruthy();
    expect(screen.getByText("outcome.produced")).toBeTruthy();
  });

  it("shows no whole-prior proposals (V4), not even a proposed one to a decider: the prior is computed, the cases decide", () => {
    role = "analyst";
    flags = { impact_prior_review: true };
    data = {
      tasks: [],
      impactPriors: [PRIOR, { ...PRIOR, id: "ip-web", sourceKind: "event.impact_prior.web", state: "accepted" }],
      caseProposals: [CASE],
    };
    renderSection();
    expect(screen.queryByTestId("enrichment-prior")).toBeNull();
    expect(screen.queryByTestId("enrichment-group")).toBeNull();
    expect(screen.queryByTestId("impact-prior-decision")).toBeNull();
    expect(screen.getAllByTestId("case-proposal-decision")).toHaveLength(1);
  });

  it("shows the empty state when only whole priors came back", () => {
    data = { tasks: [], impactPriors: [PRIOR] };
    renderSection();
    expect(screen.getByText("empty")).toBeTruthy();
  });

  it("polls while a Task is open", () => {
    data = { tasks: [{ ...TASK, status: "LEASED", lastError: null }], impactPriors: [] };
    renderSection();
    const opts = useQuery.mock.calls[0]![1] as unknown as {
      refetchInterval: (q: { state: { data: typeof data } }) => number | false;
    };
    expect(opts.refetchInterval({ state: { data } })).toBe(30_000);
    expect(opts.refetchInterval({ state: { data: { tasks: [TASK], impactPriors: [] } } })).toBe(false);
  });

  describe("web cases, one decision each (V4)", () => {
    it("lists the Event's cases with their figures and source, each with its own Accept / Reject for a decider", () => {
      role = "analyst";
      flags = { impact_prior_review: true };
      data = { tasks: [], impactPriors: [], caseProposals: [CASE, { ...CASE, id: "cp-2", sourceUrl: "https://example.test/2" }] };
      decideCaseMutate.mockImplementation((_input, opts) => opts.onSuccess({ ...CASE, state: "accepted", resultEventId: "evt-h" }));
      renderSection();
      expect(screen.getByTestId("enrichment-cases-title")).toHaveTextContent('group:{"count":2}');
      expect(screen.getAllByTestId("case-proposal")).toHaveLength(2);
      expect(screen.getAllByTestId("case-proposal-figure")[0]).toHaveTextContent("metric.households_affected");
      fireEvent.click(screen.getAllByTestId("case-proposal-accept")[0]!);
      expect(decideCaseMutate).toHaveBeenCalledWith({ id: "cp-1", decision: "accepted", rationale: undefined }, expect.any(Object));
      expect(showNotification).toHaveBeenCalledWith({ message: "toast.accepted" });
    });

    it("shows the cases read-only to a viewer", () => {
      data = { tasks: [], impactPriors: [], caseProposals: [CASE] };
      renderSection();
      expect(screen.getByTestId("case-proposal")).toHaveAttribute("data-state", "proposed");
      expect(screen.queryByTestId("case-proposal-decision")).toBeNull();
      // Cases alone are not "nothing requested".
      expect(screen.queryByText("empty")).toBeNull();
    });
  });

  describe("ImpactPriors computed from CLEAR's history (V4)", () => {
    const COMPUTED: GqlComputedImpactPrior = {
      hazardType: "fl",
      countryLocationId: "sdn",
      horizonYears: 10,
      metric: "people_displaced_new",
      populationGroup: null,
      unit: null,
      centralValue: 12000,
      lowerBound: 3000,
      upperBound: 40000,
      numberOfCases: 4,
      lowConfidence: false,
      eventIds: ["evt-a", "evt-b", "evt-c", "evt-d"],
      estimateIds: ["e1", "e2", "e3", "e4"],
      methodVersion: "computed-prior@1",
    };

    it("shows each prior read-only: figure as people with its range, the case count beside it, and the past Events", () => {
      computed = [COMPUTED];
      renderSection();
      expect(computedQuery).toHaveBeenCalledWith({ eventId: "evt-1" }, expect.objectContaining({ enabled: true }));
      const row = screen.getByTestId("computed-prior");
      expect(row).toHaveTextContent("metric.people_displaced_new");
      expect(screen.getByTestId("computed-prior-figure")).toHaveTextContent('figurePeople:{"value":"12,000"}');
      expect(screen.getByTestId("computed-prior-figure")).toHaveTextContent('range:{"low":"3,000","high":"40,000"}');
      expect(screen.getByTestId("computed-prior-cases")).toHaveTextContent('fromEvents:{"count":4}');
      cleanup();
      // A median between two figures keeps its half.
      computed = [{ ...COMPUTED, centralValue: 1.5, lowerBound: 1, upperBound: 2 }];
      renderSection();
      expect(screen.getByTestId("computed-prior-figure")).toHaveTextContent('figurePeople:{"value":"1.5"}');
      cleanup();
      computed = [COMPUTED];
      renderSection();
      expect(screen.getAllByTestId("computed-prior-event").map((a) => a.getAttribute("href"))).toEqual([
        "/event/evt-a",
        "/event/evt-b",
        "/event/evt-c",
        "/event/evt-d",
      ]);
      expect(screen.queryByTestId("computed-prior-low-confidence")).toBeNull();
      // Nothing to decide on a computed prior.
      expect(screen.queryByTestId("impact-prior-decision")).toBeNull();
    });

    it("names the unit when there is one, the population group, and marks too few cases as low confidence", () => {
      computed = [
        {
          ...COMPUTED,
          metric: "households_affected",
          unit: "households",
          populationGroup: "IDPs",
          numberOfCases: 2,
          lowConfidence: true,
          lowerBound: 500,
          upperBound: 500,
          centralValue: 500,
          eventIds: Array.from({ length: 12 }, (_, i) => `evt-${i}`),
        },
      ];
      renderSection();
      expect(screen.getByTestId("computed-prior")).toHaveTextContent("metric.households_affected · IDPs");
      expect(screen.getByTestId("computed-prior-figure")).toHaveTextContent('figureUnit:{"value":"500","unit":"households"}');
      // One value is not a range.
      expect(screen.getByTestId("computed-prior-figure")).not.toHaveTextContent("range");
      expect(screen.getByTestId("computed-prior-low-confidence")).toHaveTextContent("lowConfidence");
      expect(screen.getAllByTestId("computed-prior-event")).toHaveLength(10);
      expect(screen.getByText('moreEvents:{"count":2}')).toBeTruthy();
    });

    it("shows nothing for history when there is none, and does not ask while the flag is off", () => {
      renderSection();
      expect(screen.queryByTestId("computed-priors")).toBeNull();
      cleanup();
      computedQuery.mockClear();
      flagEnabled = false;
      renderSection();
      expect(computedQuery).not.toHaveBeenCalled();
    });
  });
});
