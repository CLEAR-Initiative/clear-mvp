import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * Router tests for briefs: every procedure refuses a non-admin before any
 * call to clear-api, and an admin's input reaches the GraphQL operation as
 * the variables clear-api expects.
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
const { briefsRouter } = await import("~/server/api/routers/briefs");

function caller() {
  return createCaller({ headers: new Headers({ cookie: "better-auth.session_token=x" }) });
}
type Briefs = ReturnType<typeof caller>["briefs"];

function stubSession(role: string) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () =>
      new Response(
        JSON.stringify({
          session: { id: "s", userId: "u", expiresAt: "2099-01-01" },
          user: { id: "u", email: "a@b.c", role },
        }),
        { status: 200 },
      ),
    ),
  );
}

/**
 * Every procedure with a valid input, the operation it must call, the
 * variables it must send and what clear-api answers.
 */
const CASES: {
  name: keyof Briefs;
  run: (b: Briefs) => Promise<unknown>;
  op: string;
  vars: Record<string, unknown>;
  reply: Record<string, unknown>;
}[] = [
  { name: "list", run: (b) => b.list(), op: "query Briefs(", vars: { limit: 50, offset: 0 }, reply: { briefs: [] } },
  { name: "get", run: (b) => b.get({ id: "b1" }), op: "query Brief(", vars: { id: "b1" }, reply: { brief: null } },
  {
    name: "create",
    run: (b) => b.create({ cadence: "daily", locationId: "loc-sdn" }),
    op: "mutation CreateBrief(",
    vars: { input: { cadence: "daily", locationId: "loc-sdn" } },
    reply: { createBrief: { id: "b1" } },
  },
  {
    name: "update",
    run: (b) => b.update({ id: "b1", summary: "**Calm**" }),
    op: "mutation UpdateBrief(",
    vars: { id: "b1", input: { summary: "**Calm**" } },
    reply: { updateBrief: { id: "b1" } },
  },
  {
    name: "refreshWindow",
    run: (b) => b.refreshWindow({ id: "b1" }),
    op: "mutation RefreshBriefWindow(",
    vars: { id: "b1" },
    reply: { refreshBriefWindow: { id: "b1" } },
  },
  { name: "delete", run: (b) => b.delete({ id: "b1" }), op: "mutation DeleteBrief(", vars: { id: "b1" }, reply: { deleteBrief: true } },
  {
    name: "addItem",
    run: (b) => b.addItem({ briefId: "b1", kind: "alert", entityId: "a1" }),
    op: "mutation AddBriefItem(",
    vars: { briefId: "b1", kind: "alert", entityId: "a1" },
    reply: { addBriefItem: { id: "i1" } },
  },
  {
    name: "removeItem",
    run: (b) => b.removeItem({ itemId: "i1" }),
    op: "mutation RemoveBriefItem(",
    vars: { itemId: "i1" },
    reply: { removeBriefItem: true },
  },
  {
    name: "updateItemNote",
    run: (b) => b.updateItemNote({ itemId: "i1", note: null }),
    op: "mutation UpdateBriefItemNote(",
    vars: { itemId: "i1", note: null },
    reply: { updateBriefItemNote: { id: "i1" } },
  },
  {
    name: "reorderItems",
    run: (b) => b.reorderItems({ briefId: "b1", kind: "signal", itemIds: ["i2", "i1"] }),
    op: "mutation ReorderBriefItems(",
    vars: { briefId: "b1", kind: "signal", itemIds: ["i2", "i1"] },
    reply: { reorderBriefItems: [] },
  },
  { name: "sendTest", run: (b) => b.sendTest({ id: "b1" }), op: "mutation SendBriefTest(", vars: { id: "b1" }, reply: { sendBriefTest: true } },
  {
    name: "send",
    run: (b) => b.send({ id: "b1", recipientListId: "l1" }),
    op: "mutation SendBrief(",
    vars: { id: "b1", recipientListId: "l1" },
    reply: { sendBrief: { sent: 2, failed: 0 } },
  },
  { name: "recipientLists", run: (b) => b.recipientLists(), op: "query RecipientLists", vars: {}, reply: { recipientLists: [] } },
  {
    name: "createRecipientList",
    run: (b) => b.createRecipientList({ name: "CLEAR team" }),
    op: "mutation CreateRecipientList(",
    vars: { name: "CLEAR team" },
    reply: { createRecipientList: { id: "l1" } },
  },
  {
    name: "addRecipientListMember",
    run: (b) => b.addRecipientListMember({ listId: "l1", email: "x@y.org" }),
    op: "mutation AddRecipientListMember(",
    vars: { listId: "l1", email: "x@y.org" },
    reply: { addRecipientListMember: { id: "m1" } },
  },
  {
    name: "removeRecipientListMember",
    run: (b) => b.removeRecipientListMember({ memberId: "m1" }),
    op: "mutation RemoveRecipientListMember(",
    vars: { memberId: "m1" },
    reply: { removeRecipientListMember: true },
  },
];

describe("briefs router", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    graphqlFetch.mockReset();
  });

  it("covers every procedure", () => {
    expect(new Set(CASES.map((c) => c.name))).toEqual(new Set(Object.keys(briefsRouter._def.procedures)));
  });

  for (const role of ["analyst", "viewer", "pending"]) {
    it(`refuses every procedure for a ${role} without calling clear-api`, async () => {
      stubSession(role);
      for (const c of CASES) {
        await expect(c.run(caller().briefs), c.name).rejects.toMatchObject({ code: "FORBIDDEN" });
      }
      expect(graphqlFetch).not.toHaveBeenCalled();
    });
  }

  for (const c of CASES) {
    it(`${c.name} forwards its input to clear-api`, async () => {
      stubSession("admin");
      graphqlFetch.mockResolvedValueOnce(c.reply);
      const result = await c.run(caller().briefs);
      expect(graphqlFetch).toHaveBeenCalledTimes(1);
      const [query, vars, headers] = graphqlFetch.mock.calls[0]!;
      expect(query).toContain(c.op);
      expect(vars).toEqual(c.vars);
      expect(headers).toEqual({ Cookie: "better-auth.session_token=x" });
      expect(result).toEqual(Object.values(c.reply)[0]);
    });
  }

  it("sends a test to a chosen address, trimmed and lower-cased", async () => {
    stubSession("admin");
    graphqlFetch.mockResolvedValueOnce({ sendBriefTest: true });
    await caller().briefs.sendTest({ id: "b1", to: " Tester@Example.org " });
    const [query, vars] = graphqlFetch.mock.calls[0]!;
    expect(query).toContain("mutation SendBriefTestTo(");
    expect(vars).toEqual({ id: "b1", to: "tester@example.org" });
  });

  it("refuses a malformed test address without calling clear-api", async () => {
    stubSession("admin");
    await expect(caller().briefs.sendTest({ id: "b1", to: "not-an-email" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(graphqlFetch).not.toHaveBeenCalled();
  });

  it("pages the list by its cursor", async () => {
    stubSession("admin");
    graphqlFetch.mockResolvedValueOnce({ briefs: [] });
    await caller().briefs.list({ limit: 50, cursor: 100 });
    expect(graphqlFetch.mock.calls[0]![1]).toEqual({ limit: 50, offset: 100 });
  });

  it("turns clear-api's refusal of a sent Brief into BAD_REQUEST with its message", async () => {
    stubSession("admin");
    graphqlFetch.mockRejectedValueOnce(new GraphQLRequestError("Brief already sent", "BAD_USER_INPUT"));
    await expect(caller().briefs.update({ id: "b1", title: "New" })).rejects.toMatchObject({
      code: "BAD_REQUEST",
      message: "Brief already sent",
    });
  });

  it("passes clear-api's NOT_FOUND through", async () => {
    stubSession("admin");
    graphqlFetch.mockRejectedValueOnce(new GraphQLRequestError("Brief not found", "NOT_FOUND"));
    await expect(caller().briefs.addItem({ briefId: "b1", kind: "event", entityId: "gone" })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });
});
