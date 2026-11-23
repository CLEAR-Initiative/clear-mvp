import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ClusterMarker } from "./clusters";

const flyTo = vi.fn();

vi.mock("next-intl", () => ({ useTranslations: () => (key: string) => key }));
vi.mock("react-map-gl/mapbox", () => ({
  Marker: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useMap: () => ({ current: { flyTo } }),
}));

const { SignalClusterMarker } = await import("./cluster-marker");

const cluster = (stacked: boolean): ClusterMarker => ({
  key: "1",
  clusterId: 1,
  count: 3,
  coordinates: [30, 15],
  expansionZoom: stacked ? 23 : 8,
  stacked,
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("SignalClusterMarker", () => {
  it("selects a stacked cluster instead of zooming", () => {
    const onSelectStack = vi.fn();
    render(<SignalClusterMarker cluster={cluster(true)} opacity={1} selected={false} onSelectStack={onSelectStack} />);

    fireEvent.click(screen.getByRole("button", { name: "stacked" }));

    expect(onSelectStack).toHaveBeenCalledWith(cluster(true));
    expect(flyTo).not.toHaveBeenCalled();
  });

  it("zooms into a cluster that can still split", () => {
    const onSelectStack = vi.fn();
    render(<SignalClusterMarker cluster={cluster(false)} opacity={1} selected={false} onSelectStack={onSelectStack} />);

    fireEvent.click(screen.getByRole("button", { name: "zoom" }));

    expect(flyTo).toHaveBeenCalledWith({ center: [30, 15], zoom: 8 });
    expect(onSelectStack).not.toHaveBeenCalled();
  });

  it("marks the selected stack", () => {
    render(<SignalClusterMarker cluster={cluster(true)} opacity={1} selected onSelectStack={vi.fn()} />);

    const button = screen.getByRole("button", { name: "stacked" });
    expect(button).toHaveAttribute("aria-pressed", "true");
    expect(button).toHaveAttribute("data-selected", "true");
  });
});
