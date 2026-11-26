import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import { NuqsTestingAdapter, type UrlUpdateEvent } from "nuqs/adapters/testing";
import { usePanelSelection } from "../use-panel-selection";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

const MOCK_IDS = ["alerts", "events", "signals", "roads"];
vi.mock("~/containers/map/layers/registry", () => ({
  LAYERS: Object.fromEntries(MOCK_IDS.map((id) => [id, {}])),
  isLayerId: (id: string) => MOCK_IDS.includes(id),
}));

const { CrisisLayer } = await import("./crisis-layer");

afterEach(() => {
  cleanup();
});

type Layer = { id: string; visibility: boolean; opacity: number };
const layer = (id: string, visibility = true): Layer => ({ id, visibility, opacity: 1 });

function Harness({ onLevelChange }: { onLevelChange: () => void }) {
  const { clear } = usePanelSelection();
  return (
    <CrisisLayer
      onLevelChange={() => {
        onLevelChange();
        clear();
      }}
    />
  );
}

function renderSection(searchParams: Record<string, string>) {
  const onUrlUpdate = vi.fn<(event: UrlUpdateEvent) => void>();
  const onLevelChange = vi.fn();
  render(
    <MantineProvider>
      <NuqsTestingAdapter searchParams={searchParams} onUrlUpdate={onUrlUpdate}>
        <Harness onLevelChange={onLevelChange} />
      </NuqsTestingAdapter>
    </MantineProvider>,
  );
  const lastParams = () => onUrlUpdate.mock.calls.at(-1)?.[0].searchParams;
  const lastLayers = (): Layer[] => JSON.parse(lastParams()?.get("layers") ?? "null") as Layer[];
  return { onUrlUpdate, onLevelChange, lastParams, lastLayers };
}

async function pick(option: string) {
  fireEvent.click(screen.getByPlaceholderText("panel.crisisLayer.placeholder"));
  fireEvent.click(await screen.findByRole("option", { name: option }));
}

const detectionIds = (layers: Layer[]) => layers.map((item) => item.id).filter((id) => id !== "roads");

describe("CrisisLayer", () => {
  it("swaps the detection layer, keeps other layers and clears the selection", async () => {
    const { onUrlUpdate, onLevelChange, lastParams, lastLayers } = renderSection({
      layers: JSON.stringify([layer("alerts"), layer("roads")]),
      detail: "alert:a1",
      stack: "alert:10,20",
    });

    await pick("layers.events.title");

    await waitFor(() => expect(onUrlUpdate).toHaveBeenCalled());
    await waitFor(() => expect(lastParams()?.has("detail")).toBe(false));
    expect(lastLayers()).toEqual([layer("events"), layer("roads")]);
    expect(lastParams()?.has("stack")).toBe(false);
    expect(onLevelChange).toHaveBeenCalledTimes(1);
  });

  it("removes every detection layer from a hand-edited URL with two", async () => {
    const { onUrlUpdate, lastLayers } = renderSection({
      layers: JSON.stringify([layer("alerts"), layer("signals")]),
    });

    await pick("layers.events.title");

    await waitFor(() => expect(onUrlUpdate).toHaveBeenCalled());
    expect(detectionIds(lastLayers())).toEqual(["events"]);
  });

  it("clears the level with ×", async () => {
    const { onUrlUpdate, lastLayers } = renderSection({ layers: JSON.stringify([layer("alerts")]) });

    fireEvent.click(screen.getByRole("button", { name: "panel.crisisLayer.clear" }));

    await waitFor(() => expect(onUrlUpdate).toHaveBeenCalled());
    expect(lastLayers()).toEqual([]);
    expect(screen.getByPlaceholderText("panel.crisisLayer.placeholder")).toHaveValue("");
  });

  it("hides and shows the detection layer with the Disasters toggle", async () => {
    const { onUrlUpdate, lastLayers } = renderSection({ layers: JSON.stringify([layer("alerts")]) });

    fireEvent.click(screen.getByRole("switch", { name: "panel.crisisLayer.showDisasters" }));
    await waitFor(() => expect(onUrlUpdate).toHaveBeenCalled());
    expect(lastLayers()).toEqual([layer("alerts", false)]);
  });

  it("shows the new level when one is picked while the layer is hidden", async () => {
    const { onUrlUpdate, lastLayers } = renderSection({ layers: JSON.stringify([layer("alerts", false)]) });

    await pick("layers.events.title");

    await waitFor(() => expect(onUrlUpdate).toHaveBeenCalled());
    expect(lastLayers()).toEqual([layer("events")]);
  });

  it("adds alerts when the toggle turns on with no level", async () => {
    const { onUrlUpdate, lastLayers } = renderSection({ layers: JSON.stringify([]) });

    fireEvent.click(screen.getByRole("switch", { name: "panel.crisisLayer.showDisasters" }));

    await waitFor(() => expect(onUrlUpdate).toHaveBeenCalled());
    expect(detectionIds(lastLayers())).toEqual(["alerts"]);
  });
});
