import { useSyncExternalStore } from "react";

/**
 * Unread proposed signals, published by the Inbox once it knows which rows
 * the reader has opened. The nav badge prefers this over the server queue
 * so opening a row drops the number without waiting for the next poll.
 *
 * The measurement is the unread count and the server total at that moment.
 * Later polls move the badge by the difference, so proposals that arrive
 * after the reader leaves the Inbox — and decisions other reviewers make —
 * still change the number. A decision taken on the Event page is counted
 * once (`suppress`) so the refetch of that same decision does not drop it
 * again. Null until the Inbox has measured it this session.
 */
type Measurement = { unread: number; baseline: number; suppress: number };

let measurement: Measurement | null = null;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

export function publishInboxUnread(count: number, serverCount: number) {
  if (
    measurement?.unread === count &&
    measurement.baseline === serverCount &&
    measurement.suppress === 0
  ) {
    return;
  }
  measurement = { unread: count, baseline: serverCount, suppress: 0 };
  emit();
}

/**
 * A proposed signal was decided outside a fresh Inbox measurement (the
 * Event page). An opened group is already out of the unread count; the
 * server total will still fall by one when the refetch lands, and
 * `suppress` keeps that fall from being subtracted twice.
 */
export function noteProposalDecided(alreadyOpened: boolean) {
  if (measurement == null) return;
  measurement = {
    unread: alreadyOpened ? measurement.unread : Math.max(0, measurement.unread - 1),
    baseline: measurement.baseline,
    suppress: measurement.suppress + 1,
  };
  emit();
}

/** Badge number for a server total. Null until the Inbox has measured. */
export function inboxBadgeCount(serverCount: number | undefined): number | null {
  if (measurement == null) return null;
  if (serverCount == null) return measurement.unread;
  let drift = serverCount - measurement.baseline;
  if (drift < 0 && measurement.suppress > 0) {
    drift += Math.min(measurement.suppress, -drift);
  }
  return Math.max(0, measurement.unread + drift);
}

export function resetInboxUnreadForTests() {
  measurement = null;
  emit();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): Measurement | null {
  return measurement;
}

export function useInboxUnread(serverCount: number | undefined): number | null {
  const current = useSyncExternalStore(subscribe, getSnapshot, () => null);
  if (current == null) return null;
  if (serverCount == null) return current.unread;
  let drift = serverCount - current.baseline;
  if (drift < 0 && current.suppress > 0) {
    drift += Math.min(current.suppress, -drift);
  }
  return Math.max(0, current.unread + drift);
}
