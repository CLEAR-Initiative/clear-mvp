import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import type { GqlTask } from "~/lib/types/graphql";

/**
 * The Request enrichment action (clear-api ADR-0010): the flag, the
 * client-side mirror of the gate, the confirm-then-mutate flow with the
 * active team as the hint, the "requested" state with cancel for the
 * requester or an admin, and the server's verdicts — DAILY_CAP as
 * TOO_MANY_REQUESTS, FORBIDDEN — rendered as disabled states.
 */

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

let flagEnabled = true;
vi.mock("~/components/feature-flags-provider", () => ({
  useFeatureEnabled: () => flagEnabled,
}));

let teams: Array<{ id: string }> = [];
vi.mock("~/providers/team-provider", () => ({
  useOptionalTeam: () => ({ activeTeamId: teams[0]?.id ?? null, teams }),
}));

let me: { id: string; role: string } = { id: "u", role: "analyst" };
let tasks: GqlTask[] = [];
const requestMutate = vi.fn();
const cancelMutate = vi.fn();
let requestError: { data?: { code?: string }; message?: string } | null = null;
const invalidate = vi.fn(async () => undefined);

vi.mock("~/trpc/react", () => ({
  api: {
    useUtils: () => ({ tasks: { forEvent: { invalidate } } }),
    auth: { me: { useQuery: () => ({ data: { user: me } }) } },
    tasks: {
      forEvent: { useQuery: () => ({ data: { tasks, impactPriors: [] } }) },
      requestEnrichment: {
        useMutation: () => ({ mutate: requestMutate, isPending: false, isError: !!requestError, error: requestError }),
      },
      cancel: { useMutation: () => ({ mutate: cancelMutate, isPending: false }) },
    },
  },
}));

const { RequestEnrichmentButton } = await import("./request-enrichment-button");

const OPEN: GqlTask = {
  id: "task-1",
  kind: "event.impact_prior",
  subjectType: "event",
  subjectId: "evt-1",
  status: "PENDING",
  origin: "user",
  requesterId: "u",
  requester: { id: "u", name: "Ana" },
  teamId: null,
  attempts: 0,
  maxAttempts: 3,
  lastError: null,
  cancelRequestedAt: null,
  outcome: null,
  model: null,
  costUsd: null,
  completedAt: null,
  createdAt: "2026-10-06T10:00:00.000Z",
  updatedAt: "2026-10-06T10:00:00.000Z",
};

function renderButton() {
  return render(
    <MantineProvider>
      <RequestEnrichmentButton eventId="evt-1" />
    </MantineProvider>,
  );
}

describe("RequestEnrichmentButton", () => {
  afterEach(() => {
    cleanup();
    flagEnabled = true;
    teams = [];
    me = { id: "u", role: "analyst" };
    tasks = [];
    requestError = null;
    requestMutate.mockClear();
    cancelMutate.mockClear();
  });

  it("renders nothing while the flag is off", () => {
    flagEnabled = false;
    renderButton();
    expect(screen.queryByTestId("request-enrichment")).toBeNull();
  });

  it("is disabled for a viewer with no team, as the server would refuse them", () => {
    me = { id: "v", role: "viewer" };
    renderButton();
    expect(screen.getByTestId("request-enrichment").getAttribute("data-disabled")).toBe("true");
    fireEvent.click(screen.getByTestId("request-enrichment"));
    expect(screen.queryByTestId("enrichment-confirm")).toBeNull();
  });

  it("lets a team member request, passing the active team as the hint, after confirming", () => {
    me = { id: "v", role: "viewer" };
    teams = [{ id: "team-1" }];
    renderButton();
    fireEvent.click(screen.getByTestId("request-enrichment"));
    expect(screen.getByTestId("enrichment-confirm")).toBeTruthy();
    fireEvent.click(screen.getByTestId("enrichment-confirm-button"));
    expect(requestMutate).toHaveBeenCalledWith({ eventId: "evt-1", teamId: "team-1" });
  });

  it("shows the requested state while a Task is open, with cancel for the requester", () => {
    tasks = [OPEN];
    renderButton();
    expect(screen.getByTestId("enrichment-requested")).toBeTruthy();
    fireEvent.click(screen.getByTestId("enrichment-cancel"));
    expect(cancelMutate).toHaveBeenCalledWith({ id: "task-1" });
  });

  it("offers cancel to a platform admin but not to another analyst", () => {
    tasks = [OPEN];
    me = { id: "admin-1", role: "admin" };
    renderButton();
    expect(screen.getByTestId("enrichment-cancel")).toBeTruthy();
    cleanup();
    me = { id: "other", role: "analyst" };
    renderButton();
    expect(screen.queryByTestId("enrichment-cancel")).toBeNull();
  });

  it("shows a cancel already requested on a LEASED Task as pending, not clickable", () => {
    tasks = [{ ...OPEN, status: "LEASED", cancelRequestedAt: "2026-10-06T10:05:00.000Z" }];
    renderButton();
    const cancel = screen.getByTestId("enrichment-cancel") as HTMLButtonElement;
    expect(cancel.disabled).toBe(true);
    expect(cancel.textContent).toContain("cancelled");
  });

  it("renders the daily cap as a disabled button with the cap message", () => {
    requestError = { data: { code: "TOO_MANY_REQUESTS" }, message: "Daily enrichment request cap reached: 20 requests per day." };
    renderButton();
    const cap = screen.getByTestId("enrichment-cap-reached");
    expect(cap.getAttribute("data-disabled")).not.toBeNull();
    expect(cap.textContent).toContain("capReached");
    expect(screen.queryByTestId("request-enrichment")).toBeNull();
  });

  it("renders the server's FORBIDDEN as the disabled-with-tooltip treatment", () => {
    requestError = { data: { code: "FORBIDDEN" }, message: "Insufficient permissions" };
    renderButton();
    expect(screen.getByTestId("enrichment-forbidden").getAttribute("data-disabled")).not.toBeNull();
  });
});
