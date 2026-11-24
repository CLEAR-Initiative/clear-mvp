import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { DensityDisplay } from "./settings";
import { useSignalTooltip } from "./use-signal-tooltip";

type Listener = (event?: unknown) => void;

const listeners = new Map<string, Listener>();

const fakeMap = {
  getLayer: () => ({}),
  getCanvasContainer: () => ({ addEventListener: vi.fn(), removeEventListener: vi.fn() }),
  queryRenderedFeatures: () => [],
  on: vi.fn((event: string, ...rest: unknown[]) => listeners.set(event, rest[rest.length - 1] as Listener)),
  off: vi.fn(),
};

const mapRef = { getMap: () => fakeMap };

vi.mock("react-map-gl/mapbox", () => ({ useMap: () => ({ current: mapRef }) }));

const hoverEvent = {
  features: [
    {
      geometry: { type: "Point", coordinates: [30, 15] },
      properties: { id: "a", title: "Flood", severity: "high" },
    },
  ],
};

function hover() {
  act(() => listeners.get("mousemove")?.(hoverEvent));
}

describe("useSignalTooltip", () => {
  beforeEach(() => {
    listeners.clear();
  });

  it("closes an open tooltip when the density display changes", () => {
    const { result, rerender } = renderHook(({ density }) => useSignalTooltip("signals", true, density), {
      initialProps: { density: "clusters" as DensityDisplay },
    });
    hover();
    expect(result.current?.id).toBe("a");

    rerender({ density: "heatmap" });

    expect(result.current).toBeNull();
  });
});
