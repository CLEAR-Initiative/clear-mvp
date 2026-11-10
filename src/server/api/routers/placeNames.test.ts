import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The unresolved place-name router: the queue reads every page clear-api
 * holds, a clear-api without the schema reads as empty, and a resolution
 * sends exactly the field its kind takes. graphqlFetch and the auth session
 * fetch are mocked.
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

const rows = (from: number, count: number) => Array.from({ length: count }, (_, i) => ({ id: `pn-${from + i}` }));
const page = (items: { id: string }[], totalCount: number, hasMore: boolean) => ({
  unresolvedPlaceNames: { items, totalCount, hasMore },
});

beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () =>
      new Response(
        JSON.stringify({
          session: { id: "s", userId: "u", expiresAt: "2099-01-01" },
          user: { id: "u", name: "Ana", email: "a@b.c", role: "admin" },
        }),
      ),
    ),
  );
});

afterEach(() => {
  graphqlFetch.mockReset();
  vi.unstubAllGlobals();
});

describe("placeNames.queue", () => {
  it("reads one page when clear-api has no more", async () => {
    graphqlFetch.mockResolvedValueOnce(page(rows(0, 3), 3, false));
    const result = await caller().placeNames.queue();
    expect(result).toEqual({ items: rows(0, 3), totalCount: 3 });
    expect(graphqlFetch).toHaveBeenCalledTimes(1);
    const [query, variables] = graphqlFetch.mock.calls[0] as [string, Record<string, unknown>];
    expect(query).toContain("unresolvedPlaceNames(status: OPEN, first: $first, offset: $offset)");
    expect(variables).toEqual({ first: 200, offset: 0 });
  });

  it("reads every page, so a name below the first 200 is listed and searchable", async () => {
    graphqlFetch
      .mockResolvedValueOnce(page(rows(0, 200), 450, true))
      // A row recorded mid-read shifts the pages: pn-199 comes back once more.
      .mockResolvedValueOnce(page([{ id: "pn-199" }, ...rows(200, 199)], 450, true))
      .mockResolvedValueOnce(page(rows(399, 51), 450, false));
    const result = await caller().placeNames.queue();
    expect(result.items).toHaveLength(450);
    expect(new Set(result.items.map((r) => r.id)).size).toBe(450);
    expect(result.totalCount).toBe(450);
    expect(graphqlFetch.mock.calls.map((c) => (c[1] as { offset: number }).offset)).toEqual([0, 200, 400]);
  });

  it("stops at the read limit and reports the full count, so the Inbox can say the list is cut", async () => {
    graphqlFetch.mockImplementation(async (_q: string, v: { offset: number }) => page(rows(v.offset, 200), 5000, true));
    const result = await caller().placeNames.queue();
    expect(graphqlFetch).toHaveBeenCalledTimes(10);
    expect(result.items).toHaveLength(2000);
    expect(result.totalCount).toBe(5000);
  });

  it("reads as empty against a clear-api without the queue", async () => {
    graphqlFetch.mockRejectedValue(new Error('Cannot query field "unresolvedPlaceNames" on type "Query".'));
    expect(await caller().placeNames.queue()).toEqual({ items: [], totalCount: 0 });
    expect(await caller().placeNames.queueCount()).toEqual({ count: 0 });
    expect(await caller().placeNames.suggestions({ name: "Kamo", countryCode: "SD" })).toEqual([]);
  });

  it("counts the open rows for the nav badge", async () => {
    graphqlFetch.mockResolvedValueOnce({ unresolvedPlaceNames: { totalCount: 12 } });
    expect(await caller().placeNames.queueCount()).toEqual({ count: 12 });
  });
});

describe("placeNames.suggestions", () => {
  it("passes the name, the Arabic spelling, the country and the area", async () => {
    graphqlFetch.mockResolvedValueOnce({ placeNameSuggestions: [{ kind: "GEONAMES", geonamesId: 7 }] });
    const result = await caller().placeNames.suggestions({
      name: " Um Dabakir ",
      nameAr: "أم دباكر",
      countryCode: "SD",
      withinLocationId: "S1",
    });
    expect(result).toEqual([{ kind: "GEONAMES", geonamesId: 7 }]);
    expect(graphqlFetch.mock.calls[0]![1]).toEqual({
      name: "Um Dabakir",
      nameAr: "أم دباكر",
      countryCode: "SD",
      withinLocationId: "S1",
    });
  });
});

describe("placeNames.resolve", () => {
  const resolved = { resolveUnresolvedPlaceName: { id: "pn-1", status: "RESOLVED", signalsMoved: 4 } };

  it("sends each kind with its own field, and returns how many signals moved", async () => {
    graphqlFetch.mockResolvedValue(resolved);
    const api = caller().placeNames;
    expect(await api.resolve({ id: "pn-1", resolution: { kind: "LOCATION", locationId: "L1" }, note: " Known " })).toEqual(
      resolved.resolveUnresolvedPlaceName,
    );
    expect(graphqlFetch.mock.calls[0]![1]).toEqual({
      id: "pn-1",
      resolution: { kind: "LOCATION", locationId: "L1", geonamesId: undefined, point: undefined },
      note: "Known",
    });
    await api.resolve({ id: "pn-1", resolution: { kind: "POINT", point: { lat: 11, lng: 29, name: " " } } });
    expect((graphqlFetch.mock.calls[1]![1] as { resolution: unknown }).resolution).toMatchObject({
      kind: "POINT",
      point: { lat: 11, lng: 29, name: undefined },
    });
    await api.resolve({ id: "pn-1", resolution: { kind: "NOT_A_PLACE" } });
    expect((graphqlFetch.mock.calls[2]![1] as { resolution: unknown }).resolution).toMatchObject({ kind: "NOT_A_PLACE" });
  });

  it("refuses a kind without its field, or with another kind's", async () => {
    const api = caller().placeNames;
    for (const resolution of [
      { kind: "LOCATION" as const },
      { kind: "GEONAMES" as const, locationId: "L1" },
      { kind: "AMBIGUOUS" as const, geonamesId: 7 },
      { kind: "POINT" as const, point: { lat: 91, lng: 0 } },
    ]) {
      await expect(api.resolve({ id: "pn-1", resolution })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    }
    expect(graphqlFetch).not.toHaveBeenCalled();
  });

  it("passes clear-api's refusal on with its code", async () => {
    for (const [code, trpc] of [["FORBIDDEN", "FORBIDDEN"], ["CONFLICT", "CONFLICT"], ["BAD_USER_INPUT", "BAD_REQUEST"], ["NOT_FOUND", "NOT_FOUND"]]) {
      graphqlFetch.mockRejectedValueOnce(new GraphQLRequestError("refused", code!));
      await expect(caller().placeNames.resolve({ id: "pn-1", resolution: { kind: "AMBIGUOUS" } })).rejects.toMatchObject({
        code: trpc,
      });
    }
  });
});

describe("placeNames aliases", () => {
  const item = { id: "a1", nameDisplay: "Um Dabakir", canEdit: true };

  it("lists a page and hands on clear-api's cursor while there is more", async () => {
    graphqlFetch.mockResolvedValueOnce({ placeAliases: { items: [item], totalCount: 120, hasMore: true, endCursor: "a1" } });
    expect(await caller().placeNames.aliases({ search: " kadugli ", source: "MANUAL" })).toEqual({
      items: [item],
      totalCount: 120,
      nextCursor: "a1",
    });
    expect(graphqlFetch.mock.calls[0]![1]).toEqual({ search: "kadugli", source: "MANUAL", first: 50, after: undefined });

    graphqlFetch.mockResolvedValueOnce({ placeAliases: { items: [item], totalCount: 120, hasMore: false, endCursor: null } });
    expect((await caller().placeNames.aliases({ cursor: "a1" })).nextCursor).toBeNull();
    expect(graphqlFetch.mock.calls[1]![1]).toMatchObject({ after: "a1" });
  });

  it("reads as empty against a clear-api without the alias list", async () => {
    graphqlFetch.mockRejectedValue(new Error('Cannot query field "placeAliases" on type "Query".'));
    expect(await caller().placeNames.aliases()).toEqual({ items: [], totalCount: 0, nextCursor: null });
    expect(await caller().placeNames.aliasScopes()).toEqual([]);
  });

  it("builds the countries and states for the form", async () => {
    graphqlFetch.mockResolvedValueOnce({
      pipelineCountries: [{ name: "Sudan", pcode: "SD" }],
      countries: [{ id: "C1", name: "Sudan", pCode: null }],
      states: [{ id: "S1", name: "South Kordofan", parent: { id: "C1" } }],
    });
    expect(await caller().placeNames.aliasScopes()).toEqual([
      { countryCode: "SD", name: "Sudan", countryLocationId: "C1", states: [{ id: "S1", name: "South Kordofan" }] },
    ]);
  });

  it("creates an alias with one target, and refuses none or two", async () => {
    graphqlFetch.mockResolvedValue({ createPlaceAlias: item });
    const api = caller().placeNames;
    const base = { name: " Um Dabakir ", countryCode: "SD", scopeLocationId: "S1" };
    expect(await api.createAlias({ ...base, nameAr: " ", locationId: "D1", note: " " })).toEqual(item);
    expect(graphqlFetch.mock.calls[0]![1]).toEqual({
      input: { name: "Um Dabakir", nameAr: undefined, countryCode: "SD", scopeLocationId: "S1", locationId: "D1", note: undefined, point: undefined },
    });
    await api.createAlias({ ...base, scopeLocationId: null, point: { lat: 11, lng: 29, name: "Um Dabakir" } });
    expect((graphqlFetch.mock.calls[1]![1] as { input: unknown }).input).toMatchObject({
      scopeLocationId: null,
      point: { lat: 11, lng: 29, name: "Um Dabakir" },
    });
    graphqlFetch.mockClear();
    await expect(api.createAlias(base)).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(api.createAlias({ ...base, locationId: "D1", point: { lat: 1, lng: 1 } })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(graphqlFetch).not.toHaveBeenCalled();
  });

  it("sends only the fields the reader changed; a null scope means the whole country", async () => {
    graphqlFetch.mockResolvedValue({ updatePlaceAlias: item });
    const api = caller().placeNames;
    await api.updateAlias({ id: "a1", change: { note: " Checked " } });
    expect(graphqlFetch.mock.calls[0]![1]).toEqual({ id: "a1", input: { note: "Checked" } });
    await api.updateAlias({ id: "a1", change: { scopeLocationId: null } });
    expect(graphqlFetch.mock.calls[1]![1]).toEqual({ id: "a1", input: { scopeLocationId: null } });
    await api.updateAlias({ id: "a1", change: { locationId: "D2", note: "" } });
    expect(graphqlFetch.mock.calls[2]![1]).toEqual({ id: "a1", input: { locationId: "D2", note: null } });
    graphqlFetch.mockClear();
    await expect(api.updateAlias({ id: "a1", change: {} })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(
      api.updateAlias({ id: "a1", change: { locationId: "D1", point: { lat: 1, lng: 1 } } }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(graphqlFetch).not.toHaveBeenCalled();
  });

  it("deletes an alias, and passes a refusal on with its code", async () => {
    graphqlFetch.mockResolvedValueOnce({ deletePlaceAlias: true });
    expect(await caller().placeNames.deleteAlias({ id: "a1" })).toEqual({ deleted: true });
    graphqlFetch.mockRejectedValueOnce(new GraphQLRequestError("refused", "FORBIDDEN"));
    await expect(caller().placeNames.deleteAlias({ id: "a1" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
