/** Where sign-in lands when `callbackUrl` is missing or refused. */
export const DEFAULT_CALLBACK_URL = "/dashboard";

// Never fetched. It is only the base that a relative path is resolved against.
const BASE = "http://callback.invalid";

/**
 * Returns the page to open after sign-in.
 *
 * `callbackUrl` comes from the query string, so anyone can write it. Accept
 * only a path on this origin: it starts with one `/`, and it still does after
 * the URL parser has resolved it. The parser is the same one a browser uses,
 * so it catches the forms a prefix check misses: `/\host`, `/<tab>/host`
 * and `/.//host` all resolve to another host. The query and hash are kept.
 */
export function safeCallbackUrl(raw: string | null | undefined): string {
  if (!raw?.startsWith("/") || raw.startsWith("//")) return DEFAULT_CALLBACK_URL;

  let url: URL;
  try {
    url = new URL(raw, BASE);
  } catch {
    return DEFAULT_CALLBACK_URL;
  }
  if (url.origin !== BASE) return DEFAULT_CALLBACK_URL;

  const path = url.pathname + url.search + url.hash;
  if (path.startsWith("//")) return DEFAULT_CALLBACK_URL;
  return path;
}
