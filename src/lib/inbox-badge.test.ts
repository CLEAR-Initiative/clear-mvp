import { afterEach, describe, expect, it } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { noteProposalDecided, publishInboxUnread, resetInboxUnreadForTests, useInboxUnread } from "./inbox-badge";

describe("inbox unread badge", () => {
  afterEach(() => {
    resetInboxUnreadForTests();
    window.localStorage.clear();
  });

  it("publishes the unread count to the nav and keeps it after the Inbox unmounts", () => {
    const { result, unmount } = renderHook(() => useInboxUnread());
    expect(result.current).toBeNull();
    act(() => publishInboxUnread(4));
    expect(result.current).toBe(4);
    unmount();
    const again = renderHook(() => useInboxUnread());
    expect(again.result.current).toBe(4);
  });

  it("drops one undecided proposed signal decided from the Event page, and skips a group already opened", () => {
    act(() => publishInboxUnread(3));
    act(() => noteProposalDecided(false));
    const { result } = renderHook(() => useInboxUnread());
    expect(result.current).toBe(2);
    act(() => noteProposalDecided(true));
    expect(result.current).toBe(2);
  });
});
