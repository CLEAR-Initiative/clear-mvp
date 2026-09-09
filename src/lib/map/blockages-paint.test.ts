import { describe, expect, it } from "vitest";
import {
  addBlockagesMapLayers,
  BLOCKAGE_MARK_ICON_ID,
  BLOCKAGES_CASING,
  BLOCKAGES_CASING_OPACITY_STALE,
  BLOCKAGES_CASING_WIDTH_STOPS,
  BLOCKAGES_CORE_OPACITY_STALE,
  BLOCKAGES_CORE_WIDTH_STOPS,
  BLOCKAGES_GLOW_WIDTH_STOPS,
  BLOCKAGES_HOVER_LAYER_IDS,
  BLOCKAGES_LAYER_IDS,
  BLOCKAGES_NOT_PASSABLE,
  BLOCKAGES_PAINT_LAYER_IDS,
  BLOCKAGES_POINT_RADIUS_STOPS,
  BLOCKAGES_RESTRICTED,
  BLOCKAGES_SOURCE_ID,
  BLOCKAGES_TICK_SPACING_STOPS,
  blockagesStatusColorExpression,
  createBlockageMarkIcon,
  interpolateStops,
  removeBlockagesMapLayers,
  zoomWidthExpression,
  type BlockagesMapSurface,
} from "./blockages-paint";

describe("interpolateStops", () => {
  it("returns Country-band core widths that beat the old 1.5–3px paint", () => {
    expect(interpolateStops(BLOCKAGES_CORE_WIDTH_STOPS, 4)).toBeGreaterThanOrEqual(2.75);
    expect(interpolateStops(BLOCKAGES_CORE_WIDTH_STOPS, 6)).toBeGreaterThanOrEqual(4);
    expect(interpolateStops(BLOCKAGES_CORE_WIDTH_STOPS, 8)).toBeGreaterThanOrEqual(5.5);
  });

  it("keeps casing wider than the core at every Country-band anchor", () => {
    for (const z of [4, 6, 8, 12]) {
      expect(interpolateStops(BLOCKAGES_CASING_WIDTH_STOPS, z)).toBeGreaterThan(
        interpolateStops(BLOCKAGES_CORE_WIDTH_STOPS, z),
      );
    }
  });

  it("keeps the glow wide enough to scan at z6", () => {
    expect(interpolateStops(BLOCKAGES_GLOW_WIDTH_STOPS, 6)).toBeGreaterThanOrEqual(14);
  });

  it("grows bridge points past the old 3–6px circles", () => {
    expect(interpolateStops(BLOCKAGES_POINT_RADIUS_STOPS, 4)).toBeGreaterThanOrEqual(5);
    expect(interpolateStops(BLOCKAGES_POINT_RADIUS_STOPS, 8)).toBeGreaterThanOrEqual(7);
  });

  it("keeps tick spacing wide enough that zoom-in does not stampede", () => {
    expect(interpolateStops(BLOCKAGES_TICK_SPACING_STOPS, 4)).toBeGreaterThanOrEqual(140);
    expect(interpolateStops(BLOCKAGES_TICK_SPACING_STOPS, 8)).toBeGreaterThanOrEqual(120);
  });
});

describe("blockages paint tokens", () => {
  it("keeps Restricted orange away from tan road corridors", () => {
    expect(BLOCKAGES_RESTRICTED).toBe("#EA580C");
    expect(BLOCKAGES_RESTRICTED).not.toBe("#D97706");
    expect(BLOCKAGES_NOT_PASSABLE).toBe("#B91C1C");
    expect(BLOCKAGES_CASING).toBe("#FFFFFF");
  });

  it("does not fade stale paint below readable", () => {
    expect(BLOCKAGES_CORE_OPACITY_STALE).toBeGreaterThanOrEqual(0.7);
    expect(BLOCKAGES_CASING_OPACITY_STALE).toBeGreaterThanOrEqual(0.7);
  });

  it("maps LogIE status codes onto the two status hues", () => {
    expect(blockagesStatusColorExpression).toContain(4);
    expect(blockagesStatusColorExpression).toContain(BLOCKAGES_NOT_PASSABLE);
    expect(blockagesStatusColorExpression).toContain(3);
    expect(blockagesStatusColorExpression).toContain(BLOCKAGES_RESTRICTED);
  });

  it("builds a zoom interpolate expression from stops", () => {
    expect(zoomWidthExpression(BLOCKAGES_CORE_WIDTH_STOPS)).toEqual([
      "interpolate",
      ["linear"],
      ["zoom"],
      4,
      2.75,
      6,
      4,
      8,
      5.5,
      12,
      7.5,
    ]);
  });

  it("builds a closed-access mark icon without canvas", () => {
    const icon = createBlockageMarkIcon(32);
    expect(icon.width).toBe(32);
    expect(icon.height).toBe(32);
    expect(icon.data.length).toBe(32 * 32 * 4);
    expect(icon.data.some((v) => v !== 0)).toBe(true);
  });
});

describe("add/remove blockages layers", () => {
  function mockMap(): BlockagesMapSurface & {
    layers: string[];
    sources: string[];
    images: string[];
  } {
    const layers: string[] = [];
    const sources: string[] = [];
    const images: string[] = [];
    return {
      layers,
      sources,
      images,
      addSource: (id) => {
        sources.push(id);
      },
      addLayer: (layer) => {
        layers.push(String(layer.id));
      },
      addImage: (id) => {
        images.push(id);
      },
      hasImage: (id) => images.includes(id),
      getLayer: (id) => (layers.includes(id) ? { id } : undefined),
      getSource: (id) => (sources.includes(id) ? { id } : undefined),
      removeLayer: (id) => {
        const i = layers.indexOf(id);
        if (i >= 0) layers.splice(i, 1);
      },
      removeSource: (id) => {
        const i = sources.indexOf(id);
        if (i >= 0) sources.splice(i, 1);
      },
    };
  }

  it("adds glow, casing, core, ticks, and marks from one source", () => {
    const map = mockMap();
    addBlockagesMapLayers(map, {
      data: { type: "FeatureCollection", features: [] },
    });

    expect(map.sources).toEqual([BLOCKAGES_SOURCE_ID]);
    expect(map.images).toEqual([BLOCKAGE_MARK_ICON_ID]);
    expect(map.layers).toEqual([...BLOCKAGES_PAINT_LAYER_IDS]);
    expect(map.layers).toContain(BLOCKAGES_LAYER_IDS.glow);
    expect(map.layers).toContain(BLOCKAGES_LAYER_IDS.casing);
    expect(map.layers).toContain(BLOCKAGES_LAYER_IDS.line);
    expect(map.layers).toContain(BLOCKAGES_LAYER_IDS.ticks);
    expect(map.layers).toContain(BLOCKAGES_LAYER_IDS.marks);
    expect(BLOCKAGES_HOVER_LAYER_IDS).toContain(BLOCKAGES_LAYER_IDS.hit);
  });

  it("remove tears down every paint layer and the source", () => {
    const map = mockMap();
    addBlockagesMapLayers(map, {
      data: { type: "FeatureCollection", features: [] },
    });
    removeBlockagesMapLayers(map);
    expect(map.layers).toEqual([]);
    expect(map.sources).toEqual([]);
  });
});
