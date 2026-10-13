import { afterEach, describe, expect, it } from "vitest";
import { act, renderHook } from "@testing-library/react";
import {
  inboxBadgeCount,
  noteProposalDecided,
  publishInboxUnread,
  resetInboxUnreadForTests,
  settleInboxUnread,
  useInboxUnread,
} from "./inbox-badge";

describe("inbox unread badge", () => {
  afterEach(() => {
    resetInboxUnreadForTests();
    window.localStorage.clear();
  });

  it("publishes the unread count to the nav and keeps it after the Inbox unmounts", () => {
    const { result, unmount } = renderHook(() => useInboxUnread(4));
    expect(result.current).toBeNull();
    act(() => publishInboxUnread(4, 4));
    expect(result.current).toBe(4);
    unmount();
    const again = renderHook(() => useInboxUnread(4));
    expect(again.result.current).toBe(4);
  });

  it("moves with the server total after the reader has left the Inbox", () => {
    act(() => publishInboxUnread(2, 5));
    expect(inboxBadgeCount(5)).toBe(2);
    expect(inboxBadgeCount(6)).toBe(3);
    expect(inboxBadgeCount(4)).toBe(1);
  });

  it("drops one undecided proposed signal decided from the Event page, and skips a group already opened", () => {
    act(() => publishInboxUnread(3, 5));
    act(() => noteProposalDecided(false));
    expect(inboxBadgeCount(5)).toBe(2);
    act(() => noteProposalDecided(true));
    expect(inboxBadgeCount(5)).toBe(2);
  });

  it("does not drop a decision twice when the server total catches up", () => {
    act(() => publishInboxUnread(3, 5));
    act(() => noteProposalDecided(false));
    expect(inboxBadgeCount(4)).toBe(2);
    act(() => noteProposalDecided(true));
    expect(inboxBadgeCount(3)).toBe(2);
  });

  it("counts a proposal that arrives after a decision has landed in the server total", () => {
    act(() => publishInboxUnread(2, 5));
    act(() => noteProposalDecided(true));
    expect(inboxBadgeCount(4)).toBe(2);
    act(() => settleInboxUnread(4));
    expect(inboxBadgeCount(5)).toBe(3);
  });
});
