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

const hierarchy = [
  {
    name: "natural hazard",
    groups: [
      { name: "flood", codes: ["fl", "ff"] },
      { name: "drought", codes: ["dr"] },
    ],
  },
  {
    name: "conflict",
    groups: [
      { name: "battles", codes: ["ba", "bg", "bo"] },
      { name: "riots", codes: ["rd", "ri"] },
    ],
  },
];
vi.mock("~/trpc/react", () => ({
  api: {
    alerts: {
      getDisasterTypeHierarchy: {
        useQuery: () => ({ data: hierarchy, isPending: false, isError: false, error: null }),
      },
    },
  },
}));

const { CrisisLayer } = await import("./crisis-layer");

// jsdom has no scrollIntoView, and the open Combobox dropdown calls it.
Element.prototype.scrollIntoView = () => undefined;

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
      onFilterChange={clear}
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

  it("moves focus to the level input after ×", async () => {
    renderSection({ layers: JSON.stringify([layer("alerts")]) });

    fireEvent.click(screen.getByRole("button", { name: "panel.crisisLayer.clear" }));

    const input = screen.getByPlaceholderText("panel.crisisLayer.placeholder");
    await waitFor(() => expect(input).toHaveFocus());
    expect(screen.queryByRole("option")).not.toBeInTheDocument();
  });

  it("removes the detection layer and its count with the Disasters toggle", async () => {
    const { onUrlUpdate, lastLayers } = renderSection({ layers: JSON.stringify([layer("alerts"), layer("roads")]) });
    expect(screen.getByText("panel.crisisLayer.activeCount")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("switch", { name: "panel.crisisLayer.showDisasters" }));

    await waitFor(() => expect(onUrlUpdate).toHaveBeenCalled());
    expect(lastLayers()).toEqual([layer("roads")]);
    await waitFor(() => expect(screen.queryByText("panel.crisisLayer.activeCount")).not.toBeInTheDocument());
  });

  it("brings back the last level when the toggle turns on again", async () => {
    const { lastLayers } = renderSection({ layers: JSON.stringify([layer("events")]) });
    const toggle = screen.getByRole("switch", { name: "panel.crisisLayer.showDisasters" });

    fireEvent.click(toggle);
    await waitFor(() => expect(toggle).not.toBeChecked());
    fireEvent.click(toggle);

    await waitFor(() => expect(detectionIds(lastLayers())).toEqual(["events"]));
  });

  it("shows the new level when one is picked while the layer is hidden", async () => {
    const { onUrlUpdate, lastLayers } = renderSection({ layers: JSON.stringify([layer("alerts", false)]) });

    await pick("layers.events.title");

    await waitFor(() => expect(onUrlUpdate).toHaveBeenCalled());
    expect(lastLayers()).toEqual([layer("events")]);
  });

  it("keeps opacity and density display when the level changes", async () => {
    const alerts = { id: "alerts", visibility: false, opacity: 0.5, settings: { density: "heatmap" } };
    const { onUrlUpdate, lastLayers } = renderSection({ layers: JSON.stringify([alerts]) });

    await pick("layers.events.title");

    await waitFor(() => expect(onUrlUpdate).toHaveBeenCalled());
    expect(lastLayers()).toEqual([{ id: "events", visibility: true, opacity: 0.5, settings: { density: "heatmap" } }]);
  });

  it("adds alerts when the toggle turns on with no level", async () => {
    const { onUrlUpdate, lastLayers } = renderSection({ layers: JSON.stringify([]) });

    fireEvent.click(screen.getByRole("switch", { name: "panel.crisisLayer.showDisasters" }));

    await waitFor(() => expect(onUrlUpdate).toHaveBeenCalled());
    expect(detectionIds(lastLayers())).toEqual(["alerts"]);
  });

  it("drops a crisis type outside a newly picked category", async () => {
    const { lastParams } = renderSection({
      layers: JSON.stringify([layer("events")]),
      category: "conflict",
      crisisType: "battles",
    });

    fireEvent.click(screen.getByRole("button", { name: /Conflict/ }));
    fireEvent.click(await screen.findByRole("option", { name: "Natural hazard" }));

    await waitFor(() => expect(lastParams()?.get("category")).toBe("natural hazard"));
    expect(lastParams()?.has("crisisType")).toBe(false);
  });

  it("disables both filters at Signals and says why", () => {
    renderSection({ layers: JSON.stringify([layer("signals")]), category: "conflict" });

    expect(screen.getByText("panel.crisisLayer.signalsNote")).toBeInTheDocument();
    for (const name of ["panel.crisisLayer.allCrisisTypes", /Conflict/]) {
      expect(screen.getByRole("button", { name })).toBeDisabled();
    }
  });

  it("lets the keyboard clear a filter with ×", () => {
    renderSection({ layers: JSON.stringify([layer("events")]), category: "conflict" });

    const clear = screen.getByRole("button", { name: "panel.crisisLayer.clearCategory" });

    expect(fireEvent.keyDown(clear, { key: "Enter", code: "Enter" })).toBe(true);
    expect(fireEvent.keyDown(clear, { key: " ", code: "Space" })).toBe(true);
  });

  it("announces the highlighted option on the trigger", async () => {
    renderSection({ layers: JSON.stringify([layer("events")]) });
    const trigger = screen.getByRole("button", { name: "panel.crisisLayer.allCategories" });

    fireEvent.click(trigger);
    await screen.findByRole("option", { name: "Conflict" });
    fireEvent.keyDown(trigger, { key: "ArrowDown", code: "ArrowDown" });

    const id = trigger.getAttribute("aria-activedescendant");
    expect(id).toBeTruthy();
    expect(document.getElementById(id!)).toHaveAttribute("role", "option");
  });
});
