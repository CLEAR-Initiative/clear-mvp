/**
 * Usage-analytics opt-out, kept in a first-party cookie (like the timezone
 * preference) so it survives sign-out, which clears localStorage. It is
 * per browser: clear-api has no user field for it yet.
 */

export const ANALYTICS_OPT_OUT_COOKIE = "clear_analytics_opt_out";
const ONE_YEAR = 60 * 60 * 24 * 365;

export const OPT_OUT_CHANGE_EVENT = "clear-analytics-opt-out-change";

export function parseOptOutCookie(cookieHeader: string): boolean {
  return cookieHeader
    .split(";")
    .some((part) => part.trim() === `${ANALYTICS_OPT_OUT_COOKIE}=1`);
}

export function readOptOut(): boolean {
  if (typeof document === "undefined") return false;
  return parseOptOutCookie(document.cookie);
}

export function writeOptOut(optedOut: boolean): void {
  document.cookie = optedOut
    ? `${ANALYTICS_OPT_OUT_COOKIE}=1; path=/; max-age=${ONE_YEAR}; samesite=lax`
    : `${ANALYTICS_OPT_OUT_COOKIE}=; path=/; max-age=0; samesite=lax`;
  window.dispatchEvent(new Event(OPT_OUT_CHANGE_EVENT));
}
