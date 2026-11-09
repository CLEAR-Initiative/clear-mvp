import { StrictMode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useTrackEventOpened } from "./use-once-per-view";
import { clearPendingEvents, flushPendingEvents, track } from "./track";

describe("useTrackEventOpened", () => {
  afterEach(() => {
    delete window.umami;
    delete window.__clearAnalyticsOff;
    clearPendingEvents();
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

  it("counts A -> B -> A as three opens", () => {
    const send = vi.fn();
    window.umami = { track: send, identify: vi.fn() };
    const a = "cmabcdefghijklmnopqrst";
    const b = "cmzyxwvutsrqponmlkjih";
    const { rerender } = renderHook(({ id }: { id: string }) => useTrackEventOpened(id, "detection"), {
      initialProps: { id: a },
    });
    rerender({ id: b });
    rerender({ id: a });
    expect(send).toHaveBeenCalledTimes(3);
  });
});

describe("events sent before the tracker loads", () => {
  afterEach(() => {
    delete window.umami;
    delete window.__clearAnalyticsOff;
    clearPendingEvents();
  });
  it("are held and sent once it is ready", () => {
    track("event.opened", { from: "email" });
    const send = vi.fn();
    window.umami = { track: send, identify: vi.fn() };
    flushPendingEvents();
    flushPendingEvents();
    expect(send).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledWith("event.opened", { from: "email" });
  });
  it("are dropped when tracking is off", () => {
    track("event.opened", { from: "email" });
    clearPendingEvents();
    window.__clearAnalyticsOff = true;
    track("event.opened", { from: "map" });
    const send = vi.fn();
    window.umami = { track: send, identify: vi.fn() };
    flushPendingEvents();
    expect(send).not.toHaveBeenCalled();
  });
});
