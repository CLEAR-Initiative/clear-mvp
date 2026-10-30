import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Boundary procedures scope the level in clear-api through `within` instead of
 * fetching every row of the level and filtering here. graphqlFetch and the
 * auth session fetch are mocked; the assertions cover the variables sent.
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

function caller() {
  return createCaller({ headers: new Headers({ cookie: "better-auth.session_token=x" }) });
}

const DISTRICT = {
  id: "d1",
  name: "Khartoum North",
  level: 2,
  ancestorIds: ["sd", "krt"],
  parent: { id: "krt", name: "Khartoum" },
  pCode: null,
  geometry: null,
  population: null,
};

function sentVariables() {
  expect(graphqlFetch).toHaveBeenCalledTimes(1);
  const [query, variables] = graphqlFetch.mock.calls[0] as [string, Record<string, unknown>];
  expect(query).toContain("locations(level: $level, within: $within)");
  return variables;
}

describe("locations boundary procedures", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            session: { id: "s", userId: "u", expiresAt: "2099-01-01" },
            user: { id: "u", name: "Ana", email: "a@b.c", role: "analyst" },
          }),
        ),
      ),
    );
    graphqlFetch.mockResolvedValue({ locations: [DISTRICT] });
  });

  afterEach(() => {
    graphqlFetch.mockReset();
    vi.unstubAllGlobals();
  });

  it("scopes a state's districts in clear-api and returns them as-is", async () => {
    const result = await caller().locations.getAdminBoundaries({ level: 2, stateId: "krt" });

    expect(sentVariables()).toEqual({ level: 2, within: ["krt"] });
    expect(result).toEqual([DISTRICT]);
  });

  it("scopes to several countries", async () => {
    await caller().locations.getAdminBoundaries({ level: 1, countryIds: ["sd", "ve"] });

    expect(sentVariables()).toEqual({ level: 1, within: ["sd", "ve"] });
  });

  it("scopes to a single country", async () => {
    await caller().locations.getAdminBoundaries({ level: 2, countryId: "sd" });

    expect(sentVariables()).toEqual({ level: 2, within: ["sd"] });
  });

  it("sends no scope when unscoped", async () => {
    await caller().locations.getAdminBoundaries({ level: 0 });

    expect(sentVariables()).toEqual({ level: 0, within: undefined });
  });

  it("scopes population boundaries to the country", async () => {
    await caller().locations.getPopulationBoundaries({ countryId: "sd" });

    expect(sentVariables()).toEqual({ level: 2, within: ["sd"] });
  });
});
