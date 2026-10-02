import { TRPCError } from "@trpc/server";
import { GRAPHQL_URL } from "~/server/env";

interface GraphQLResponse<T> {
  data: T;
  errors?: Array<{ message: string; extensions?: { code?: unknown } }>;
}

/** A GraphQL error from clear-api, keeping its `extensions.code`. */
export class GraphQLRequestError extends Error {
  constructor(
    message: string,
    /** clear-api's error code, e.g. `FORBIDDEN` or `NOT_FOUND`. */
    readonly code: string | undefined,
  ) {
    super(message);
    this.name = "GraphQLRequestError";
  }
}

const AUTH_ERROR_PATTERNS = [
  "must be logged in",
  "not authenticated",
  "unauthorized",
];

function isAuthError(message: string): boolean {
  const lower = message.toLowerCase();
  return AUTH_ERROR_PATTERNS.some((p) => lower.includes(p));
}

export async function graphqlFetch<T>(
  query: string,
  variables?: Record<string, unknown>,
  headers?: Record<string, string>,
): Promise<T> {
  const res = await fetch(GRAPHQL_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify({ query, variables }),
  });

  const json = (await res.json()) as GraphQLResponse<T>;

  if (json.errors?.length) {
    const msg = json.errors[0]?.message ?? "GraphQL request failed";
    if (isAuthError(msg)) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: msg });
    }
    const code = json.errors[0]?.extensions?.code;
    throw new GraphQLRequestError(msg, typeof code === "string" ? code : undefined);
  }

  return json.data;
}

/** Extract cookie header from tRPC context for authenticated GraphQL calls. */
export function cookieHeaders(ctx: { headers: Headers }): Record<string, string> {
  const cookie = ctx.headers.get("cookie");
  return cookie ? { Cookie: cookie } : {};
}
