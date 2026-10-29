/**
 * When the usage tracker (self-hosted Umami) may load, and what a page view
 * may carry. Pure, so the rules are unit-tested without a browser.
 */

import { isPlatformAdmin } from "~/lib/roles";

/** Feature flag (clear-api `featureFlags`) that switches usage analytics on. */
export const USAGE_ANALYTICS_FLAG = "usage_analytics";

export interface UmamiConfig {
  /** Umami base URL, e.g. https://app.clearinitiative.io/ux */
  hostUrl: string;
  websiteId: string;
  /** Tracker script URL. Defaults to `${hostUrl}/script.js`. */
  scriptSrc: string;
}

export function readUmamiConfig(
  env: { hostUrl?: string; websiteId?: string; scriptSrc?: string } = {
    hostUrl: process.env.NEXT_PUBLIC_UMAMI_HOST_URL,
    websiteId: process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID,
    scriptSrc: process.env.NEXT_PUBLIC_UMAMI_SRC,
  },
): UmamiConfig | null {
  const hostUrl = env.hostUrl?.trim().replace(/\/+$/, "");
  const websiteId = env.websiteId?.trim();
  if (!hostUrl || !websiteId) return null;
  return { hostUrl, websiteId, scriptSrc: env.scriptSrc?.trim() || `${hostUrl}/script.js` };
}

/**
 * Paths that may carry the tracker: the signed-in app and `/welcome`. Pre-login
 * pages (`/auth/*`, `/accept-invite`, `/verify-email`, `/`) carry tokens in the
 * URL and never load it.
 */
const PRE_LOGIN_PREFIXES = ["/auth", "/accept-invite", "/verify-email", "/api"];

export function isTrackablePath(pathname: string): boolean {
  if (pathname === "/" || pathname === "") return false;
  return !PRE_LOGIN_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export interface TrackerGateInput {
  config: UmamiConfig | null;
  /** `true` only once the flag is read and on; loading or unknown is off. */
  flagEnabled: boolean;
  authenticated: boolean;
  globalRole: string | null | undefined;
  optedOut: boolean;
  pathname: string;
}

export function shouldLoadTracker(input: TrackerGateInput): boolean {
  return (
    input.config !== null &&
    input.flagEnabled &&
    input.authenticated &&
    !isPlatformAdmin(input.globalRole) &&
    !input.optedOut &&
    isTrackablePath(input.pathname)
  );
}

/** Query parameters a page view keeps. Everything else is dropped. */
export const KEPT_QUERY_PARAMS = ["tab", "from"] as const;

/**
 * Strip a page-view URL (path + query, as Umami sends it) down to its path
 * plus the kept parameters. Drops hashes. Values of kept params are kept as
 * is: they are fixed tab / source names, not free text.
 */
export function sanitizePageUrl(url: string): string {
  const parsed = new URL(url, "http://x");
  const kept = new URLSearchParams();
  for (const key of KEPT_QUERY_PARAMS) {
    const value = parsed.searchParams.get(key);
    if (value !== null) kept.set(key, value);
  }
  const query = kept.toString();
  return query ? `${parsed.pathname}?${query}` : parsed.pathname;
}

/** A referrer keeps only its origin: other sites' paths are not ours to log. */
export function sanitizeReferrer(referrer: string | undefined): string {
  if (!referrer) return "";
  try {
    return new URL(referrer).origin;
  } catch {
    return "";
  }
}
