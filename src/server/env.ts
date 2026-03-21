/**
 * Centralized server-side environment variables.
 * All server code should import from here instead of reading process.env directly.
 */

const isProd = process.env.NODE_ENV === "production";

function requireInProd(name: string, fallback: string): string {
  const value = process.env[name];
  if (value) return value;
  if (isProd) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return fallback;
}

/** Apollo API base URL (auth proxy, BFF) */
export const API_URL = requireInProd("API_URL", "http://localhost:4000");

/** GraphQL endpoint — defaults to API_URL/graphql if not explicitly set */
export const GRAPHQL_URL =
  process.env.GRAPHQL_URL ??
  `${API_URL}/graphql`;

/** API key for server-to-server GraphQL calls */
export const GRAPHQL_API_KEY = process.env.GRAPHQL_API_KEY ?? "";
