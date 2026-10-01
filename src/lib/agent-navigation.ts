/**
 * Agent navigation, client side: the exact view to return to on Back.
 *
 * A view is the URL plus the filter state the Map and Detection keep in
 * sessionStorage (their nav contexts). Back restores both, so the page comes
 * back with the filters it had, not just the address.
 */

/** sessionStorage keys that hold a page's filter state. */
export const NAV_CONTEXT_KEYS = ["map-nav-context", "detection-nav-context", "detection-filters"] as const;

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
  label: string;
}

/**
 * The only places Agent navigation may send the user: an entity page or the
 * Map/Detection with a query. Never another origin (`//host`, `/\host`).
 */
const NAVIGABLE_URL = /^\/(?:(?:event|signal|crisis)\/[A-Za-z0-9_%-]+|(?:map|detection)(?:\?[^#\\]*)?)$/;

export function isNavigateResult(value: unknown): value is NavigateResult {
  const v = value as Partial<NavigateResult> | null;
  return !!v && v.moved === true && typeof v.url === "string" && NAVIGABLE_URL.test(v.url);
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
