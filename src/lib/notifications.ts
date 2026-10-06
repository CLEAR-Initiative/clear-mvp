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

/** Rows the bell lists, newest first (clear-api already orders them so;
 * re-sorted defensively), capped at BELL_MAX_ROWS. */
export function bellRows<T extends Pick<GqlNotification, "notificationType" | "createdAt">>(rows: readonly T[]): T[] {
  return rows
    .filter((n) => BELL_NOTIFICATION_TYPES.has(n.notificationType))
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
    .slice(0, BELL_MAX_ROWS);
}

export function unreadCount(rows: readonly Pick<GqlNotification, "status">[]): number {
  return rows.filter(isUnread).length;
}

/**
 * A notification's link, only when it is an in-app path: clear-api writes
 * `/event/{id}`, but the column is free text, so anything that is not an
 * absolute path on this origin (`//evil`, `https://…`, `javascript:`) is
 * shown without a link.
 */
export function safeActionPath(actionUrl: string | null | undefined): string | null {
  if (!actionUrl) return null;
  if (!actionUrl.startsWith("/") || actionUrl.startsWith("//") || actionUrl.startsWith("/\\")) return null;
  return actionUrl;
}
