import { StrictMode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useTrackEventOpened } from "./use-once-per-view";

describe("useTrackEventOpened", () => {
  afterEach(() => {
    delete window.umami;
  });
  it("fires once per open, even in strict mode and across re-renders", () => {
    const send = vi.fn();
    window.umami = { track: send, identify: vi.fn() };
    const { rerender } = renderHook(({ id }: { id: string | null }) => useTrackEventOpened(id, "map"), {
      initialProps: { id: "cmabcdefghijklmnopqrst" as string | null },
      wrapper: StrictMode,
    });
    rerender({ id: "cmabcdefghijklmnopqrst" });
    expect(send).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledWith("event.opened", { from: "map" });
    rerender({ id: "cmzyxwvutsrqponmlkjih" });
    expect(send).toHaveBeenCalledTimes(2);
    rerender({ id: null }); // drawer closed
    rerender({ id: "cmzyxwvutsrqponmlkjih" });
    expect(send).toHaveBeenCalledTimes(3);
  });
});
