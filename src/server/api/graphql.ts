import { TRPCError } from "@trpc/server";
import { GRAPHQL_URL } from "~/server/env";

interface GraphQLResponse<T> {
  data: T;
  errors?: Array<{ message: string }>;
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
    throw new Error(msg);
  }

  return json.data;
}
