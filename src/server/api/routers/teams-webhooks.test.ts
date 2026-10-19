import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Router tests for the team alert-webhook procedures: the documents and
 * variables sent to clear-api, zod input validation, and how clear-api's
 * errors reach the client.
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

const WEBHOOK = {
  id: "wh-1",
  name: "Ops Slack bridge",
  targetUrl: "https://hooks.example.org/clear",
  source: null,
  teamId: "team-1",
  alertTypeFilter: ["CF"],
  minSeverity: 3,
  active: true,
  createdAt: "2026-10-18T10:00:00.000Z",
  secret: null,
};

describe("teams.alertWebhooks router", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            session: { id: "s", userId: "u", expiresAt: "2099-01-01" },
            user: { id: "u", email: "a@b.c", role: "member" },
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

  it("list sends the team id and returns the scrubbed rows", async () => {
    graphqlFetch.mockResolvedValueOnce({ teamAlertWebhooks: [WEBHOOK] });
    const result = await caller().teams.alertWebhooks.list({ teamId: "team-1" });
    expect(result).toEqual([WEBHOOK]);
    const [query, vars] = graphqlFetch.mock.calls[0] as [string, Record<string, unknown>];
    expect(query).toContain("query TeamAlertWebhooks");
    expect(query).toContain("teamAlertWebhooks(teamId: $teamId)");
    for (const field of ["id", "name", "targetUrl", "alertTypeFilter", "minSeverity", "active", "secret"]) {
      expect(query).toContain(field);
    }
    expect(vars).toEqual({ teamId: "team-1" });
  });

  it("create wraps the input and returns the one-time secret", async () => {
    graphqlFetch.mockResolvedValueOnce({
      createAlertWebhook: { ...WEBHOOK, secret: "whsec_abc123" },
    });
    const result = await caller().teams.alertWebhooks.create({
      teamId: "team-1",
      name: "Ops Slack bridge",
      targetUrl: "https://hooks.example.org/clear",
      alertTypeFilter: ["CF"],
      minSeverity: 3,
    });
    expect(result.secret).toBe("whsec_abc123");
    const [query, vars] = graphqlFetch.mock.calls[0] as [string, Record<string, unknown>];
    expect(query).toContain("mutation CreateAlertWebhook");
    expect(vars).toEqual({
      input: {
        teamId: "team-1",
        name: "Ops Slack bridge",
        targetUrl: "https://hooks.example.org/clear",
        alertTypeFilter: ["CF"],
        minSeverity: 3,
      },
    });
  });

  it("create rejects a non-https target URL before hitting clear-api", async () => {
    await expect(
      caller().teams.alertWebhooks.create({
        teamId: "team-1",
        name: "Bad",
        targetUrl: "http://insecure.example.org/clear",
      }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(graphqlFetch).not.toHaveBeenCalled();
  });

  it("create rejects an out-of-range min severity", async () => {
    await expect(
      caller().teams.alertWebhooks.create({
        teamId: "team-1",
        name: "Bad",
        targetUrl: "https://hooks.example.org/clear",
        minSeverity: 6,
      }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(graphqlFetch).not.toHaveBeenCalled();
  });

  it("update splits id from the patch fields", async () => {
    graphqlFetch.mockResolvedValueOnce({ updateAlertWebhook: { ...WEBHOOK, active: false } });
    const result = await caller().teams.alertWebhooks.update({ id: "wh-1", active: false });
    expect(result.active).toBe(false);
    const [query, vars] = graphqlFetch.mock.calls[0] as [string, Record<string, unknown>];
    expect(query).toContain("mutation UpdateAlertWebhook");
    expect(query).toContain("updateAlertWebhook(id: $id, input: $input)");
    expect(vars).toEqual({ id: "wh-1", input: { active: false } });
  });

  it("delete forwards the id and returns the boolean", async () => {
    graphqlFetch.mockResolvedValueOnce({ deleteAlertWebhook: true });
    const result = await caller().teams.alertWebhooks.delete({ id: "wh-1" });
    expect(result).toBe(true);
    const [query, vars] = graphqlFetch.mock.calls[0] as [string, Record<string, unknown>];
    expect(query).toContain("mutation DeleteAlertWebhook");
    expect(vars).toEqual({ id: "wh-1" });
  });

  it("rotateSecret returns the new secret and surfaces FORBIDDEN from clear-api", async () => {
    graphqlFetch.mockResolvedValueOnce({
      rotateAlertWebhookSecret: { ...WEBHOOK, secret: "whsec_new" },
    });
    const result = await caller().teams.alertWebhooks.rotateSecret({ id: "wh-1" });
    expect(result.secret).toBe("whsec_new");
    const [query, vars] = graphqlFetch.mock.calls[0] as [string, Record<string, unknown>];
    expect(query).toContain("mutation RotateAlertWebhookSecret");
    expect(vars).toEqual({ id: "wh-1" });

    graphqlFetch.mockRejectedValueOnce(new GraphQLRequestError("Not a team admin", "FORBIDDEN"));
    await expect(caller().teams.alertWebhooks.rotateSecret({ id: "wh-1" })).rejects.toMatchObject({
      message: "Not a team admin",
    });
  });
});
