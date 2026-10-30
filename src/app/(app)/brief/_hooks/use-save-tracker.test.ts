import { describe, expect, it } from "vitest";
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

  it("settles false when a write failed, so a send doesn't go out with older content", async () => {
    const { result } = renderHook(() => useSaveTracker());
    await act(async () => {
      await result.current.track(Promise.reject(new Error("no"))).catch(() => {});
    });
    await expect(result.current.settled()).resolves.toBe(false);
    expect(result.current.status).toBe("error");
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
