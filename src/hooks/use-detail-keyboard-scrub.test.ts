import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import {
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

  it("commits immediately on a single keydown (not repeat)", () => {
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
    expect(onCommit).toHaveBeenCalledTimes(1);
    expect(onCommit).toHaveBeenCalledWith("b");
    unmount();
  });

  it("advances scrub chrome on key-repeat without committing until keyup", () => {
    const onCommit = vi.fn();
    const { result, rerender, unmount } = renderHook(
      ({ committedId }: { committedId: string }) =>
        useDetailKeyboardScrub({
          ids: ["a", "b", "c", "d", "e"],
          committedId,
          onCommit,
        }),
      { initialProps: { committedId: "a" } },
    );

    act(() => {
      keydown("ArrowRight", false);
    });
    expect(onCommit).toHaveBeenCalledWith("b");
    onCommit.mockClear();
    rerender({ committedId: "b" });

    act(() => {
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

  it("commits on idle debounce if keyup never fires", () => {
    const onCommit = vi.fn();
    const { result, rerender, unmount } = renderHook(
      ({ committedId }: { committedId: string }) =>
        useDetailKeyboardScrub({
          ids: ["a", "b", "c"],
          committedId,
          onCommit,
        }),
      { initialProps: { committedId: "a" } },
    );

    act(() => {
      keydown("ArrowRight", false);
    });
    onCommit.mockClear();
    rerender({ committedId: "b" });

    act(() => {
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
});
