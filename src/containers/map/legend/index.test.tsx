import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import { NuqsTestingAdapter, type UrlUpdateEvent } from "nuqs/adapters/testing";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
  useFormatter: () => ({ number: String }),
}));

const mapState = vi.hoisted(() => ({ zoom: 3 }));

vi.mock("react-map-gl/mapbox", () => {
  const map = { getZoom: () => mapState.zoom, on: vi.fn(), off: vi.fn() };
  return { useMap: () => ({ current: { getZoom: map.getZoom, getMap: () => map } }) };
});

vi.mock("../layers/registry", async () => ({
  LAYERS: { signals: { Legend: (await import("../layers/signals/legend")).SignalsLegend } },
  isLayerId: (id: string) => id === "signals",
}));

const { Legend } = await import("./index");

afterEach(() => {
  cleanup();
  mapState.zoom = 3;
});

describe("Legend", () => {
  it("keeps a hidden layer listed so it can be shown again", async () => {
    const onUrlUpdate = vi.fn<(event: UrlUpdateEvent) => void>();
    render(
      <MantineProvider>
        <NuqsTestingAdapter
          searchParams={{ layers: JSON.stringify([{ id: "signals", visibility: false, opacity: 1 }]) }}
          onUrlUpdate={onUrlUpdate}
        >
          <Legend />
        </NuqsTestingAdapter>
      </MantineProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "controls.legend" }));
    expect(screen.getByText("mapV2.layers.signals.severity")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "showLayer" }));
    await waitFor(() => expect(onUrlUpdate).toHaveBeenCalled());
    const layers = JSON.parse(onUrlUpdate.mock.calls.at(-1)?.[0].searchParams.get("layers") ?? "null");
    expect(layers).toEqual([{ id: "signals", visibility: true, opacity: 1 }]);
  });

  it("closes only the opacity popover on Escape from its button", async () => {
    render(
      <MantineProvider>
        <NuqsTestingAdapter searchParams={{ layers: JSON.stringify([{ id: "signals", visibility: true, opacity: 1 }]) }}>
          <Legend />
        </NuqsTestingAdapter>
      </MantineProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "controls.legend" }));
    const opacityButton = screen.getByRole("button", { name: "opacity" });
    fireEvent.click(opacityButton);
    expect(await screen.findByRole("slider")).toBeInTheDocument();

    fireEvent.keyDown(opacityButton, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("slider")).not.toBeInTheDocument());
    expect(screen.getByText("mapV2.layers.signals.severity")).toBeInTheDocument();
  });

  it("switches the density display in ?layers and writes nothing for the default", async () => {
    const onUrlUpdate = vi.fn<(event: UrlUpdateEvent) => void>();
    const lastLayers = () => JSON.parse(onUrlUpdate.mock.calls.at(-1)?.[0].searchParams.get("layers") ?? "null");
    render(
      <MantineProvider>
        <NuqsTestingAdapter
          searchParams={{ layers: JSON.stringify([{ id: "signals", visibility: true, opacity: 1 }]) }}
          onUrlUpdate={onUrlUpdate}
        >
          <Legend />
        </NuqsTestingAdapter>
      </MantineProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "controls.legend" }));
    expect(screen.getByText("mapV2.layers.signals.fewerSignals")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("radio", { name: "mapV2.layers.signals.heatmap" }));
    await waitFor(() =>
      expect(lastLayers()).toEqual([{ id: "signals", visibility: true, opacity: 1, settings: { density: "heatmap" } }]),
    );
    expect(screen.getByText("mapV2.layers.signals.high")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("radio", { name: "mapV2.layers.signals.clusters" }));
    await waitFor(() => expect(lastLayers()).toStrictEqual([{ id: "signals", visibility: true, opacity: 1 }]));
  });

  it("shows the cluster scale in Heatmap once the map is zoomed in to the clusters", () => {
    mapState.zoom = 6;
    render(
      <MantineProvider>
        <NuqsTestingAdapter
          searchParams={{
            layers: JSON.stringify([{ id: "signals", visibility: true, opacity: 1, settings: { density: "heatmap" } }]),
          }}
        >
          <Legend />
        </NuqsTestingAdapter>
      </MantineProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "controls.legend" }));
    expect(screen.getByRole("radio", { name: "mapV2.layers.signals.heatmap" })).toBeChecked();
    expect(screen.getByText("mapV2.layers.signals.fewerSignals")).toBeInTheDocument();
    expect(screen.queryByText("mapV2.layers.signals.high")).not.toBeInTheDocument();
  });
});
