import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// jsdom never fires `onload` for the pin image, so the point layers would wait forever.
vi.mock("./nrc-presence", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./nrc-presence")>()),
  loadNrcPinImage: () => Promise.resolve({} as HTMLImageElement),
}));

import {
  PRESENCE_FILL,
  PRESENCE_LABELS,
  PRESENCE_LINE,
  PRESENCE_LINE_OPACITY,
  PRESENCE_PINS,
  PRESENCE_POINTS,
  PRESENCE_SELECTED_LINE,
  PRESENCE_SOURCE,
  PRESENCE_SUDAN_OFFICES,
  presenceFillOpacity,
} from "./nrc-presence";
import {
  addPresenceMap,
  createPresenceMemory,
  type PresenceConfig,
  type PresenceCountry,
  type PresenceState,
} from "./presence-map-mode";

/* eslint-disable @typescript-eslint/no-explicit-any */

const COUNTRIES: PresenceCountry[] = [
  { iso2: "SD", name: "Sudan", pinLngLat: [37.2, 19.6], bbox: [21.8, 8.7, 38.6, 22.2] },
  { iso2: "CO", name: "Colombia", pinLngLat: [-74.1, 4.7], bbox: [-79, -4.2, -66.9, 12.5] },
];

const WORLD: PresenceState = { selectedIso: null, insetRight: 380, insetBottom: 0 };
const SUDAN: PresenceState = { selectedIso: "SD", insetRight: 380, insetBottom: 0 };
const COLOMBIA: PresenceState = { selectedIso: "CO", insetRight: 380, insetBottom: 0 };

const BASE_LABEL_FILTER = ["has", "name"];

function fakeMap() {
  const layers = new Map<string, any>([["country-label", { id: "country-label", type: "symbol", layout: {}, paint: {} }]]);
  const sources = new Map<string, any>();
  const handlers = new Map<string, Set<(e?: any) => void>>();
  const container = document.createElement("div");
  const controls = document.createElement("div");
  controls.className = "mapboxgl-ctrl-bottom-right";
  container.append(controls);
  const canvas = document.createElement("canvas");
  let hit: string | null = null;

  const map = {
    style: {},
    controls,
    canvas,
    layerOrder: [] as Array<[string, string | undefined]>,
    getStyle: () => ({ layers: [...layers.values()].map((l) => ({ id: l.id, type: l.type })) }),
    addSource: vi.fn((id: string, source: any) => void sources.set(id, source)),
    getSource: (id: string) => sources.get(id),
    removeSource: vi.fn((id: string) => void sources.delete(id)),
    addLayer: vi.fn((layer: any, before?: string) => {
      layers.set(layer.id, { ...layer, layout: { ...layer.layout }, paint: { ...layer.paint } });
      map.layerOrder.push([layer.id, before]);
    }),
    getLayer: (id: string) => layers.get(id),
    removeLayer: vi.fn((id: string) => void layers.delete(id)),
    hasImage: () => false,
    addImage: vi.fn(),
    getFilter: (id: string) => (id === "country-label" ? BASE_LABEL_FILTER : layers.get(id)?.filter),
    setFilter: vi.fn((id: string, filter: unknown) => {
      layers.get(id).filter = filter;
    }),
    getLayoutProperty: (id: string, name: string) => layers.get(id)?.layout?.[name],
    setLayoutProperty: vi.fn((id: string, name: string, value: unknown) => {
      layers.get(id).layout[name] = value;
    }),
    getPaintProperty: (id: string, name: string) => layers.get(id)?.paint?.[name],
    setPaintProperty: vi.fn((id: string, name: string, value: unknown) => {
      layers.get(id).paint[name] = value;
    }),
    getZoom: () => 1.5,
    cameraForBounds: () => ({ center: { lng: -4, lat: 12 }, zoom: 1.3 }),
    setMinZoom: vi.fn(),
    jumpTo: vi.fn(),
    fitBounds: vi.fn(),
    flyTo: vi.fn(),
    getRenderWorldCopies: () => true,
    setRenderWorldCopies: vi.fn(),
    dragRotate: { disable: vi.fn(), enable: vi.fn() },
    touchZoomRotate: { disableRotation: vi.fn(), enableRotation: vi.fn() },
    keyboard: { disableRotation: vi.fn(), enableRotation: vi.fn() },
    setFeatureState: vi.fn(),
    queryRenderedFeatures: () => (hit ? [{ properties: { iso_3166_1: hit } }] : []),
    project: () => ({ x: 11, y: 22 }),
    getContainer: () => container,
    getCanvas: () => canvas,
    on: (type: string, fn: (e?: any) => void) => {
      if (!handlers.has(type)) handlers.set(type, new Set());
      handlers.get(type)!.add(fn);
    },
    off: (type: string, fn: (e?: any) => void) => void handlers.get(type)?.delete(fn),
    /** Test helpers. */
    pointAt(iso: string | null) {
      hit = iso;
    },
    fire(type: string, event: any = {}) {
      for (const fn of [...(handlers.get(type) ?? [])]) fn({ point: { x: 1, y: 2 }, originalEvent: {}, ...event });
    },
    handlerCount: () => [...handlers.values()].reduce((n, set) => n + set.size, 0),
  };
  return map;
}

function fakeMapbox() {
  const live = new Set<object>();
  class Marker {
    constructor(public options: any) {}
    setLngLat() {
      return this;
    }
    addTo() {
      live.add(this);
      return this;
    }
    remove() {
      live.delete(this);
    }
  }
  return { Marker, live };
}

function setup(state: PresenceState = WORLD) {
  const map = fakeMap();
  const mb = fakeMapbox();
  const onHover = vi.fn();
  const onSelect = vi.fn();
  const memory = createPresenceMemory();
  const config = (start: PresenceState): PresenceConfig => ({
    countries: COUNTRIES,
    state: start,
    isDark: () => false,
    onHover,
    onSelect,
  });
  const mode = addPresenceMap(map, mb, config(state), memory);
  return { map, mb, onHover, onSelect, memory, config, mode };
}

/** The point layers arrive after the pin image; selection is applied after them. */
const untilReady = (map: ReturnType<typeof fakeMap>) => vi.waitFor(() => expect(map.getLayer(PRESENCE_PINS)).toBeTruthy());

let consoleError: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  // The paint guard logs an unsafe paint change. No test here may cause one.
  expect(consoleError).not.toHaveBeenCalled();
  consoleError.mockRestore();
});

describe("add", () => {
  it("adds the sources and layers, the country layers under the first symbol layer", async () => {
    const { map } = setup();
    await untilReady(map);

    expect(map.getSource(PRESENCE_SOURCE)).toMatchObject({ type: "vector", promoteId: { country_boundaries: "iso_3166_1" } });
    expect(map.getSource(PRESENCE_POINTS).data.features).toHaveLength(2);
    expect(map.layerOrder).toEqual([
      [PRESENCE_FILL, "country-label"],
      [PRESENCE_LINE, "country-label"],
      [PRESENCE_SELECTED_LINE, "country-label"],
      [PRESENCE_PINS, undefined],
      [PRESENCE_LABELS, undefined],
    ]);
    expect(map.getLayoutProperty(PRESENCE_LINE, "visibility")).toBe("visible");
  });

  it("sets the zoom floor, jumps to the world view once, and stops rotation", () => {
    const { map, memory } = setup();
    expect(map.setMinZoom).toHaveBeenCalledWith(1.3);
    expect(map.jumpTo).toHaveBeenCalledWith({ center: [-4, 12], zoom: 1.3 });
    expect(memory.worldView).toEqual({ center: [-4, 12], zoom: 1.3 });
    expect(memory.floorSet).toBe(true);
    expect(map.setRenderWorldCopies).toHaveBeenCalledWith(false);
    expect(map.dragRotate.disable).toHaveBeenCalled();
  });

  it("hides basemap country names at world zoom", () => {
    const { map } = setup();
    expect(map.getLayer("country-label").filter).toEqual(["==", ["get", "iso_3166_1"], "__none__"]);
  });
});

describe("hover and click in the world state", () => {
  it("highlights the country under the pointer and reports it", () => {
    const { map, onHover } = setup();
    map.pointAt("SD");
    map.fire("mousemove");

    expect(map.setFeatureState).toHaveBeenCalledWith(
      { source: PRESENCE_SOURCE, sourceLayer: "country_boundaries", id: "SD" },
      { hover: true },
    );
    expect(onHover).toHaveBeenLastCalledWith({ kind: "country", iso2: "SD", x: 1, y: 2 });
    expect(map.canvas.style.cursor).toBe("pointer");

    map.fire("mouseout");
    expect(map.setFeatureState).toHaveBeenLastCalledWith(expect.objectContaining({ id: "SD" }), { hover: false });
    expect(onHover).toHaveBeenLastCalledWith(null);
  });

  it("clears the hover before it reports the selection", () => {
    const { map, onSelect } = setup();
    map.pointAt("SD");
    map.fire("mousemove");
    onSelect.mockImplementation(() => {
      // The hover reset comes first, so the selection never meets a pending hover.
      expect(map.setFeatureState).toHaveBeenLastCalledWith(expect.objectContaining({ id: "SD" }), { hover: false });
    });
    map.fire("click");
    expect(onSelect).toHaveBeenCalledWith("SD");
  });

  it("ignores a click on empty map and on an office marker", () => {
    const { map, onSelect } = setup();
    map.fire("click");
    map.pointAt("SD");
    const marker = document.createElement("div");
    marker.className = "mapboxgl-marker";
    map.fire("click", { originalEvent: { target: marker } });
    expect(onSelect).not.toHaveBeenCalled();
  });
});

describe("update", () => {
  it("selecting a country hides the borders with visibility and never zeroes line-opacity", async () => {
    const { map, mode } = setup();
    await untilReady(map);
    mode.update(SUDAN);

    // GlitchTip prod #912: the borders must be hidden by visibility.
    expect(map.getLayoutProperty(PRESENCE_LINE, "visibility")).toBe("none");
    expect(map.getPaintProperty(PRESENCE_LINE, "line-opacity")).toBe(PRESENCE_LINE_OPACITY);
    expect(map.getPaintProperty(PRESENCE_FILL, "fill-opacity")).toEqual(presenceFillOpacity("SD"));
    expect(map.getLayoutProperty(PRESENCE_PINS, "visibility")).toBe("none");
    expect(map.getLayoutProperty(PRESENCE_LABELS, "visibility")).toBe("none");
    expect(map.getLayer(PRESENCE_SELECTED_LINE).filter.at(-1)).toEqual(["==", ["get", "iso_3166_1"], "SD"]);
    expect(map.getLayer("country-label").filter).toEqual(BASE_LABEL_FILTER);
  });

  it("frames the country clear of the panel and shows its office markers", async () => {
    const { map, mb, mode } = setup();
    await untilReady(map);
    mode.update(SUDAN);

    expect(map.fitBounds).toHaveBeenCalledWith(
      [
        [21.8, 8.7],
        [38.6, 22.2],
      ],
      expect.objectContaining({ padding: { top: 70, bottom: 50, left: 50, right: 430 } }),
    );
    expect(mb.live.size).toBe(PRESENCE_SUDAN_OFFICES.length);
    expect(map.controls.style.right).toBe("380px");

    mode.update(COLOMBIA);
    expect(mb.live.size).toBe(1); // one country-office pin
  });

  it("going back flies to the world view and removes the markers", async () => {
    const { map, mb, mode, onHover } = setup();
    await untilReady(map);
    mode.update(SUDAN);
    mode.update(WORLD);

    expect(map.flyTo).toHaveBeenCalledWith(expect.objectContaining({ center: [-4, 12], zoom: 1.3 }));
    expect(mb.live.size).toBe(0);
    expect(map.getLayoutProperty(PRESENCE_LINE, "visibility")).toBe("visible");
    expect(map.getLayoutProperty(PRESENCE_PINS, "visibility")).toBe("visible");
    expect(map.controls.style.right).toBe("0px");
    expect(onHover).toHaveBeenLastCalledWith(null);
  });

  it("does nothing for the same state", async () => {
    const { map, mode } = setup();
    await untilReady(map);
    mode.update(SUDAN);
    mode.update({ ...SUDAN });
    expect(map.fitBounds).toHaveBeenCalledTimes(1);
  });

  it("moves the camera again when only the panel size changes", async () => {
    const { map, mode } = setup();
    await untilReady(map);
    mode.update(SUDAN);
    mode.update({ ...SUDAN, insetBottom: 300 });
    expect(map.fitBounds).toHaveBeenCalledTimes(2);
  });

  it("a selection made before the point layers exist is applied when they arrive", async () => {
    const { map, mode } = setup();
    mode.update(SUDAN);
    expect(map.fitBounds).not.toHaveBeenCalled();
    await untilReady(map);
    expect(map.fitBounds).toHaveBeenCalledTimes(1);
    expect(map.getLayoutProperty(PRESENCE_LINE, "visibility")).toBe("none");
  });

  it("in the country state a pointer move does not highlight other countries", async () => {
    const { map, mode } = setup();
    await untilReady(map);
    mode.update(SUDAN);
    map.setFeatureState.mockClear();
    map.pointAt("CO");
    map.fire("mousemove");
    expect(map.setFeatureState).not.toHaveBeenCalled();
    expect(map.canvas.style.cursor).toBe("pointer");
  });
});

describe("remove", () => {
  it("takes everything off the map and gives the camera limits back", async () => {
    const { map, mb, mode } = setup();
    await untilReady(map);
    mode.update(SUDAN);
    mode.remove();

    for (const id of [PRESENCE_FILL, PRESENCE_LINE, PRESENCE_SELECTED_LINE, PRESENCE_PINS, PRESENCE_LABELS]) {
      expect(map.getLayer(id), id).toBeUndefined();
    }
    expect(map.getSource(PRESENCE_SOURCE)).toBeUndefined();
    expect(map.getSource(PRESENCE_POINTS)).toBeUndefined();
    expect(map.handlerCount()).toBe(0);
    expect(mb.live.size).toBe(0);
    expect(map.setMinZoom).toHaveBeenLastCalledWith(0);
    expect(map.setRenderWorldCopies).toHaveBeenLastCalledWith(true);
    expect(map.dragRotate.enable).toHaveBeenCalled();
  });

  it("puts the basemap country names back", () => {
    const { map, mode } = setup();
    mode.remove();
    expect(map.getLayer("country-label").filter).toEqual(BASE_LABEL_FILTER);
  });

  it("ignores an update after it, and a late pin image", async () => {
    const { map, mode } = setup();
    mode.remove();
    mode.update(SUDAN);
    await Promise.resolve();
    await Promise.resolve();
    expect(map.getLayer(PRESENCE_PINS)).toBeUndefined();
    expect(map.fitBounds).not.toHaveBeenCalled();
  });
});

describe("rebuild after a style reload", () => {
  it("keeps the camera: no second jump, and no fit for the same selection", async () => {
    const { map, mb, mode, config, memory } = setup();
    await untilReady(map);
    mode.update(SUDAN);
    expect(map.fitBounds).toHaveBeenCalledTimes(1);

    // Theme switch: the layers go and come back, the selection stays.
    mode.remove();
    const rebuilt = addPresenceMap(map, mb, config(SUDAN), memory);
    await untilReady(map);

    expect(map.jumpTo).toHaveBeenCalledTimes(1);
    expect(map.fitBounds).toHaveBeenCalledTimes(1);
    expect(map.getLayoutProperty(PRESENCE_LINE, "visibility")).toBe("none");
    expect(mb.live.size).toBe(PRESENCE_SUDAN_OFFICES.length);
    rebuilt.remove();
  });
});
