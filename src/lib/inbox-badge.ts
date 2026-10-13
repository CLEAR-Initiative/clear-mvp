import { useSyncExternalStore } from "react";

/**
 * Unread proposed signals, published by the Inbox once it knows which rows
 * the reader has opened. The nav badge prefers this over the server count
 * so opening or reviewing a row drops the number without waiting for the
 * next poll. Null until the Inbox has measured it this session; leaving the
 * page keeps the last measurement so the badge does not jump back up.
 */
let unreadProposals: number | null = null;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

export function publishInboxUnread(count: number) {
  if (unreadProposals === count) return;
  unreadProposals = count;
  emit();
}

/** A proposed signal was decided outside a fresh Inbox measurement (the
 * Event page). An opened group is already out of the unread count. */
export function noteProposalDecided(alreadyOpened: boolean) {
  if (unreadProposals == null || alreadyOpened) return;
  publishInboxUnread(Math.max(0, unreadProposals - 1));
}

export function resetInboxUnreadForTests() {
  unreadProposals = null;
  emit();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useInboxUnread(): number | null {
  return useSyncExternalStore(subscribe, () => unreadProposals, () => null);
}
