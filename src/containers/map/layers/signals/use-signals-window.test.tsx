import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { signalsWindow, useSignalsWindow } from "./use-signals-window";

const LATE_EVENING = new Date(2026, 10, 17, 23, 59, 0);
const AFTER_MIDNIGHT = new Date(2026, 10, 18, 0, 0, 1);

function becomeVisible() {
  act(() => {
    document.dispatchEvent(new Event("visibilitychange"));
  });
}

describe("useSignalsWindow", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(LATE_EVENING);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("moves the window forward at local midnight in a tab left open", () => {
    const { result } = renderHook(() => useSignalsWindow());
    expect(result.current).toEqual(signalsWindow(LATE_EVENING));

    act(() => {
      vi.advanceTimersByTime(61_000);
    });

    expect(result.current).toEqual(signalsWindow(AFTER_MIDNIGHT));
  });

  it("moves the window forward when the tab becomes visible after sleeping past midnight", () => {
    const { result } = renderHook(() => useSignalsWindow());

    vi.setSystemTime(AFTER_MIDNIGHT);
    becomeVisible();

    expect(result.current).toEqual(signalsWindow(AFTER_MIDNIGHT));
  });

  it("keeps the same range object when the tab becomes visible on the same day", () => {
    const { result } = renderHook(() => useSignalsWindow());
    const before = result.current;

    vi.setSystemTime(new Date(2026, 10, 17, 23, 59, 30));
    becomeVisible();

    expect(result.current).toBe(before);
  });
});
