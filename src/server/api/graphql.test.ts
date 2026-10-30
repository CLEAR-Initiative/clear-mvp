import { afterEach, describe, expect, it, vi } from "vitest";
import { TRPCError } from "@trpc/server";
import { GraphQLRequestError, graphqlFetch } from "./graphql";

function respond(body: string, status = 200): Response {
  return new Response(body, { status, headers: { "Content-Type": status === 200 ? "application/json" : "text/html" } });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("graphqlFetch", () => {
  it("returns the data field of an OK envelope", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => respond(JSON.stringify({ data: { locations: [] } }))));
    await expect(graphqlFetch("query { locations { id } }")).resolves.toEqual({ locations: [] });
  });

  it("fails a non-OK response whose body is HTML", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => respond("<html><body>502 Bad Gateway</body></html>", 502)));
    await expect(graphqlFetch("query { locations { id } }")).rejects.toBeInstanceOf(GraphQLRequestError);
    await expect(graphqlFetch("query { locations { id } }")).rejects.toThrow("GraphQL request failed (502)");
  });

  it("fails a non-OK response even when the body includes data", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => respond(JSON.stringify({ data: { locations: [] } }), 502)),
    );
    await expect(graphqlFetch("query { locations { id } }")).rejects.toThrow("GraphQL request failed (502)");
  });

  it("fails an OK response that has no data field", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => respond("{}")));
    await expect(graphqlFetch("query { locations { id } }")).rejects.toThrow("GraphQL response missing data");
  });

  it("still surfaces a GraphQL error message, including auth failures", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        respond(JSON.stringify({ errors: [{ message: "must be logged in", extensions: { code: "UNAUTHENTICATED" } }] }), 401),
      ),
    );
    await expect(graphqlFetch("query { locations { id } }")).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
    await expect(graphqlFetch("query { locations { id } }")).rejects.toBeInstanceOf(TRPCError);
  });
});
