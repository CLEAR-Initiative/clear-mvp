import { TRPCError } from "@trpc/server";
import { GRAPHQL_URL } from "~/server/env";

interface GraphQLResponse<T> {
  data?: T;
  errors?: Array<{ message: string; extensions?: { code?: unknown; subCode?: unknown } }>;
}

/** A GraphQL error from clear-api, keeping its `extensions.code` (and `subCode`). */
export class GraphQLRequestError extends Error {
  constructor(
    message: string,
    /** clear-api's error code, e.g. `FORBIDDEN` or `NOT_FOUND`. */
    readonly code: string | undefined,
    /** clear-api's finer reason a client branches on, e.g. `DAILY_CAP` or `PENDING_APPROVAL`. */
    readonly subCode: string | undefined = undefined,
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

/** JSON object envelope, or null when the body is empty, HTML, or not an object. */
async function readEnvelope<T>(res: Response): Promise<GraphQLResponse<T> | null> {
  const text = await res.text();
  if (!text.trim()) return null;
  try {
    const parsed: unknown = JSON.parse(text);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    return parsed as GraphQLResponse<T>;
  } catch {
    return null;
  }
}

function throwGraphQLErrors<T>(json: GraphQLResponse<T>): void {
  if (!json.errors?.length) return;
  const msg = json.errors[0]?.message ?? "GraphQL request failed";
  if (isAuthError(msg)) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: msg });
  }
  const code = json.errors[0]?.extensions?.code;
  const subCode = json.errors[0]?.extensions?.subCode;
  throw new GraphQLRequestError(
    msg,
    typeof code === "string" ? code : undefined,
    typeof subCode === "string" ? subCode : undefined,
  );
}

export async function graphqlFetch<T>(
  query: string,
  variables?: Record<string, unknown>,
  headers?: Record<string, string>,
  signal?: AbortSignal,
): Promise<T> {
  const res = await fetch(GRAPHQL_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify({ query, variables }),
    signal,
  });

  const json = await readEnvelope<T>(res);
  if (json) throwGraphQLErrors(json);

  // A 502 HTML page, or a 200 body with no `data` field, is a failed call.
  // An empty payload must not look like a successful empty list.
  if (!res.ok || json == null || !Object.prototype.hasOwnProperty.call(json, "data")) {
    throw new GraphQLRequestError(
      res.ok ? "GraphQL response missing data" : `GraphQL request failed (${res.status})`,
      undefined,
    );
  }

  return json.data as T;
}

/** Extract cookie header from tRPC context for authenticated GraphQL calls. */
export function cookieHeaders(ctx: { headers: Headers }): Record<string, string> {
  const cookie = ctx.headers.get("cookie");
  return cookie ? { Cookie: cookie } : {};
}
