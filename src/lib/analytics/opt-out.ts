/**
 * Usage-analytics opt-out. The source of truth is the account field
 * (clear-api `User.analyticsOptOut`), so the choice holds in every browser.
 * A first-party cookie mirrors it locally for two reasons:
 *  - the Umami `beforeSend` hook re-reads it on every send, so an opt-out in
 *    one tab stops sending in the user's other open tabs at once;
 *  - it carries the pre-account (per-browser) opt-out forward until it has
 *    been migrated onto the account.
 *
 * Cookie values: `1` = legacy per-browser opt-out, not yet on the account;
 * `2.<ms>` = mirror of an account opt-out, stamped with when it was written
 * (a bare `2` from older builds counts as written at 0). Absent = not opted
 * out locally.
 */

export const ANALYTICS_OPT_OUT_COOKIE = "clear_analytics_opt_out";
const ONE_YEAR = 60 * 60 * 24 * 365;

export const OPT_OUT_CHANGE_EVENT = "clear-analytics-opt-out-change";

export type OptOutCookie = "legacy" | "mirror" | null;

export function parseOptOutCookieValue(cookieHeader: string): OptOutCookie {
  for (const part of cookieHeader.split(";")) {
    const trimmed = part.trim();
    if (trimmed === `${ANALYTICS_OPT_OUT_COOKIE}=1`) return "legacy";
    if (MIRROR_RE.test(trimmed)) return "mirror";
  }
  return null;
}

const MIRROR_RE = new RegExp(`^${ANALYTICS_OPT_OUT_COOKIE}=2(?:\\.(\\d+))?$`);

/** When the mirror cookie was written (ms), or `null` if there is no mirror. */
export function parseMirrorWrittenAt(cookieHeader: string): number | null {
  for (const part of cookieHeader.split(";")) {
    const match = MIRROR_RE.exec(part.trim());
    if (match) return match[1] ? Number(match[1]) : 0;
  }
  return null;
}

export function readMirrorWrittenAt(): number | null {
  if (typeof document === "undefined") return null;
  return parseMirrorWrittenAt(document.cookie);
}

export function parseOptOutCookie(cookieHeader: string): boolean {
  return parseOptOutCookieValue(cookieHeader) !== null;
}

export function readOptOutCookie(): OptOutCookie {
  if (typeof document === "undefined") return null;
  return parseOptOutCookieValue(document.cookie);
}

/** Local opt-out as `beforeSend` sees it: any opt-out cookie stops sending. */
export function readOptOut(): boolean {
  return readOptOutCookie() !== null;
}

/** Write the local mirror of the account value and tell this tab's listeners. */
export function writeOptOutMirror(optedOut: boolean): void {
  document.cookie = optedOut
    ? `${ANALYTICS_OPT_OUT_COOKIE}=2.${Date.now()}; path=/; max-age=${ONE_YEAR}; samesite=lax`
    : `${ANALYTICS_OPT_OUT_COOKIE}=; path=/; max-age=0; samesite=lax`;
  window.dispatchEvent(new Event(OPT_OUT_CHANGE_EVENT));
}

/**
 * Effective opt-out. `account` is `undefined`/`null` until the account value
 * is known, which counts as opted out: the tracker must not load before then.
 */
export function resolveOptOut(cookie: OptOutCookie, account: boolean | null | undefined): boolean {
  return cookie === "legacy" || account !== false;
}

/** What to do once the account value is known, given the local cookie. */
export function syncAction(
  cookie: OptOutCookie,
  account: boolean,
): "migrate" | "mirror-on" | "mirror-off" | "none" {
  if (cookie === "legacy") return account ? "mirror-on" : "migrate";
  if (account && cookie !== "mirror") return "mirror-on";
  if (!account && cookie === "mirror") return "mirror-off";
  return "none";
}

/**
 * How long after a mirror is written an "opted in" account value must have
 * been fetched before it may clear the mirror. Another tab writes the mirror
 * before its save reaches the server, so a fetch soon after can still return
 * the old value.
 */
export const MIRROR_CLEAR_GRACE_MS = 15_000;

/**
 * Whether an account value saying "opted in", fetched at `fetchedAt`, may
 * clear a mirror written at `writtenAt`. Otherwise wait `retryInMs`, then refetch.
 */
export function mirrorClearDecision(
  writtenAt: number,
  fetchedAt: number,
  now: number,
): { clear: true } | { clear: false; retryInMs: number } {
  const safeFrom = writtenAt + MIRROR_CLEAR_GRACE_MS;
  if (fetchedAt >= safeFrom) return { clear: true };
  return { clear: false, retryInMs: Math.max(0, safeFrom - now) };
}
