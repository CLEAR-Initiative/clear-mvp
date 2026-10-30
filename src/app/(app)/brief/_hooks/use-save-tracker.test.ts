import { describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { createOrderedSaver } from "~/lib/brief/ordered-saver";
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

  it("settles false when the editor's failure cleanup runs inside the tracked work", async () => {
    const { result } = renderHook(() => useSaveTracker());
    let fail!: (e: Error) => void;
    act(() => {
      result.current.setDirty("note:i1", false);
      const write = new Promise<void>((_, reject) => (fail = reject)).catch((err: unknown) => {
        result.current.setDirty("note:i1", true);
        throw err;
      });
      void result.current.track(write).catch(() => undefined);
    });
    const settled = result.current.settled();
    await act(async () => fail(new Error("no")));
    await expect(settled).resolves.toBe(false);
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

  it("saveAll is false while an editor's last save failed, true once a retry lands", async () => {
    const { result } = renderHook(() => useSaveTracker());
    let attempt = 0;
    const saver = createOrderedSaver<string, void>({
      initial: "",
      same: (a, b) => a === b,
      save: () => (++attempt === 1 ? Promise.reject(new Error("refused")) : Promise.resolve()),
      track: (work) => result.current.track(work),
      setDirty: (dirty) => result.current.setDirty("note:i1", dirty),
    });
    act(() => {
      result.current.registerFlush("note:i1", saver.flush);
      saver.set("Watch Tawila");
    });
    let ok = true;
    await act(async () => {
      ok = await result.current.saveAll();
    });
    expect(ok).toBe(false);
    await act(async () => {
      ok = await result.current.saveAll();
    });
    expect(ok).toBe(true);
    expect(attempt).toBe(2);
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
