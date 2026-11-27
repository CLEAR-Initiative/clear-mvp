import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import { NuqsTestingAdapter } from "nuqs/adapters/testing";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
  useFormatter: () => ({ number: String }),
}));

vi.mock("../layers/registry", async () => ({
  LAYERS: {
    signals: { Legend: (await import("../layers/detections/legend")).DetectionsLegend },
  },
  isLayerId: (id: string) => id === "signals",
}));

vi.mock("./zoom", () => ({ ZoomControl: () => null }));
vi.mock("./ask-ai", () => ({ AskAiButton: () => null }));

const { MapControls } = await import("./index");

const realMatchMedia = window.matchMedia;

afterEach(() => {
  cleanup();
  window.matchMedia = realMatchMedia;
});

describe("MapControls", () => {
  it("on a phone, opening the basemap sheet closes the legend sheet", () => {
    render(
      <MantineProvider>
        <NuqsTestingAdapter searchParams={{ layers: JSON.stringify([{ id: "signals", visibility: true, opacity: 1 }]) }}>
          <MapControls selection={null} />
        </NuqsTestingAdapter>
      </MantineProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "controls.legend" }));
    const legendSheet = screen.getByRole("region", { name: "controls.legend" });
    expect(legendSheet).not.toHaveAttribute("inert");

    const basemapButton = screen.getByRole("button", { name: "button" });
    fireEvent.click(basemapButton);
    expect(legendSheet).toHaveAttribute("inert");
    const dialog = screen.getByRole("dialog", { name: "title" });
    expect(dialog).not.toHaveAttribute("inert");

    fireEvent.click(document.querySelector("[data-map-sheet-backdrop]")!);
    expect(dialog).toHaveAttribute("inert");
    expect(basemapButton).toHaveFocus();
    expect(legendSheet).toHaveAttribute("inert");
  });

  it("on a wide screen, opening the basemap popover closes the legend", () => {
    window.matchMedia = (query: string) => ({ ...realMatchMedia(query), matches: true });
    render(
      <MantineProvider>
        <NuqsTestingAdapter searchParams={{ layers: JSON.stringify([{ id: "signals", visibility: true, opacity: 1 }]) }}>
          <MapControls selection={null} />
        </NuqsTestingAdapter>
      </MantineProvider>,
    );
    expect(screen.getByRole("region", { name: "controls.legend" })).toBeInTheDocument();

    const basemapButton = screen.getByRole("button", { name: "button" });
    fireEvent.click(basemapButton);
    expect(basemapButton).toHaveAttribute("aria-expanded", "true");
    expect(screen.queryByRole("region", { name: "controls.legend" })).not.toBeInTheDocument();
  });
});
