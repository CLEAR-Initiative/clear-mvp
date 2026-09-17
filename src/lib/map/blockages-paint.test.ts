import { describe, expect, it } from "vitest";
import {
  addBlockagesMapLayers,
  BLOCKAGE_MARK_ICON_ID,
  BLOCKAGES_CASING,
  BLOCKAGES_CASING_OPACITY_FRESH,
  BLOCKAGES_CASING_OPACITY_STALE,
  BLOCKAGES_CASING_WIDTH_STOPS,
  BLOCKAGES_CORE_OPACITY_FRESH,
  BLOCKAGES_CORE_OPACITY_STALE,
  BLOCKAGES_CORE_WIDTH_STOPS,
  BLOCKAGES_CUE_SPACING_STOPS,
  BLOCKAGES_GHOST_WIDTH_STOPS,
  BLOCKAGES_GLOW_OPACITY_FRESH,
  BLOCKAGES_GLOW_OPACITY_STALE,
  BLOCKAGES_GLOW_WIDTH_STOPS,
  BLOCKAGES_HOVER_LAYER_IDS,
  BLOCKAGES_LAYER_IDS,
  BLOCKAGES_NOT_PASSABLE,
  BLOCKAGES_PAINT_LAYER_IDS,
  BLOCKAGES_POINT_RADIUS_STOPS,
  BLOCKAGES_RESTRICTED,
  BLOCKAGES_SOURCE_ID,
  blockagesStatusColorExpression,
  createBlockageMarkIcon,
  interpolateStops,
  removeBlockagesMapLayers,
  setBlockagesFillProgress,
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

  it("keeps ghost track thinner than the core", () => {
    for (const z of [4, 6, 8, 12]) {
      expect(interpolateStops(BLOCKAGES_GHOST_WIDTH_STOPS, z)).toBeLessThan(
        interpolateStops(BLOCKAGES_CORE_WIDTH_STOPS, z),
      );
    }
  });

  it("keeps cue spacing wide enough that zoom-in does not stampede", () => {
    expect(interpolateStops(BLOCKAGES_CUE_SPACING_STOPS, 4)).toBeGreaterThanOrEqual(180);
    expect(interpolateStops(BLOCKAGES_CUE_SPACING_STOPS, 8)).toBeGreaterThanOrEqual(160);
  });
});

describe("blockages paint tokens", () => {
  it("keeps Restricted orange away from tan road corridors", () => {
    expect(BLOCKAGES_RESTRICTED).toBe("#EA580C");
    expect(BLOCKAGES_RESTRICTED).not.toBe("#D97706");
    expect(BLOCKAGES_NOT_PASSABLE).toBe("#B91C1C");
    expect(BLOCKAGES_CASING).toBe("#FFFFFF");
  });

  it("uses 60% opacity for stale corridors", () => {
    expect(BLOCKAGES_CORE_OPACITY_STALE).toBe(0.6);
    expect(BLOCKAGES_CASING_OPACITY_STALE).toBe(0.6);
    expect(BLOCKAGES_CORE_OPACITY_FRESH).toBe(1.0);
    expect(BLOCKAGES_CASING_OPACITY_FRESH).toBe(1.0);
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
    paintProps: Record<string, Record<string, unknown>>;
  } {
    const layers: string[] = [];
    const sources: string[] = [];
    const images: string[] = [];
    const paintProps: Record<string, Record<string, unknown>> = {};
    return {
      layers,
      sources,
      images,
      paintProps,
      addSource: (id, source) => {
        sources.push(id);
        // Track lineMetrics
        if (typeof source === "object" && source.lineMetrics) {
          paintProps[id] = { lineMetrics: true };
        }
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
      setPaintProperty: (layerId, name, value) => {
        if (!paintProps[layerId]) paintProps[layerId] = {};
        paintProps[layerId]![name] = value;
      },
      queryRenderedFeatures: () => [],
      project: (lngLat: [number, number]) => ({ x: lngLat[0] * 100, y: lngLat[1] * 100 }),
      getZoom: () => 8,
    };
  }

  it("adds ghost, glow, casing, core, and cues with lineMetrics (no marks)", async () => {
    const map = mockMap();
    await addBlockagesMapLayers(map, {
      data: { type: "FeatureCollection", features: [] },
    });

    expect(map.sources).toEqual([BLOCKAGES_SOURCE_ID]);
    // Canvas fallback icon + OCHA bridge icons
    expect(map.images).toContain(BLOCKAGE_MARK_ICON_ID);
    expect(map.layers).toEqual([...BLOCKAGES_PAINT_LAYER_IDS]);
    expect(map.layers).toContain(BLOCKAGES_LAYER_IDS.ghost);
    expect(map.layers).toContain(BLOCKAGES_LAYER_IDS.glow);
    expect(map.layers).toContain(BLOCKAGES_LAYER_IDS.casing);
    expect(map.layers).toContain(BLOCKAGES_LAYER_IDS.line);
    expect(map.layers).toContain(BLOCKAGES_LAYER_IDS.cues);
    expect(map.layers).not.toContain("logie-blockages-ticks");
    expect(map.layers).not.toContain("logie-blockages-marks");
    expect(BLOCKAGES_HOVER_LAYER_IDS).toContain(BLOCKAGES_LAYER_IDS.hit);
    expect(BLOCKAGES_HOVER_LAYER_IDS).toContain(BLOCKAGES_LAYER_IDS.cues);
    expect(BLOCKAGES_HOVER_LAYER_IDS).not.toContain("logie-blockages-marks" as any);
    // Verify lineMetrics is enabled
    expect(map.paintProps[BLOCKAGES_SOURCE_ID]?.lineMetrics).toBe(true);
  });

  it("remove tears down every paint layer and the source", async () => {
    const map = mockMap();
    await addBlockagesMapLayers(map, {
      data: { type: "FeatureCollection", features: [] },
    });
    removeBlockagesMapLayers(map);
    expect(map.layers).toEqual([]);
    expect(map.sources).toEqual([]);
  });

  it("setBlockagesFillProgress animates opacity, not trim-offset", async () => {
    const map = mockMap();
    await addBlockagesMapLayers(map, {
      data: { type: "FeatureCollection", features: [] },
    });

    // At 50% progress, opacity should be 50% of base
    setBlockagesFillProgress(map, 0.5);
    expect(map.paintProps[BLOCKAGES_LAYER_IDS.glow]?.["line-opacity"]).toBeCloseTo(
      BLOCKAGES_GLOW_OPACITY_FRESH * 0.5,
      3,
    );
    expect(map.paintProps[BLOCKAGES_LAYER_IDS.casing]?.["line-opacity"]).toBeCloseTo(
      BLOCKAGES_CASING_OPACITY_FRESH * 0.5,
      3,
    );
    expect(map.paintProps[BLOCKAGES_LAYER_IDS.line]?.["line-opacity"]).toBeCloseTo(
      BLOCKAGES_CORE_OPACITY_FRESH * 0.5,
      3,
    );

    // At 100% progress, opacity should be full base
    setBlockagesFillProgress(map, 1);
    expect(map.paintProps[BLOCKAGES_LAYER_IDS.glow]?.["line-opacity"]).toBeCloseTo(
      BLOCKAGES_GLOW_OPACITY_FRESH,
      3,
    );
    expect(map.paintProps[BLOCKAGES_LAYER_IDS.line]?.["line-opacity"]).toBeCloseTo(
      BLOCKAGES_CORE_OPACITY_FRESH,
      3,
    );

    // Stale layers also animated
    expect(map.paintProps[BLOCKAGES_LAYER_IDS.glowStale]?.["line-opacity"]).toBeCloseTo(
      BLOCKAGES_GLOW_OPACITY_STALE,
      3,
    );
  });
});
