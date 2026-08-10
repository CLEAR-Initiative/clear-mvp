import { describe, expect, it, vi } from "vitest";
import {
  IDLE_SPIN_FULL_ZOOM,
  IDLE_SPIN_START_ZOOM,
  ensureGlobeProjection,
  idleSpinSpeedFactor,
  startIdleGlobeSpin,
  type IdleGlobeSpinMap,
} from "./idle-globe-spin";

describe("idleSpinSpeedFactor", () => {
  it("is 0 at country zoom and 1 at max zoom-out", () => {
    expect(idleSpinSpeedFactor(IDLE_SPIN_START_ZOOM)).toBe(0);
    expect(idleSpinSpeedFactor(5)).toBe(0);
    expect(idleSpinSpeedFactor(IDLE_SPIN_FULL_ZOOM)).toBe(1);
    expect(idleSpinSpeedFactor(0.5)).toBe(1);
  });

  it("ramps smoothly between start and full", () => {
    const mid = idleSpinSpeedFactor(
      (IDLE_SPIN_START_ZOOM + IDLE_SPIN_FULL_ZOOM) / 2,
    );
    expect(mid).toBeGreaterThan(0);
    expect(mid).toBeLessThan(1);
    expect(mid).toBeCloseTo(0.5, 5);
  });
});

describe("ensureGlobeProjection", () => {
  it("sets globe once and is a no-op when already globe", () => {
    let name = "mercator";
    const setProjection = vi.fn((p: string) => {
      name = p;
    });
    const map: IdleGlobeSpinMap = {
      getZoom: () => 2,
      getCenter: () => ({ lng: 0, lat: 0 }),
      getProjection: () => ({ name }),
      setProjection,
    };
    ensureGlobeProjection(map);
    ensureGlobeProjection(map);
    expect(setProjection).toHaveBeenCalledTimes(1);
    expect(setProjection).toHaveBeenCalledWith("globe");
  });
});

describe("startIdleGlobeSpin", () => {
  it("enables globe once, nudges longitude when zoomed out, does not flip to mercator", () => {
    vi.useFakeTimers({ toFake: ["requestAnimationFrame"] });
    let lng = 30;
    let zoom = 1.2;
    let proj = "mercator";
    const jumpTo = vi.fn((opts: { center: [number, number] }) => {
      lng = opts.center[0];
    });
    const setProjection = vi.fn((p: string) => {
      proj = p;
    });
    const handlers = new Map<string, Set<(...args: unknown[]) => void>>();
    const map: IdleGlobeSpinMap = {
      getZoom: () => zoom,
      getCenter: () => ({ lng, lat: 12 }),
      getBearing: () => 0,
      getPitch: () => 0,
      getProjection: () => ({ name: proj }),
      setProjection,
      jumpTo,
      on: (type, handler) => {
        if (!handlers.has(type)) handlers.set(type, new Set());
        handlers.get(type)!.add(handler);
      },
      off: (type, handler) => {
        handlers.get(type)?.delete(handler);
      },
    };

    const dispose = startIdleGlobeSpin(map);
    expect(setProjection).toHaveBeenCalledWith("globe");
    const projCalls = setProjection.mock.calls.length;

    // First frame arms lastTs; second applies delta.
    vi.advanceTimersToNextFrame();
    vi.advanceTimersToNextFrame();
    expect(jumpTo).toHaveBeenCalled();
    expect(lng).not.toBe(30);

    // Zoom into country band — spin stops, projection must stay globe.
    zoom = 5.5;
    vi.advanceTimersToNextFrame();
    vi.advanceTimersToNextFrame();
    expect(setProjection.mock.calls.length).toBe(projCalls);
    expect(proj).toBe("globe");

    dispose();
    const calls = jumpTo.mock.calls.length;
    vi.advanceTimersToNextFrame();
    expect(jumpTo.mock.calls.length).toBe(calls);
    // Dispose must not reset to mercator (that caused the hard jump).
    expect(setProjection).not.toHaveBeenCalledWith("mercator");

    vi.useRealTimers();
  });

  it("does not spin when zoomed into country band", () => {
    vi.useFakeTimers({ toFake: ["requestAnimationFrame"] });
    const jumpTo = vi.fn();
    const setProjection = vi.fn();
    const map: IdleGlobeSpinMap = {
      getZoom: () => 5.5,
      getCenter: () => ({ lng: 30, lat: 12 }),
      getBearing: () => 0,
      getPitch: () => 0,
      getProjection: () => ({ name: "mercator" }),
      setProjection,
      jumpTo,
      on: () => undefined,
      off: () => undefined,
    };
    const dispose = startIdleGlobeSpin(map);
    expect(setProjection).toHaveBeenCalledWith("globe");
    vi.advanceTimersToNextFrame();
    vi.advanceTimersToNextFrame();
    expect(jumpTo).not.toHaveBeenCalled();
    dispose();
    vi.useRealTimers();
  });
});
