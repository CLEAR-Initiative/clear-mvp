/**
 * Agent navigation, client side: the exact view to return to on Back.
 *
 * A view is the URL plus the filter state the Map and Detection keep in
 * sessionStorage (their nav contexts). Back restores both, so the page comes
 * back with the filters it had, not just the address.
 */

/** sessionStorage keys that hold a page's filter state. */
export const NAV_CONTEXT_KEYS = [
  "map-nav-context",
  "detection-nav-context",
  "detection-filters",
  "detection-link-filters",
] as const;

export type NavSnapshot = Record<string, string | null>;

export function snapshotNavContexts(): NavSnapshot {
  const snapshot: NavSnapshot = {};
  for (const key of NAV_CONTEXT_KEYS) {
    try {
      snapshot[key] = sessionStorage.getItem(key);
    } catch {
      snapshot[key] = null;
    }
  }
  return snapshot;
}

export function restoreNavContexts(snapshot: NavSnapshot): void {
  for (const key of NAV_CONTEXT_KEYS) {
    try {
      const value = snapshot[key];
      if (value === null || value === undefined) sessionStorage.removeItem(key);
      else sessionStorage.setItem(key, value);
    } catch {
      /* private mode */
    }
  }
}

/** One Agent navigation the user can undo. */
export interface BackEntry {
  /** The navigate tool call that made the move. */
  toolCallId: string;
  /** Where the user was: path, query and hash. */
  url: string;
  snapshot: NavSnapshot;
}

/** The client's copy of the navigate tool's result (see navigate-tool.ts). */
export interface NavigateResult {
  moved: true;
  target: { kind: string; id?: string };
  url: string;
  content: { label: string };
}

/**
 * The only places Agent navigation may send the user: an entity page (by an
 * id-shaped id, as navigate accepts) or the Map/Detection with a query.
 * Never another origin (`//host`, `/\host`).
 */
const NAVIGABLE_URL = /^\/(?:(?:event|signal|crisis)\/[A-Za-z0-9_-]{1,128}|(?:map|detection)(?:\?[^#\\]*)?)$/;

export function isNavigateResult(value: unknown): value is NavigateResult {
  const v = value as Partial<NavigateResult> | null;
  return (
    !!v &&
    v.moved === true &&
    typeof v.url === "string" &&
    NAVIGABLE_URL.test(v.url) &&
    typeof v.content?.label === "string"
  );
}

/** Every navigate tool call already in some messages (restored history). */
export function navigateCallIds(messages: ReadonlyArray<{ parts: ReadonlyArray<unknown> }>): string[] {
  const ids: string[] = [];
  for (const message of messages) {
    for (const part of message.parts as Array<{ type?: string; toolCallId?: string }>) {
      if (part.type === "tool-navigate" && part.toolCallId) ids.push(part.toolCallId);
    }
  }
  return ids;
}

// ── Fresh moves vs revisits ─────────────────────────────────────────────────

const PENDING_DEEP_LINK_KEY = "agent-deep-link-pending";
/** How long a marked move waits for its page. */
const PENDING_DEEP_LINK_TTL_MS = 30_000;
/** Fired on window when the Agent moves the user to a deep link. */
export const AGENT_DEEP_LINK_EVENT = "clear:agent-deep-link";

/** Same path and the same query parameters, in any order. */
export function sameHref(a: string, b: string): boolean {
  try {
    const x = new URL(a, "http://app.local");
    const y = new URL(b, "http://app.local");
    if (x.pathname !== y.pathname) return false;
    const entries = (u: URL) => [...u.searchParams.entries()].map(([k, v]) => `${k}=${v}`).sort().join("&");
    return entries(x) === entries(y);
  } catch {
    return false;
  }
}

/**
 * Mark a move the Agent is about to make, so the page it lands on applies
 * the deep link as new (resetting what picking it by hand would) instead of
 * treating the URL as a revisit (Back, a reload, a detail page and back),
 * where the page restores the state it had.
 */
export function markAgentDeepLink(url: string): void {
  try {
    sessionStorage.setItem(PENDING_DEEP_LINK_KEY, JSON.stringify({ url, at: Date.now() }));
  } catch {
    /* private mode */
  }
  window.dispatchEvent(new CustomEvent(AGENT_DEEP_LINK_EVENT, { detail: { url } }));
}

/** Whether `href` is a move the Agent just made (consumed: true at most once). */
export function takeAgentDeepLink(href: string): boolean {
  try {
    const raw = sessionStorage.getItem(PENDING_DEEP_LINK_KEY);
    if (!raw) return false;
    const { url, at } = JSON.parse(raw) as { url?: unknown; at?: unknown };
    if (typeof url !== "string" || typeof at !== "number" || Date.now() - at > PENDING_DEEP_LINK_TTL_MS) {
      sessionStorage.removeItem(PENDING_DEEP_LINK_KEY);
      return false;
    }
    if (!sameHref(url, href)) return false;
    sessionStorage.removeItem(PENDING_DEEP_LINK_KEY);
    return true;
  } catch {
    return false;
  }
}
