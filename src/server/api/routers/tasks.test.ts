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
  kind: "event.impact_prior",
  subjectType: "event",
  subjectId: "evt-1",
  status: "PENDING",
  origin: "user",
  requesterId: "u",
  requester: { id: "u", name: "Ana" },
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

  it("requestEnrichment sends the mutation with the Event and the active team as the hint", async () => {
    graphqlFetch.mockResolvedValueOnce({ requestEventEnrichment: TASK });
    const result = await caller().tasks.requestEnrichment({ eventId: "evt-1", teamId: "team-1" });
    expect(result).toEqual(TASK);
    const [query, vars] = graphqlFetch.mock.calls[0] as [string, Record<string, unknown>];
    expect(query).toContain("mutation RequestEventEnrichment");
    expect(query).toContain("requestEventEnrichment(eventId: $eventId, teamId: $teamId, horizonYears: $horizonYears)");
    expect(query).toContain("lastError");
    expect(vars).toEqual({ eventId: "evt-1", teamId: "team-1", horizonYears: undefined });
  });

  it("requestEnrichment omits the team hint when there is none", async () => {
    graphqlFetch.mockResolvedValueOnce({ requestEventEnrichment: TASK });
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

  it("forEvent reads the Event's Tasks and ImpactPriors in one query", async () => {
    graphqlFetch.mockResolvedValueOnce({ eventTasks: [TASK], eventImpactPriors: [] });
    const result = await caller().tasks.forEvent({ eventId: "evt-1" });
    expect(result).toEqual({ tasks: [TASK], impactPriors: [] });
    const [query, vars] = graphqlFetch.mock.calls[0] as [string, Record<string, unknown>];
    expect(query).toContain("eventTasks(eventId: $eventId)");
    expect(query).toContain("eventImpactPriors(eventId: $eventId)");
    for (const field of ["basis", "numberOfCases", "geographicScope", "state", "supersedesId"]) {
      expect(query).toContain(field);
    }
    expect(vars).toEqual({ eventId: "evt-1" });
  });

  it("forEvent surfaces clear-api's FORBIDDEN as FORBIDDEN, not an internal error", async () => {
    graphqlFetch.mockRejectedValueOnce(new GraphQLRequestError("Your account is awaiting admin approval", "FORBIDDEN", "PENDING_APPROVAL"));
    await expect(caller().tasks.forEvent({ eventId: "evt-1" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("proposedImpactPriors reads the Review items with the Event they are about", async () => {
    graphqlFetch.mockResolvedValueOnce({ impactPriors: [{ id: "ip-1", state: "proposed", event: { id: "evt-1", title: "Floods" } }] });
    const result = await caller().tasks.proposedImpactPriors({ limit: 20, offset: 40 });
    expect(result).toEqual([{ id: "ip-1", state: "proposed", event: { id: "evt-1", title: "Floods" } }]);
    const [query, vars] = graphqlFetch.mock.calls[0] as [string, Record<string, unknown>];
    expect(query).toContain("query ProposedImpactPriors");
    expect(query).toContain("impactPriors(state: proposed, limit: $limit, offset: $offset)");
    expect(query).toContain("event { id title types }");
    expect(vars).toEqual({ limit: 20, offset: 40 });

    graphqlFetch.mockResolvedValueOnce({ impactPriors: [] });
    await caller().tasks.proposedImpactPriors();
    expect((graphqlFetch.mock.calls[1] as [string, Record<string, unknown>])[1]).toEqual({ limit: undefined, offset: undefined });
  });

  it("proposedImpactPriors surfaces clear-api's FORBIDDEN for a non-decider", async () => {
    graphqlFetch.mockRejectedValueOnce(new GraphQLRequestError("Requires one of: admin, analyst", "FORBIDDEN"));
    await expect(caller().tasks.proposedImpactPriors()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("decideImpactPrior sends the decision with a trimmed rationale", async () => {
    graphqlFetch.mockResolvedValueOnce({ decideImpactPrior: { id: "ip-1", state: "rejected", decisionRationale: "Wrong country" } });
    const result = await caller().tasks.decideImpactPrior({ id: "ip-1", decision: "rejected", rationale: "  Wrong country  " });
    expect(result.state).toBe("rejected");
    const [query, vars] = graphqlFetch.mock.calls[0] as [string, Record<string, unknown>];
    expect(query).toContain("mutation DecideImpactPrior");
    expect(query).toContain("decideImpactPrior(id: $id, decision: $decision, rationale: $rationale)");
    expect(vars).toEqual({ id: "ip-1", decision: "rejected", rationale: "Wrong country" });
  });

  it("decideImpactPrior refuses an empty or over-long rationale before the round trip", async () => {
    await expect(caller().tasks.decideImpactPrior({ id: "ip-1", decision: "rejected", rationale: "   " })).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
    await expect(
      caller().tasks.decideImpactPrior({ id: "ip-1", decision: "accepted", rationale: "x".repeat(4001) }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(graphqlFetch).not.toHaveBeenCalled();
  });

  it("decideImpactPrior surfaces CONFLICT for a prior that is already decided", async () => {
    graphqlFetch.mockRejectedValueOnce(new GraphQLRequestError("ImpactPrior is already rejected", "CONFLICT"));
    await expect(caller().tasks.decideImpactPrior({ id: "ip-1", decision: "accepted", rationale: "ok" })).rejects.toMatchObject({
      code: "CONFLICT",
      message: "ImpactPrior is already rejected",
    });
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
