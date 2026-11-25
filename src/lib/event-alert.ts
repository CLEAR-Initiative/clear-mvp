/**
 * Which of an Event's Alerts the event page describes.
 *
 * An Event can be raised into more than one Alert (CONTEXT.md, Detection
 * hierarchy). The page shows one: the live one if there is one. Published
 * beats draft, draft beats archived, and among equals the newest wins.
 */

export type EventAlertStatus = "published" | "draft" | "archived";

export interface EventAlertRef {
  id: string;
  status: string;
  createdAt?: string | null;
}

const STATUS_RANK: Record<EventAlertStatus, number> = {
  published: 0,
  draft: 1,
  archived: 2,
};

export function alertStatus(status: string): EventAlertStatus | null {
  return status in STATUS_RANK ? (status as EventAlertStatus) : null;
}

function rank(alert: EventAlertRef): number {
  const s = alertStatus(alert.status);
  return s === null ? 3 : STATUS_RANK[s];
}

function time(alert: EventAlertRef): number {
  const t = alert.createdAt ? Date.parse(alert.createdAt) : NaN;
  return Number.isNaN(t) ? -Infinity : t;
}

export function primaryAlert(
  alerts: readonly EventAlertRef[] | null | undefined,
): EventAlertRef | null {
  if (!alerts || alerts.length === 0) return null;
  return alerts.reduce((best, a) => {
    const byRank = rank(a) - rank(best);
    if (byRank !== 0) return byRank < 0 ? a : best;
    return time(a) > time(best) ? a : best;
  });
}
