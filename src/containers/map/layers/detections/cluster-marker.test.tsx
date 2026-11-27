import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ClusterMarker } from "./clusters";

const flyTo = vi.fn();

vi.mock("next-intl", () => ({ useTranslations: () => (key: string) => key }));
vi.mock("react-map-gl/mapbox", () => ({
  Marker: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useMap: () => ({ current: { flyTo } }),
}));

const { DetectionClusterMarker } = await import("./cluster-marker");

const cluster = (stacked: boolean): ClusterMarker => ({
  key: "1",
  clusterId: 1,
  count: 3,
  coordinates: [30, 15],
  expansionZoom: stacked ? 23 : 8,
  stacked,
  severity: { critical: 1, high: 2, medium: 0, low: 0, unknown: 0 },
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("DetectionClusterMarker", () => {
  it("selects a stacked cluster instead of zooming", () => {
    const onSelectStack = vi.fn();
    render(<DetectionClusterMarker layerId="signals" cluster={cluster(true)} opacity={1} selected={false} onSelectStack={onSelectStack} />);

    fireEvent.click(screen.getByRole("button", { name: "stacked" }));

    expect(onSelectStack).toHaveBeenCalledWith(cluster(true));
    expect(flyTo).not.toHaveBeenCalled();
  });

  it("zooms into a cluster that can still split", () => {
    const onSelectStack = vi.fn();
    render(<DetectionClusterMarker layerId="signals" cluster={cluster(false)} opacity={1} selected={false} onSelectStack={onSelectStack} />);

    fireEvent.click(screen.getByRole("button", { name: "zoom" }));

    expect(flyTo).toHaveBeenCalledWith({ center: [30, 15], zoom: 8 });
    expect(onSelectStack).not.toHaveBeenCalled();
  });

  it("marks the selected stack", () => {
    render(<DetectionClusterMarker layerId="signals" cluster={cluster(true)} opacity={1} selected onSelectStack={vi.fn()} />);

    const button = screen.getByRole("button", { name: "stacked" });
    expect(button).toHaveAttribute("aria-pressed", "true");
    expect(button).toHaveAttribute("data-selected", "true");
  });

  it("draws the cluster as a severity donut", () => {
    render(<DetectionClusterMarker layerId="signals" cluster={cluster(false)} opacity={1} selected={false} onSelectStack={vi.fn()} />);
    const ring = screen.getByRole("button", { name: "zoom" }).querySelector<HTMLElement>(".map-v2-cluster-ring");
    expect(ring?.style.background).toContain("conic-gradient");
  });
});
