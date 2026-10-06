import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import type { GqlImpactPrior, GqlTask } from "~/lib/types/graphql";

/**
 * The read-only Enrichment section (clear-api ADR-0010, V1): hidden behind the
 * flag, the empty state, a Task row with its status and (when the server let
 * us see it) its error, and a proposed ImpactPrior with its cited cases.
 */

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string, vars?: Record<string, unknown>) =>
    vars ? `${key}:${JSON.stringify(vars)}` : key,
  useFormatter: () => ({ dateTime: () => "10 Aug 2021", relativeTime: () => "2 hours ago" }),
}));

let flagEnabled = true;
vi.mock("~/components/feature-flags-provider", () => ({
  useFeatureEnabled: () => flagEnabled,
}));

let data: { tasks: GqlTask[]; impactPriors: GqlImpactPrior[] } = { tasks: [], impactPriors: [] };
let queryError: Error | null = null;
const useQuery = vi.fn((..._args: unknown[]) => ({ data: queryError ? undefined : data, isFetching: false, isError: !!queryError, error: queryError }));
vi.mock("~/trpc/react", () => ({
  api: { tasks: { forEvent: { useQuery: (...args: unknown[]) => useQuery(...args) } } },
}));

const { EnrichmentSection } = await import("./enrichment-section");

const TASK: GqlTask = {
  id: "task-1",
  kind: "event.impact_prior",
  subjectType: "event",
  subjectId: "evt-1",
  status: "FAILED",
  origin: "user",
  requesterId: "u",
  requester: { id: "u", name: "Ana" },
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
    data = { tasks: [], impactPriors: [] };
    queryError = null;
    useQuery.mockClear();
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
    expect(screen.getByText("kinds.impactPrior")).toBeTruthy();
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

  it("polls while a Task is open", () => {
    data = { tasks: [{ ...TASK, status: "LEASED", lastError: null }], impactPriors: [] };
    renderSection();
    const opts = useQuery.mock.calls[0]![1] as unknown as {
      refetchInterval: (q: { state: { data: typeof data } }) => number | false;
    };
    expect(opts.refetchInterval({ state: { data } })).toBe(30_000);
    expect(opts.refetchInterval({ state: { data: { tasks: [TASK], impactPriors: [] } } })).toBe(false);
  });
});
