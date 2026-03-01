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

/**
 * Extract the Cookie header from incoming request headers
 * so it can be forwarded to Django (preserving the user's session).
 */
export function extractCookieHeader(headers: Headers): Record<string, string> {
  const cookie = headers.get("cookie");
  return cookie ? { Cookie: cookie } : {};
}

/**
 * Extract the CSRF token from the csrftoken cookie so it can be
 * sent as the X-CSRFToken header on Django POST/PUT/DELETE requests.
 */
export function extractCsrfToken(headers: Headers): Record<string, string> {
  const cookie = headers.get("cookie") ?? "";
  const match = cookie.match(/csrftoken=([^;]+)/);
  return match ? { "X-CSRFToken": match[1] } : {};
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
      redirect: "manual" as RequestRedirect,
      headers: {
        "Content-Type": "application/json",
        ...fetchOptions.headers,
      },
    });

    if (!res.ok) {
      const contentType = res.headers.get("content-type");
      let errorDetail = `${res.status} ${res.statusText}`;

      if (res.status === 302) {
        const location = res.headers.get("location") ?? "";
        errorDetail += ` (redirect to ${location})`;
      } else {
        // Try to get more details from the response (skip for 302 - no body)
        if (contentType?.includes("application/json")) {
          try {
            const errorData = await res.json();
            errorDetail += `: ${JSON.stringify(errorData)}`;
          } catch {
            // Failed to parse error JSON, use status text
          }
        } else if (contentType?.includes("text/html")) {
          const html = await res.text();
          const titleMatch = html.match(/<title>(.*?)<\/title>/i);
          if (titleMatch) {
            errorDetail += `: ${titleMatch[1]}`;
          } else {
            errorDetail += " (HTML error page returned)";
          }
        }
      }

      throw new Error(`Django API error [${path}]: ${errorDetail}`);
    }

    // Check if response is actually JSON before parsing
    const contentType = res.headers.get("content-type");
    if (!contentType?.includes("application/json")) {
      throw new Error(
        `Django API returned non-JSON response [${path}]: Content-Type is ${contentType}. ` +
          `This endpoint may not exist or is misconfigured on the Django backend.`
      );
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
