import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const listeners = new Map<string, () => void>();
let removed = false;
const fakeMap = {
  getLayer: vi.fn(() => {
    // A removed Mapbox map has no style: reading a layer throws, as it does in the browser.
    if (removed) throw new TypeError("Cannot read properties of undefined (reading 'getOwnLayer')");
    return {};
  }),
  setPaintProperty: vi.fn(),
  once: vi.fn((event: string, listener: () => void) => listeners.set(event, listener)),
  off: vi.fn(),
};

vi.mock("react-map-gl/mapbox", () => ({ useMap: () => ({ current: { getMap: () => fakeMap } }) }));

const { blinkOpacity, useSelectionBlink } = await import("./use-selection-blink");

describe("blinkOpacity", () => {
  it("holds the ring solid for the first half second", () => {
    expect(blinkOpacity(0)).toBe(1);
    expect(blinkOpacity(499)).toBe(1);
  });

  it("fades the ring to 5% by one second, then brings it back by 1.5 s", () => {
    expect(blinkOpacity(750)).toBeLessThan(1);
    expect(blinkOpacity(750)).toBeGreaterThan(0.05);
    expect(blinkOpacity(1000)).toBeCloseTo(0.05);
    expect(blinkOpacity(1499)).toBeCloseTo(1, 1);
  });

  it("repeats every 1.5 s", () => {
    expect(blinkOpacity(1500 + 750)).toBeCloseTo(blinkOpacity(750));
  });
});

describe("useSelectionBlink", () => {
  it("restores the ring's opacity when it stops", () => {
    removed = false;
    const { unmount } = renderHook(() => useSelectionBlink("signals-selected", 0.8, true));

    unmount();

    expect(fakeMap.setPaintProperty).toHaveBeenLastCalledWith("signals-selected", "circle-stroke-opacity", 0.8);
  });

  it("leaves a removed map alone when the page is left with a signal selected", () => {
    removed = false;
    const { unmount } = renderHook(() => useSelectionBlink("signals-selected", 1, true));
    fakeMap.setPaintProperty.mockClear();

    // Leaving the page removes the map first, then cleans up the effect.
    removed = true;
    listeners.get("remove")?.();

    expect(() => unmount()).not.toThrow();
    expect(fakeMap.setPaintProperty).not.toHaveBeenCalled();
  });
});
