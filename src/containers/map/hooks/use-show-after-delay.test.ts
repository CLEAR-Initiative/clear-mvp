import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useShowAfterDelay } from "./use-show-after-delay";

describe("useShowAfterDelay", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("stays hidden for a load shorter than the delay", () => {
    const { result, rerender } = renderHook(({ active }) => useShowAfterDelay(active, 300), {
      initialProps: { active: true },
    });
    act(() => vi.advanceTimersByTime(299));
    rerender({ active: false });
    act(() => vi.advanceTimersByTime(10));

    expect(result.current).toBe(false);
  });

  it("hides at once when loading stops and waits the full delay on the next load", () => {
    const { result, rerender } = renderHook(({ active }) => useShowAfterDelay(active, 300), {
      initialProps: { active: true },
    });
    act(() => vi.advanceTimersByTime(300));
    expect(result.current).toBe(true);

    rerender({ active: false });
    expect(result.current).toBe(false);

    rerender({ active: true });
    expect(result.current).toBe(false);
    act(() => vi.advanceTimersByTime(300));
    expect(result.current).toBe(true);
  });
});
