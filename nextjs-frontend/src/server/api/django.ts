/**
 * Helper to call Django API from tRPC procedures.
 */

const DJANGO_API_URL =
  process.env.DJANGO_API_URL ?? "http://localhost:8000";

/** Default timeout for standard API calls (10 seconds) */
const DEFAULT_TIMEOUT_MS = 10_000;

/** Extended timeout for LLM queries (60 seconds) */
export const LLM_TIMEOUT_MS = 60_000;

/**
 * Build a query string from a record of params.
 * Skips undefined/null values. Converts arrays to repeated keys.
 */
export function buildQueryString(
  params: Record<string, string | number | boolean | string[] | undefined | null>,
): string {
  const parts: string[] = [];
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue;
    if (Array.isArray(value)) {
      for (const v of value) {
        parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(v)}`);
      }
    } else {
      parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
    }
  }
  return parts.length > 0 ? `?${parts.join("&")}` : "";
}

interface DjangoFetchOptions extends RequestInit {
  /** Timeout in milliseconds. Defaults to 10 000 ms. */
  timeoutMs?: number;
}

export async function djangoFetch<T = unknown>(
  path: string,
  options?: DjangoFetchOptions,
): Promise<T> {
  const { timeoutMs = DEFAULT_TIMEOUT_MS, ...fetchOptions } = options ?? {};

  const url = `${DJANGO_API_URL}${path}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        ...fetchOptions.headers,
      },
    });

    if (!res.ok) {
      throw new Error(`Django API error: ${res.status} ${res.statusText}`);
    }

    return res.json() as Promise<T>;
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new Error(`Django API timeout after ${timeoutMs}ms: ${path}`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}
