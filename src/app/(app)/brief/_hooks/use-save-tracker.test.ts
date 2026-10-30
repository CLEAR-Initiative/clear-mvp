import { describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useSaveTracker } from "./use-save-tracker";

describe("useSaveTracker", () => {
  it("settles true once every write succeeded", async () => {
    const { result } = renderHook(() => useSaveTracker());
    let finish!: () => void;
    act(() => {
      void result.current.track(new Promise<void>((r) => (finish = r)));
    });
    expect(result.current.status).toBe("saving");
    const settled = result.current.settled();
    await act(async () => finish());
    await expect(settled).resolves.toBe(true);
    expect(result.current.status).toBe("saved");
  });

  it("settles false while a failed text or note save leaves its editor unsaved", async () => {
    const { result } = renderHook(() => useSaveTracker());
    await act(async () => {
      await result.current
        .track(Promise.reject(new Error("no")))
        .catch(() => result.current.setDirty("text", true));
    });
    await expect(result.current.settled()).resolves.toBe(false);
  });

  it("doesn't block on a refused item change, which is rolled back to what clear-api holds", async () => {
    const { result } = renderHook(() => useSaveTracker());
    await act(async () => {
      await result.current.track(Promise.reject(new Error("no"))).catch(() => {});
    });
    expect(result.current.status).toBe("error");
    await expect(result.current.settled()).resolves.toBe(true);
  });

  it("waits for a save queued behind another before settling", async () => {
    const { result } = renderHook(() => useSaveTracker());
    let first!: () => void;
    let second!: () => void;
    const one = new Promise<void>((r) => (first = r));
    act(() => {
      void result.current.track(one);
      void result.current.track(one.then(() => new Promise<void>((r) => (second = r))));
    });
    let done = false;
    const settled = result.current.settled().then((ok) => (done = ok));
    await act(async () => first());
    expect(done).toBe(false);
    await act(async () => second());
    await settled;
    expect(done).toBe(true);
  });

  it("flushes every registered editor", () => {
    const { result } = renderHook(() => useSaveTracker());
    const a = vi.fn();
    const b = vi.fn();
    act(() => {
      result.current.registerFlush("text", a);
      const off = result.current.registerFlush("note:i1", b);
      off();
    });
    act(() => result.current.flushAll());
    expect(a).toHaveBeenCalledTimes(1);
    expect(b).not.toHaveBeenCalled();
  });

  it("settles false and shows saving while an edit is typed but unsent", async () => {
    const { result } = renderHook(() => useSaveTracker());
    act(() => result.current.setDirty("note:i1", true));
    expect(result.current.status).toBe("saving");
    expect(result.current.hasUnsaved()).toBe(true);
    await expect(result.current.settled()).resolves.toBe(false);
    act(() => result.current.setDirty("note:i1", false));
    await expect(result.current.settled()).resolves.toBe(true);
  });
});
