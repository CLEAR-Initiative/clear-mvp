import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import type { GqlImpactPrior } from "~/lib/types/graphql";

/**
 * The shared decision pane (clear-api ADR-0010, V2): the evidence card plus
 * Accept / Reject with a required rationale, calling tasks.decideImpactPrior
 * and refetching both doors (the Inbox's Review items and the Event's
 * enrichment). Only a proposed prior is decidable; the server's answer is
 * shown as is.
 */

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string, vars?: Record<string, unknown>) =>
    vars ? `${key}:${JSON.stringify(vars)}` : key,
  useFormatter: () => ({ dateTime: () => "10 Aug 2021", relativeTime: () => "2 hours ago" }),
}));

const decideMutate = vi.fn();
const invalidateProposed = vi.fn(async () => undefined);
const invalidateForEvent = vi.fn(async () => undefined);
const invalidateCount = vi.fn(async () => undefined);
let mutation: { isPending: boolean; isError: boolean; error: { message: string } | null; variables?: { decision: string } } = {
  isPending: false,
  isError: false,
  error: null,
};
/** The options given to useMutation: the hook-level onSuccess that must
 * survive the pane unmounting. */
let hookOptions: {
  onSuccess?: (data: unknown) => void;
  onError?: (err: { data?: { code?: string } | null }) => void;
} = {};
vi.mock("~/trpc/react", () => ({
  api: {
    useUtils: () => ({
      tasks: {
        proposedImpactPriors: { invalidate: invalidateProposed },
        reviewCount: { invalidate: invalidateCount },
        forEvent: { invalidate: invalidateForEvent },
      },
    }),
    tasks: {
      decideImpactPrior: {
        useMutation: (opts: typeof hookOptions) => {
          hookOptions = opts;
          return { mutate: decideMutate, ...mutation };
        },
      },
    },
  },
}));

const { ImpactPriorPane } = await import("./impact-prior-pane");

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
  numberOfCases: 1,
  basis: [{ tier: "clear", eventId: "evt-2021", occurredAt: "2021-08-10", scope: "district", quote: "The Nile burst its banks." }],
  methodVersion: "clear-impact-prior@0.1.0",
  supersedesId: null,
  decidedById: null,
  decidedAt: null,
  decisionRationale: null,
  createdAt: "2026-10-06T11:00:00.000Z",
};

function renderPane(props: Partial<React.ComponentProps<typeof ImpactPriorPane>> = {}) {
  return render(
    <MantineProvider>
      <ImpactPriorPane prior={PRIOR} canDecide {...props} />
    </MantineProvider>,
  );
}

describe("ImpactPriorPane", () => {
  afterEach(() => {
    cleanup();
    decideMutate.mockReset();
    invalidateProposed.mockClear();
    invalidateForEvent.mockClear();
    invalidateCount.mockClear();
    mutation = { isPending: false, isError: false, error: null };
    hookOptions = {};
  });

  it("accepts with the rationale and reports the decision", () => {
    const onDecided = vi.fn();
    decideMutate.mockImplementation((_input, opts) => opts.onSuccess({ ...PRIOR, state: "accepted" }));
    renderPane({ onDecided });
    expect(screen.getByTestId("enrichment-case")).toHaveTextContent("The Nile burst its banks.");
    fireEvent.change(screen.getByTestId("impact-prior-rationale"), { target: { value: "Matches the 2021 floods" } });
    fireEvent.click(screen.getByTestId("impact-prior-accept"));
    expect(decideMutate).toHaveBeenCalledWith(
      { id: "ip-1", decision: "accepted", rationale: "Matches the 2021 floods" },
      expect.any(Object),
    );
    expect(onDecided).toHaveBeenCalledWith(expect.objectContaining({ state: "accepted" }), "accepted");
  });

  it("refetches both doors from the hook-level callback, which outlives the pane", () => {
    // mutate() never settles here: the pane is gone (J/K, navigation) by
    // the time the answer lands, and React Query drops per-call callbacks
    // then — the invalidation must not live there.
    const view = renderPane();
    fireEvent.change(screen.getByTestId("impact-prior-rationale"), { target: { value: "late answer" } });
    fireEvent.click(screen.getByTestId("impact-prior-reject"));
    expect(decideMutate).toHaveBeenCalled();
    view.unmount();
    hookOptions.onSuccess?.({ ...PRIOR, state: "rejected" });
    expect(invalidateProposed).toHaveBeenCalledTimes(1);
    expect(invalidateCount).toHaveBeenCalledTimes(1);
    expect(invalidateForEvent).toHaveBeenCalledWith({ eventId: "evt-1" });
  });

  it.each(["CONFLICT", "NOT_FOUND"])("refetches both doors when the decision fails with %s (stale copy)", (code) => {
    renderPane();
    hookOptions.onError?.({ data: { code } });
    expect(invalidateProposed).toHaveBeenCalledTimes(1);
    expect(invalidateForEvent).toHaveBeenCalledWith({ eventId: "evt-1" });
  });

  it("keeps the item for other failures, so the decider can retry", () => {
    renderPane();
    hookOptions.onError?.({ data: { code: "INTERNAL_SERVER_ERROR" } });
    expect(invalidateProposed).not.toHaveBeenCalled();
    expect(invalidateForEvent).not.toHaveBeenCalled();
  });

  it("refuses to decide without a rationale, and says so", () => {
    renderPane();
    fireEvent.click(screen.getByTestId("impact-prior-accept"));
    fireEvent.click(screen.getByTestId("impact-prior-reject"));
    expect(decideMutate).not.toHaveBeenCalled();
    expect(screen.getByText("rationaleRequired")).toBeInTheDocument();
  });

  it("refuses an over-long rationale before the round trip", () => {
    renderPane();
    fireEvent.change(screen.getByTestId("impact-prior-rationale"), { target: { value: "x".repeat(4001) } });
    expect(screen.getByText('rationaleTooLong:{"max":4000}')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("impact-prior-reject"));
    expect(decideMutate).not.toHaveBeenCalled();
  });

  it("shows the server's answer when the decision fails", () => {
    mutation = { isPending: false, isError: true, error: { message: "ImpactPrior is already rejected" } };
    renderPane();
    expect(screen.getByTestId("impact-prior-error")).toHaveTextContent("ImpactPrior is already rejected");
  });

  it("disables both actions while a decision is in flight", () => {
    mutation = { isPending: true, isError: false, error: null, variables: { decision: "accepted" } };
    renderPane();
    expect(screen.getByTestId("impact-prior-accept")).toBeDisabled();
    expect(screen.getByTestId("impact-prior-reject")).toBeDisabled();
    fireEvent.change(screen.getByTestId("impact-prior-rationale"), { target: { value: "late" } });
    fireEvent.click(screen.getByTestId("impact-prior-reject"));
    expect(decideMutate).not.toHaveBeenCalled();
  });

  it.each([
    ["a non-decider", { canDecide: false }],
    ["an already accepted prior", { prior: { ...PRIOR, state: "accepted" as const } }],
  ])("is the card alone for %s", (_label, props) => {
    renderPane(props);
    expect(screen.getByTestId("enrichment-prior")).toBeInTheDocument();
    expect(screen.queryByTestId("impact-prior-decision")).not.toBeInTheDocument();
  });
});
