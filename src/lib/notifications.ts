import type { GqlNotification } from "~/lib/types/graphql";

/**
 * The notifications bell's view of clear-api's rows (ADR-0010, V2): only
 * Task outcomes for now, newest first, capped so the menu stays a menu.
 */

/** The notification types the bell shows. */
export const BELL_NOTIFICATION_TYPES: ReadonlySet<string> = new Set(["task"]);

export const BELL_MAX_ROWS = 20;

export function isUnread(n: Pick<GqlNotification, "status">): boolean {
  return n.status !== "READ";
}

function isBellType(n: Pick<GqlNotification, "notificationType">): boolean {
  return BELL_NOTIFICATION_TYPES.has(n.notificationType);
}

/** Rows the bell lists, newest first (clear-api already orders them so;
 * re-sorted defensively), capped at BELL_MAX_ROWS. */
export function bellRows<T extends Pick<GqlNotification, "notificationType" | "createdAt">>(rows: readonly T[]): T[] {
  return rows
    .filter(isBellType)
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
    .slice(0, BELL_MAX_ROWS);
}

export function unreadCount(rows: readonly Pick<GqlNotification, "status">[]): number {
  return rows.filter(isUnread).length;
}

/** The bell's unread count: every unread row of a type it shows, not only
 * the BELL_MAX_ROWS it lists, so the badge does not stop at the cap. */
export function bellUnreadCount(rows: readonly Pick<GqlNotification, "notificationType" | "status">[]): number {
  return unreadCount(rows.filter(isBellType));
}

/**
 * A notification's link, only when it is an in-app path: clear-api writes
 * `/event/{id}`, but the column is free text, so anything that is not an
 * absolute path on this origin (`//evil`, `https://…`, `javascript:`) is
 * shown without a link. Resolved the way a browser would, not prefix-
 * matched: the URL parser drops tabs and newlines and reads `\` as `/`, so
 * `/\t/evil` is `//evil` by the time it navigates.
 */
const SENTINEL_ORIGIN = "https://clear-mvp.invalid";

export function safeActionPath(actionUrl: string | null | undefined): string | null {
  if (!actionUrl?.startsWith("/")) return null;
  let url: URL;
  try {
    url = new URL(actionUrl, SENTINEL_ORIGIN);
  } catch {
    return null;
  }
  if (url.origin !== SENTINEL_ORIGIN) return null;
  return `${url.pathname}${url.search}${url.hash}`;
}
