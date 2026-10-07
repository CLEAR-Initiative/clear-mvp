import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import type { GqlCaseProposal, GqlImpactPrior, GqlTask } from "~/lib/types/graphql";

/**
 * The read-only Enrichment section (clear-api ADR-0010, V1): hidden behind the
 * flag, the empty state, a Task row with its status and (when the server let
 * us see it) its error, and a proposed ImpactPrior with its cited cases.
 */

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string, vars?: Record<string, unknown>) =>
    vars ? `${key}:${JSON.stringify(vars)}` : key,
  useFormatter: () => ({ dateTime: () => "10 Aug 2021", relativeTime: () => "2 hours ago", number: (n: number) => n.toLocaleString("en") }),
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
const invalidate = vi.fn(async () => undefined);
vi.mock("~/trpc/react", () => ({
  api: {
    useUtils: () => ({
      tasks: {
        proposedImpactPriors: { invalidate },
        proposedCaseProposals: { invalidate },
        reviewCount: { invalidate },
        forEvent: { invalidate },
      },
    }),
    auth: { me: { useQuery: () => ({ data: { user: { id: "u", role } } }) } },
    tasks: {
      forEvent: { useQuery: (...args: unknown[]) => useQuery(...args) },
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
  });

  it("shows a load error instead of the empty state when the query fails", () => {
    queryError = new Error("FORBIDDEN");
    renderSection();
    expect(screen.getByTestId("enrichment-load-error")).toBeTruthy();
    expect(screen.queryByText("empty")).toBeNull();
  });

  it("links only http(s) sources and encodes the prior Event id", () => {
    data = {
      tasks: [],
      impactPriors: [{
        ...PRIOR,
        basis: [
          { tier: "web", sourceUrl: "javascript:alert(1)", scope: "country", quote: "x" },
          { tier: "clear", eventId: "evt/../admin?x", scope: "country", quote: "y" },
        ],
      }],
    };
    renderSection();
    expect(screen.getByTestId("enrichment-unsafe-source").textContent).toContain("javascript:alert(1)");
    expect(screen.queryByRole("link", { name: "source" })).toBeNull();
    const priorLink = screen.getByText("priorEvent") as HTMLAnchorElement;
    expect(priorLink.getAttribute("href")).toBe(`/event/${encodeURIComponent("evt/../admin?x")}`);
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

  it("renders a proposed ImpactPrior with its state, counts and cited cases", () => {
    data = { tasks: [{ ...TASK, status: "COMPLETED", lastError: null, outcome: "produced" }], impactPriors: [PRIOR] };
    renderSection();
    const prior = screen.getByTestId("enrichment-prior");
    expect(prior.getAttribute("data-state")).toBe("proposed");
    expect(screen.getByText("prior.proposed")).toBeTruthy();
    expect(screen.getByText(/cases:\{"count":2\}/)).toBeTruthy();
    expect(screen.getAllByTestId("enrichment-case")).toHaveLength(2);
    expect(screen.getByText("“The Nile burst its banks.”")).toBeTruthy();
    const source = screen.getByText("source") as HTMLAnchorElement;
    expect(source.getAttribute("href")).toBe("https://example.test/floods-2019");
    expect((screen.getByText("priorEvent") as HTMLAnchorElement).getAttribute("href")).toBe("/event/evt-2021");
    expect(screen.getByText("outcome.produced")).toBeTruthy();
  });

  describe("several Workers propose on one Event (V3)", () => {
    const WEB_PRIOR: GqlImpactPrior = { ...PRIOR, id: "ip-web", taskId: "task-web", sourceKind: "event.impact_prior.web" };

    it("groups proposals by source — CLEAR data first, then the web, then anything else by its raw kind", () => {
      // Decided web and bare-kind priors are history (V4): still shown.
      const LEGACY: GqlImpactPrior = { ...PRIOR, id: "ip-old", sourceKind: "event.impact_prior", state: "accepted" };
      data = { tasks: [], impactPriors: [{ ...WEB_PRIOR, state: "accepted" }, LEGACY, PRIOR] };
      renderSection();
      const groups = screen.getAllByTestId("enrichment-group");
      expect(groups.map((g) => g.getAttribute("data-source-kind"))).toEqual([
        "event.impact_prior.clear",
        "event.impact_prior.web",
        "event.impact_prior",
      ]);
      const titles = screen.getAllByTestId("enrichment-group-title").map((t) => t.textContent);
      expect(titles[0]).toBe('group:{"source":"sourceKind.clear","count":1}');
      expect(titles[1]).toBe('group:{"source":"sourceKind.web","count":1}');
      expect(titles[2]).toBe('group:{"source":"sourceKind.legacy","count":1}');
      // Each card carries its source, so the Inbox's shared card reads the same way.
      const priors = screen.getAllByTestId("enrichment-prior");
      expect(priors.map((p) => p.getAttribute("data-source-kind"))).toEqual([
        "event.impact_prior.clear",
        "event.impact_prior.web",
        "event.impact_prior",
      ]);
      expect(screen.getAllByTestId("enrichment-prior-source").map((b) => b.textContent)).toEqual([
        "sourceKind.clear",
        "sourceKind.web",
        "sourceKind.legacy",
      ]);
    });

    it("never offers a whole-prior decision for the web (V4): a proposed web prior is left out, its cases decide", () => {
      role = "analyst";
      flags = { impact_prior_review: true };
      data = { tasks: [], impactPriors: [WEB_PRIOR, PRIOR], caseProposals: [CASE] };
      renderSection();
      // Only the CLEAR-data prior is a whole-prior decision.
      expect(screen.getAllByTestId("enrichment-prior").map((p) => p.getAttribute("data-source-kind"))).toEqual([
        "event.impact_prior.clear",
      ]);
      expect(screen.getAllByTestId("impact-prior-decision")).toHaveLength(1);
      expect(screen.getAllByTestId("case-proposal-decision")).toHaveLength(1);
    });

    it("keeps a decided web prior read-only, even for a decider", () => {
      role = "analyst";
      flags = { impact_prior_review: true };
      data = { tasks: [], impactPriors: [{ ...WEB_PRIOR, state: "rejected", decisionRationale: "Old basis" }] };
      renderSection();
      expect(screen.getByTestId("enrichment-prior")).toHaveAttribute("data-state", "rejected");
      expect(screen.queryByTestId("impact-prior-decision")).toBeNull();
    });

    it("names the Worker that held a Task, and the one that produced a proposal, when the server returned them", () => {
      data = {
        tasks: [{ ...TASK, status: "COMPLETED", lastError: null, outcome: "produced", leaseOwner: { id: "w", name: "CLEAR Worker (Dagster)" } }],
        impactPriors: [{ ...PRIOR, task: { leaseOwner: { id: "w", name: "CLEAR Worker (Dagster)" } } }],
      };
      renderSection();
      expect(screen.getAllByText(/worker:\{"name":"CLEAR Worker \(Dagster\)"\}/)).toHaveLength(2);
    });
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

  describe("as the second door to the decision (V2)", () => {
    it("mounts the decision pane on a proposed prior for a decider with impact_prior_review on", () => {
      role = "analyst";
      flags = { impact_prior_review: true };
      data = { tasks: [], impactPriors: [PRIOR, { ...PRIOR, id: "ip-0", state: "accepted" }] };
      decideMutate.mockImplementation((_input, opts) => opts.onSuccess({ ...PRIOR, state: "accepted" }));
      renderSection();
      expect(screen.getAllByTestId("enrichment-prior")).toHaveLength(2);
      // Only the proposed one is decidable.
      expect(screen.getAllByTestId("impact-prior-decision")).toHaveLength(1);
      fireEvent.change(screen.getByTestId("impact-prior-rationale"), { target: { value: "Same basin, same season" } });
      fireEvent.click(screen.getByTestId("impact-prior-accept"));
      expect(decideMutate).toHaveBeenCalledWith(
        { id: "ip-1", decision: "accepted", rationale: "Same basin, same season" },
        expect.any(Object),
      );
      expect(showNotification).toHaveBeenCalledWith({ message: "toast.accepted" });
    });

    it.each([
      ["a viewer", "viewer", true],
      ["an analyst while impact_prior_review is off", "analyst", false],
    ])("keeps the prior read-only for %s", (_label, who, review) => {
      role = who;
      flags = { impact_prior_review: review };
      data = { tasks: [], impactPriors: [PRIOR] };
      renderSection();
      expect(screen.getByTestId("enrichment-prior")).toBeTruthy();
      expect(screen.queryByTestId("impact-prior-decision")).toBeNull();
    });
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
});
