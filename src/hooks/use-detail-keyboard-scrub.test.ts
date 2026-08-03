import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import {
  DETAIL_SCRUB_HOLD_DETECT_MS,
  DETAIL_SCRUB_SETTLE_MS,
  useDetailKeyboardScrub,
} from "~/hooks/use-detail-keyboard-scrub";

function keydown(key: "ArrowLeft" | "ArrowRight", repeat = false) {
  window.dispatchEvent(
    new KeyboardEvent("keydown", { key, repeat, bubbles: true }),
  );
}

function keyup(key: "ArrowLeft" | "ArrowRight") {
  window.dispatchEvent(new KeyboardEvent("keyup", { key, bubbles: true }));
}

describe("useDetailKeyboardScrub", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it("commits a single tap on keyup (no intermediate fetch trail)", () => {
    const onCommit = vi.fn();
    const { result, unmount } = renderHook(() =>
      useDetailKeyboardScrub({
        ids: ["a", "b", "c", "d"],
        committedId: "a",
        onCommit,
      }),
    );

    act(() => {
      keydown("ArrowRight", false);
    });
    expect(result.current.scrubId).toBe("b");
    expect(onCommit).not.toHaveBeenCalled();

    act(() => {
      keyup("ArrowRight");
    });

    expect(onCommit).toHaveBeenCalledTimes(1);
    expect(onCommit).toHaveBeenCalledWith("b");
    unmount();
  });

  it("does not commit the first step of a hold — only the settled id", () => {
    const onCommit = vi.fn();
    const { result, unmount } = renderHook(() =>
      useDetailKeyboardScrub({
        ids: ["a", "b", "c", "d", "e"],
        committedId: "a",
        onCommit,
      }),
    );

    act(() => {
      keydown("ArrowRight", false);
      // OS key-repeat arrives before hold-detect window → scrub mode.
      vi.advanceTimersByTime(DETAIL_SCRUB_HOLD_DETECT_MS - 1);
      keydown("ArrowRight", true);
      keydown("ArrowRight", true);
      keydown("ArrowRight", true);
    });

    expect(result.current.scrubId).toBe("e");
    expect(onCommit).not.toHaveBeenCalled();

    act(() => {
      keyup("ArrowRight");
    });

    expect(onCommit).toHaveBeenCalledTimes(1);
    expect(onCommit).toHaveBeenCalledWith("e");
    unmount();
  });

  it("commits on idle debounce if keyup never fires after a hold", () => {
    const onCommit = vi.fn();
    const { result, unmount } = renderHook(() =>
      useDetailKeyboardScrub({
        ids: ["a", "b", "c"],
        committedId: "a",
        onCommit,
      }),
    );

    act(() => {
      keydown("ArrowRight", false);
      vi.advanceTimersByTime(DETAIL_SCRUB_HOLD_DETECT_MS - 1);
      keydown("ArrowRight", true);
    });
    expect(result.current.scrubId).toBe("c");
    expect(onCommit).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(DETAIL_SCRUB_SETTLE_MS);
    });

    expect(onCommit).toHaveBeenCalledTimes(1);
    expect(onCommit).toHaveBeenCalledWith("c");
    unmount();
  });

  it("commits a slow single tap via hold-detect if keyup is delayed", () => {
    const onCommit = vi.fn();
    const { result, unmount } = renderHook(() =>
      useDetailKeyboardScrub({
        ids: ["a", "b", "c"],
        committedId: "a",
        onCommit,
      }),
    );

    act(() => {
      keydown("ArrowRight", false);
    });
    expect(onCommit).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(DETAIL_SCRUB_HOLD_DETECT_MS);
    });

    expect(result.current.scrubId).toBe("b");
    expect(onCommit).toHaveBeenCalledTimes(1);
    expect(onCommit).toHaveBeenCalledWith("b");
    unmount();
  });
});
