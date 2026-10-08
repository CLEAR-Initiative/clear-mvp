import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Router tests for the Event enrichment procedures (clear-api ADR-0010).
 * graphqlFetch and the auth session fetch are mocked; the assertions cover
 * the documents and variables sent to clear-api and how its error codes
 * reach the client.
 */

const graphqlFetch = vi.fn();
vi.mock("~/server/api/graphql", async () => {
  const actual = await vi.importActual<typeof import("~/server/api/graphql")>("~/server/api/graphql");
  return {
    ...actual,
    graphqlFetch: (...args: unknown[]) => graphqlFetch(...args),
    cookieHeaders: () => ({ Cookie: "better-auth.session_token=x" }),
  };
});

const { createCaller } = await import("~/server/api/root");
const { GraphQLRequestError } = await import("~/server/api/graphql");

function caller() {
  return createCaller({ headers: new Headers({ cookie: "better-auth.session_token=x" }) });
}

const TASK = {
  id: "task-1",
  kind: "event.impact_prior.clear",
  requestId: "req-1",
  subjectType: "event",
  subjectId: "evt-1",
  status: "PENDING",
  origin: "user",
  requesterId: "u",
  requester: { id: "u", name: "Ana" },
  leaseOwner: null,
  teamId: "team-1",
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

describe("tasks router", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            session: { id: "s", userId: "u", expiresAt: "2099-01-01" },
            user: { id: "u", email: "a@b.c", role: "analyst" },
          }),
          { status: 200 },
        ),
      ),
    );
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    graphqlFetch.mockReset();
  });

  it("requestEnrichment sends the mutation with the Event and the active team as the hint, and returns one Task per kind", async () => {
    const WEB = { ...TASK, id: "task-2", kind: "event.impact_prior.web" };
    graphqlFetch.mockResolvedValueOnce({ requestEventEnrichment: [TASK, WEB] });
    const result = await caller().tasks.requestEnrichment({ eventId: "evt-1", teamId: "team-1" });
    expect(result).toEqual([TASK, WEB]);
    const [query, vars] = graphqlFetch.mock.calls[0] as [string, Record<string, unknown>];
    expect(query).toContain("mutation RequestEventEnrichment");
    expect(query).toContain("requestEventEnrichment(eventId: $eventId, teamId: $teamId, horizonYears: $horizonYears)");
    expect(query).toContain("lastError");
    expect(query).toContain("requestId");
    expect(query).toContain("leaseOwner { id name }");
    expect(vars).toEqual({ eventId: "evt-1", teamId: "team-1", horizonYears: undefined });
  });

  it("requestEnrichment omits the team hint when there is none", async () => {
    graphqlFetch.mockResolvedValueOnce({ requestEventEnrichment: [TASK] });
    await caller().tasks.requestEnrichment({ eventId: "evt-1" });
    const [, vars] = graphqlFetch.mock.calls[0] as [string, Record<string, unknown>];
    expect(vars).toEqual({ eventId: "evt-1", teamId: undefined, horizonYears: undefined });
  });

  it.each([
    ["FORBIDDEN", undefined, "FORBIDDEN"],
    ["FORBIDDEN", "DAILY_CAP", "TOO_MANY_REQUESTS"],
    ["NOT_FOUND", undefined, "NOT_FOUND"],
    ["CONFLICT", undefined, "CONFLICT"],
    ["BAD_USER_INPUT", undefined, "BAD_REQUEST"],
  ])("maps clear-api %s / %s onto tRPC %s, keeping the message", async (code, subCode, trpcCode) => {
    graphqlFetch.mockRejectedValueOnce(new GraphQLRequestError("clear-api said so: 20 per day", code, subCode));
    await expect(caller().tasks.requestEnrichment({ eventId: "evt-1" })).rejects.toMatchObject({
      code: trpcCode,
      message: "clear-api said so: 20 per day",
    });
  });

  it("forEvent reads the Event's Tasks and web cases in one query, and no whole priors", async () => {
    graphqlFetch.mockResolvedValueOnce({ eventTasks: [TASK], eventCaseProposals: [{ id: "cp-1" }] });
    const result = await caller().tasks.forEvent({ eventId: "evt-1" });
    expect(result).toEqual({ tasks: [TASK], caseProposals: [{ id: "cp-1" }] });
    const [query, vars] = graphqlFetch.mock.calls[0] as [string, Record<string, unknown>];
    expect(query).toContain("eventTasks(eventId: $eventId)");
    expect(query).toContain("eventCaseProposals(eventId: $eventId)");
    expect(query).not.toContain("eventImpactPriors");
    for (const field of ["taskId", "state", "sourceUrl", "figures", "geographicScope"]) {
      expect(query).toContain(field);
    }
    expect(vars).toEqual({ eventId: "evt-1" });
  });

  it("never asks clear-api for the retired whole-prior fields (clear-api is removing them)", async () => {
    const router = await import("./tasks");
    const documents = Object.entries(router).filter(([, v]) => typeof v === "string") as [string, string][];
    expect(documents.length).toBeGreaterThan(5);
    for (const [name, doc] of documents) {
      for (const retired of ["impactPriors(", "eventImpactPriors", "decideImpactPrior", "ImpactPriorInput", "ImpactPriorDecision"]) {
        expect(doc, `${name} reads ${retired}`).not.toContain(retired);
      }
    }
  });

  it("myTasks reads the caller's Tasks, then each Event's title in one aliased document", async () => {
    const WEB = { ...TASK, id: "task-2", kind: "event.impact_prior.web" };
    const OTHER = { ...TASK, id: "task-3", subjectId: "evt-2" };
    graphqlFetch
      .mockResolvedValueOnce({ recent: [TASK, WEB, OTHER], pending: [TASK], leased: [] })
      .mockResolvedValueOnce({ e0: { id: "evt-1", title: "Floods in Kassala" }, e1: null });
    const result = await caller().tasks.myTasks();
    expect(result).toEqual({ tasks: [TASK, WEB, OTHER], eventTitles: { "evt-1": "Floods in Kassala", "evt-2": null } });

    const [query, vars] = graphqlFetch.mock.calls[0] as [string, Record<string, unknown>];
    expect(query).toContain("query MyTasksWithOpen");
    expect(query).toContain("recent: myTasks(limit: $limit)");
    expect(query).toContain("pending: myTasks(status: PENDING, limit: $openLimit)");
    expect(query).toContain("leased: myTasks(status: LEASED, limit: $openLimit)");
    // No requester argument exists: clear-api scopes it to the caller.
    expect(query).not.toContain("requesterId:");
    expect(vars).toEqual({ limit: 100, openLimit: 200 });

    // One Event read per distinct Event, aliased, as variables (never interpolated ids).
    const [eventsQuery, eventVars] = graphqlFetch.mock.calls[1] as [string, Record<string, unknown>];
    expect(eventsQuery).toContain("query MyTaskEvents($e0: String!, $e1: String!)");
    expect(eventsQuery).toContain("e0: event(id: $e0) { id title }");
    expect(eventsQuery).toContain("e1: event(id: $e1) { id title }");
    expect(eventVars).toEqual({ e0: "evt-1", e1: "evt-2" });
  });

  it("myTasks keeps an open request older than the newest page, once, newest first", async () => {
    const OLD_PENDING = { ...TASK, id: "task-old", createdAt: "2026-01-01T00:00:00.000Z" };
    const OLD_LEASED = { ...TASK, id: "task-older", status: "LEASED", createdAt: "2025-12-01T00:00:00.000Z" };
    const RECENT = { ...TASK, id: "task-new", status: "COMPLETED", createdAt: "2026-10-07T00:00:00.000Z" };
    graphqlFetch
      .mockResolvedValueOnce({ recent: [RECENT, TASK], pending: [TASK, OLD_PENDING], leased: [OLD_LEASED] })
      .mockResolvedValueOnce({ e0: { id: "evt-1", title: "Floods" } });
    const { tasks } = await caller().tasks.myTasks();
    expect(tasks.map((task) => task.id)).toEqual(["task-new", "task-1", "task-old", "task-older"]);
  });

  it("myTasks still lists the requests, untitled, when the title read fails", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    graphqlFetch
      .mockResolvedValueOnce({ recent: [TASK], pending: [], leased: [] })
      .mockRejectedValueOnce(new GraphQLRequestError("database timeout", "INTERNAL_SERVER_ERROR"));
    expect(await caller().tasks.myTasks()).toEqual({ tasks: [TASK], eventTitles: {} });
    expect(consoleError).toHaveBeenCalled();
  });

  it("myTasks makes no Event read when there are no Tasks, and passes a status filter", async () => {
    graphqlFetch.mockResolvedValueOnce({ myTasks: [] });
    expect(await caller().tasks.myTasks({ status: "FAILED" })).toEqual({ tasks: [], eventTitles: {} });
    expect((graphqlFetch.mock.calls[0] as [string])[0]).toContain("myTasks(status: $status, limit: $limit)");
    expect(graphqlFetch).toHaveBeenCalledTimes(1);
    expect((graphqlFetch.mock.calls[0] as [string, Record<string, unknown>])[1]).toEqual({ status: "FAILED", limit: 100 });
  });

  it("myTasks surfaces clear-api's FORBIDDEN (the worker role) as FORBIDDEN", async () => {
    graphqlFetch.mockRejectedValueOnce(new GraphQLRequestError("The worker role may only call the Task mutations", "FORBIDDEN"));
    await expect(caller().tasks.myTasks()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("forEvent surfaces clear-api's FORBIDDEN as FORBIDDEN, not an internal error", async () => {
    graphqlFetch.mockRejectedValueOnce(new GraphQLRequestError("Your account is awaiting admin approval", "FORBIDDEN", "PENDING_APPROVAL"));
    await expect(caller().tasks.forEvent({ eventId: "evt-1" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("reviewCount counts the proposed web cases, ids only, at clear-api's page maximum", async () => {
    graphqlFetch.mockResolvedValueOnce({ caseProposals: [{ id: "cp-1" }, { id: "cp-2" }] });
    expect(await caller().tasks.reviewCount()).toEqual({ count: 2, capped: false });
    const [query, vars] = graphqlFetch.mock.calls[0] as [string, Record<string, unknown>];
    expect(query).toContain("caseProposals(state: proposed, limit: $limit)");
    expect(query).not.toContain("basis");
    expect(query).not.toContain("quote");
    expect(query).not.toContain("event");
    expect(vars).toEqual({ limit: 200 });

    graphqlFetch.mockResolvedValueOnce({
      caseProposals: Array.from({ length: 200 }, (_, i) => ({ id: `cp-${i}` })),
    });
    expect(await caller().tasks.reviewCount()).toEqual({ count: 200, capped: true });
  });

  it("proposedCaseProposals reads the proposed web cases with the Event each was found for", async () => {
    graphqlFetch.mockResolvedValueOnce({ caseProposals: [{ id: "cp-1", state: "proposed", event: { id: "evt-1", title: "Floods" } }] });
    const result = await caller().tasks.proposedCaseProposals({ limit: 200 });
    expect(result).toEqual([{ id: "cp-1", state: "proposed", event: { id: "evt-1", title: "Floods" } }]);
    const [query, vars] = graphqlFetch.mock.calls[0] as [string, Record<string, unknown>];
    expect(query).toContain("caseProposals(state: proposed, limit: $limit, offset: $offset)");
    for (const field of ["sourceUrl", "quote", "occurredAt", "locationLabel", "figures", "matchedEventId", "resultEventId", "event { id title types }"]) {
      expect(query).toContain(field);
    }
    expect(vars).toEqual({ limit: 200, offset: undefined });
  });

  it("proposedCaseProposals with no limit reads every page, overlapping, each case once", async () => {
    const page = (from: number, n: number) => Array.from({ length: n }, (_, i) => ({ id: `cp-${from + i}` }));
    graphqlFetch
      .mockResolvedValueOnce({ caseProposals: page(0, 200) })
      // Two cases from the first page were decided meanwhile: the list moved
      // up by two, and the overlap still reads cp-200 and cp-201.
      .mockResolvedValueOnce({ caseProposals: page(152, 200) })
      .mockResolvedValueOnce({ caseProposals: page(302, 10) });
    const result = await caller().tasks.proposedCaseProposals();
    expect(result).toHaveLength(352);
    expect(new Set(result.map((c) => c.id)).size).toBe(352);
    expect(result.some((c) => c.id === "cp-200")).toBe(true);
    expect(graphqlFetch.mock.calls.map((c) => (c as [string, Record<string, unknown>])[1])).toEqual([
      { limit: 200, offset: 0 },
      { limit: 200, offset: 150 },
      { limit: 200, offset: 300 },
    ]);
  });

  it("computedPriors reads the Event's computed ImpactPriors, empty when the Event is not visible", async () => {
    graphqlFetch.mockResolvedValueOnce({ event: { id: "evt-1", computedImpactPriors: [{ metric: "people_affected", unit: null }] } });
    expect(await caller().tasks.computedPriors({ eventId: "evt-1" })).toEqual([{ metric: "people_affected", unit: null }]);
    const [query, vars] = graphqlFetch.mock.calls[0] as [string, Record<string, unknown>];
    expect(query).toContain("computedImpactPriors(horizonYears: $horizonYears)");
    for (const field of ["centralValue", "lowerBound", "upperBound", "numberOfCases", "lowConfidence", "eventIds", "unit"]) {
      expect(query).toContain(field);
    }
    expect(vars).toEqual({ eventId: "evt-1", horizonYears: undefined });

    graphqlFetch.mockResolvedValueOnce({ event: null });
    expect(await caller().tasks.computedPriors({ eventId: "evt-x" })).toEqual([]);
  });

  it("decideCaseProposal rejects with a trimmed rationale and accepts without one", async () => {
    graphqlFetch.mockResolvedValueOnce({ decideCaseProposal: { id: "cp-1", state: "rejected" } });
    await caller().tasks.decideCaseProposal({ id: "cp-1", decision: "rejected", rationale: "  Another country  " });
    const [query, vars] = graphqlFetch.mock.calls[0] as [string, Record<string, unknown>];
    expect(query).toContain("mutation DecideCaseProposal($id: String!, $decision: CaseProposalDecision!, $rationale: String)");
    expect(query).toContain("decideCaseProposal(id: $id, decision: $decision, rationale: $rationale)");
    expect(query).toContain("resultEventId");
    expect(vars).toEqual({ id: "cp-1", decision: "rejected", rationale: "Another country" });

    graphqlFetch.mockResolvedValueOnce({ decideCaseProposal: { id: "cp-2", state: "accepted", resultEventId: "evt-h" } });
    const accepted = await caller().tasks.decideCaseProposal({ id: "cp-2", decision: "accepted", rationale: "   " });
    expect(accepted.resultEventId).toBe("evt-h");
    expect((graphqlFetch.mock.calls[1] as [string, Record<string, unknown>])[1]).toEqual({
      id: "cp-2",
      decision: "accepted",
      rationale: undefined,
    });
  });

  it("decideCaseProposal refuses a reject without a rationale, or an over-long one, before the round trip", async () => {
    await expect(caller().tasks.decideCaseProposal({ id: "cp-1", decision: "rejected" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(caller().tasks.decideCaseProposal({ id: "cp-1", decision: "rejected", rationale: "  " })).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
    await expect(
      caller().tasks.decideCaseProposal({ id: "cp-1", decision: "accepted", rationale: "x".repeat(4001) }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(graphqlFetch).not.toHaveBeenCalled();
  });

  it("decideCaseProposal surfaces CONFLICT when another decider got there first", async () => {
    graphqlFetch.mockRejectedValueOnce(new GraphQLRequestError("CaseProposal is already accepted", "CONFLICT"));
    await expect(caller().tasks.decideCaseProposal({ id: "cp-1", decision: "accepted" })).rejects.toMatchObject({
      code: "CONFLICT",
      message: "CaseProposal is already accepted",
    });
  });

  it("proposedCaseProposals surfaces clear-api's FORBIDDEN for a non-decider", async () => {
    graphqlFetch.mockRejectedValueOnce(new GraphQLRequestError("Requires one of: admin, analyst", "FORBIDDEN"));
    await expect(caller().tasks.proposedCaseProposals()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("cancel sends the mutation and surfaces CONFLICT for a finished Task", async () => {
    graphqlFetch.mockResolvedValueOnce({ cancelTask: { ...TASK, status: "CANCELLED" } });
    const result = await caller().tasks.cancel({ id: "task-1" });
    expect(result.status).toBe("CANCELLED");
    expect((graphqlFetch.mock.calls[0] as [string])[0]).toContain("mutation CancelTask");

    graphqlFetch.mockRejectedValueOnce(new GraphQLRequestError("Task is COMPLETED and can no longer be cancelled", "CONFLICT"));
    await expect(caller().tasks.cancel({ id: "task-1" })).rejects.toMatchObject({ code: "CONFLICT" });
  });
});
