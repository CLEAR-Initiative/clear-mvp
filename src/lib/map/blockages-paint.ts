/**
 * Blockages paint — LogIE road/bridge access constraints on the crisis map.
 *
 * Country band (z5–8) is the acceptance zoom. Thin uncased red/amber lines
 * disappear against tan corridors and satellite imagery; this module is the
 * single source of truth for colors, width curves, layer ids, and add/remove.
 *
 * Stack (bottom → top, still below settlement labels):
 * glow → casing → core → hit → point halo → point → line ticks → point marks.
 *
 * Periodic X marks are corridor decoration ("closed access"), not separate
 * incidents. Spacing is deliberately wide so Country-band scans stay calm;
 * bridge points use the same badge once per feature.
 */

export const BLOCKAGES_SOURCE_ID = "logie-blockages";
export const BLOCKAGE_MARK_ICON_ID = "logie-blockage-mark";

export const BLOCKAGES_LAYER_IDS = {
  glow: "logie-blockages-glow",
  glowStale: "logie-blockages-glow-stale",
  casing: "logie-blockages-casing",
  casingStale: "logie-blockages-casing-stale",
  line: "logie-blockages-line",
  lineStale: "logie-blockages-line-stale",
  hit: "logie-blockages-line-hit",
  pointHalo: "logie-blockages-point-halo",
  point: "logie-blockages-point",
  ticks: "logie-blockages-ticks",
  marks: "logie-blockages-marks",
} as const;

export const BLOCKAGES_PAINT_LAYER_IDS = Object.values(BLOCKAGES_LAYER_IDS);

/** Layers that participate in hover hit-testing / cursor. */
export const BLOCKAGES_HOVER_LAYER_IDS = [
  BLOCKAGES_LAYER_IDS.hit,
  BLOCKAGES_LAYER_IDS.line,
  BLOCKAGES_LAYER_IDS.lineStale,
  BLOCKAGES_LAYER_IDS.point,
  BLOCKAGES_LAYER_IDS.ticks,
  BLOCKAGES_LAYER_IDS.marks,
] as const;

/** Not Passable (LogIE status_code 4). */
export const BLOCKAGES_NOT_PASSABLE = "#B91C1C";
/** Restricted / damaged (LogIE status_code 3) — vivid enough to leave tan roads. */
export const BLOCKAGES_RESTRICTED = "#EA580C";
/** Halo that keeps the core readable on Simple, Topography, and Satellite. */
export const BLOCKAGES_CASING = "#FFFFFF";

export const BLOCKAGES_CORE_OPACITY_FRESH = 0.96;
export const BLOCKAGES_CORE_OPACITY_STALE = 0.78;
export const BLOCKAGES_GLOW_OPACITY_FRESH = 0.28;
export const BLOCKAGES_GLOW_OPACITY_STALE = 0.16;
export const BLOCKAGES_CASING_OPACITY_FRESH = 0.95;
export const BLOCKAGES_CASING_OPACITY_STALE = 0.75;

/** [zoom, px] — Country-band (z6/z8) is the contract, not Site. */
export const BLOCKAGES_CORE_WIDTH_STOPS = [
  [4, 2.75],
  [6, 4],
  [8, 5.5],
  [12, 7.5],
] as const;

export const BLOCKAGES_CASING_WIDTH_STOPS = [
  [4, 5.75],
  [6, 7],
  [8, 8.5],
  [12, 10.5],
] as const;

export const BLOCKAGES_GLOW_WIDTH_STOPS = [
  [4, 10],
  [6, 14],
  [8, 18],
  [12, 22],
] as const;

export const BLOCKAGES_POINT_RADIUS_STOPS = [
  [4, 5],
  [8, 7.5],
  [12, 10],
] as const;

export const BLOCKAGES_POINT_HALO_RADIUS_STOPS = [
  [4, 8],
  [8, 12],
  [12, 16],
] as const;

/** Screen-pixel spacing for line ticks — keep wide so zoom-in does not mint a stampede. */
export const BLOCKAGES_TICK_SPACING_STOPS = [
  [4, 160],
  [8, 140],
  [12, 120],
] as const;

export const BLOCKAGES_MARK_SIZE_STOPS = [
  [4, 0.38],
  [8, 0.52],
  [12, 0.68],
] as const;

export type BlockagesMapSurface = {
  addSource: (id: string, source: Record<string, unknown>) => void;
  addLayer: (layer: Record<string, unknown>, beforeId?: string) => void;
  addImage: (
    id: string,
    image: { width: number; height: number; data: Uint8Array | Uint8ClampedArray },
    options?: { pixelRatio?: number },
  ) => void;
  hasImage: (id: string) => boolean;
  getLayer: (id: string) => unknown;
  getSource: (id: string) => unknown;
  removeLayer: (id: string) => void;
  removeSource: (id: string) => void;
};

export type BlockagesGeoJson = {
  type: "FeatureCollection";
  features: unknown[];
};

export function interpolateStops(
  stops: ReadonlyArray<readonly [number, number]>,
  zoom: number,
): number {
  if (stops.length === 0) return 0;
  if (zoom <= stops[0]![0]) return stops[0]![1];
  const last = stops[stops.length - 1]!;
  if (zoom >= last[0]) return last[1];
  for (let i = 0; i < stops.length - 1; i++) {
    const [z0, v0] = stops[i]!;
    const [z1, v1] = stops[i + 1]!;
    if (zoom >= z0 && zoom <= z1) {
      const t = (zoom - z0) / (z1 - z0);
      return v0 + (v1 - v0) * t;
    }
  }
  return last[1];
}

export function zoomWidthExpression(
  stops: ReadonlyArray<readonly [number, number]>,
): unknown[] {
  const expr: unknown[] = ["interpolate", ["linear"], ["zoom"]];
  for (const [z, w] of stops) {
    expr.push(z, w);
  }
  return expr;
}

export const blockagesStatusColorExpression = [
  "match",
  ["to-number", ["get", "status_code"]],
  4,
  BLOCKAGES_NOT_PASSABLE,
  3,
  BLOCKAGES_RESTRICTED,
  BLOCKAGES_NOT_PASSABLE,
] as const;

export const blockagesIsLineExpression = [
  "in",
  ["geometry-type"],
  ["literal", ["LineString", "MultiLineString"]],
] as const;

export const blockagesIsStaleExpression = [
  "any",
  ["==", ["get", "stale"], 1],
  ["==", ["get", "stale"], "1"],
] as const;

export const blockagesIsFreshExpression = [
  "!",
  blockagesIsStaleExpression,
] as const;

export const BLOCKAGE_MARK_ICON_SIZE = 64;
export const BLOCKAGE_MARK_PIXEL_RATIO = 2;

function setPixel(
  data: Uint8ClampedArray,
  size: number,
  x: number,
  y: number,
  r: number,
  g: number,
  b: number,
  a: number,
): void {
  const xi = Math.round(x);
  const yi = Math.round(y);
  if (xi < 0 || yi < 0 || xi >= size || yi >= size) return;
  const i = (yi * size + xi) * 4;
  data[i] = r;
  data[i + 1] = g;
  data[i + 2] = b;
  data[i + 3] = a;
}

function fillCircle(
  data: Uint8ClampedArray,
  size: number,
  cx: number,
  cy: number,
  radius: number,
  r: number,
  g: number,
  b: number,
  a: number,
): void {
  const r2 = radius * radius;
  const minX = Math.max(0, Math.floor(cx - radius));
  const maxX = Math.min(size - 1, Math.ceil(cx + radius));
  const minY = Math.max(0, Math.floor(cy - radius));
  const maxY = Math.min(size - 1, Math.ceil(cy + radius));
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const dx = x + 0.5 - cx;
      const dy = y + 0.5 - cy;
      if (dx * dx + dy * dy <= r2) setPixel(data, size, x, y, r, g, b, a);
    }
  }
}

function strokeCircle(
  data: Uint8ClampedArray,
  size: number,
  cx: number,
  cy: number,
  radius: number,
  width: number,
  r: number,
  g: number,
  b: number,
  a: number,
): void {
  const outer = radius + width / 2;
  const inner = Math.max(0, radius - width / 2);
  const outer2 = outer * outer;
  const inner2 = inner * inner;
  const minX = Math.max(0, Math.floor(cx - outer));
  const maxX = Math.min(size - 1, Math.ceil(cx + outer));
  const minY = Math.max(0, Math.floor(cy - outer));
  const maxY = Math.min(size - 1, Math.ceil(cy + outer));
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const dx = x + 0.5 - cx;
      const dy = y + 0.5 - cy;
      const d2 = dx * dx + dy * dy;
      if (d2 <= outer2 && d2 >= inner2) setPixel(data, size, x, y, r, g, b, a);
    }
  }
}

function strokeLine(
  data: Uint8ClampedArray,
  size: number,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  width: number,
  r: number,
  g: number,
  b: number,
  a: number,
): void {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const len = Math.hypot(dx, dy) || 1;
  const steps = Math.ceil(len * 2);
  const half = width / 2;
  for (let s = 0; s <= steps; s++) {
    const t = s / steps;
    const cx = x0 + dx * t;
    const cy = y0 + dy * t;
    fillCircle(data, size, cx, cy, half, r, g, b, a);
  }
}

/**
 * High-contrast “closed access” badge — white disc, dark ring, X.
 * Pure pixel fill (no canvas) so Node/CI unit tests stay quiet.
 */
export function createBlockageMarkIcon(
  size = BLOCKAGE_MARK_ICON_SIZE,
): { width: number; height: number; data: Uint8Array } {
  const data = new Uint8ClampedArray(size * size * 4);
  const cx = size / 2;
  const cy = size / 2;
  const radius = size * 0.38;
  const xWidth = size * 0.09;
  const inset = radius * 0.42;

  fillCircle(data, size, cx, cy, radius, 255, 255, 255, 255);
  strokeCircle(data, size, cx, cy, radius, size * 0.07, 17, 24, 39, 255);
  strokeLine(data, size, cx - inset, cy - inset, cx + inset, cy + inset, xWidth, 17, 24, 39, 255);
  strokeLine(data, size, cx + inset, cy - inset, cx - inset, cy + inset, xWidth, 17, 24, 39, 255);

  return {
    width: size,
    height: size,
    data: new Uint8Array(data.buffer.slice(0)),
  };
}

export function ensureBlockageMarkIcon(map: BlockagesMapSurface): void {
  if (map.hasImage(BLOCKAGE_MARK_ICON_ID)) return;
  map.addImage(BLOCKAGE_MARK_ICON_ID, createBlockageMarkIcon(), {
    pixelRatio: BLOCKAGE_MARK_PIXEL_RATIO,
  });
}

export function removeBlockagesMapLayers(map: BlockagesMapSurface): void {
  for (const id of [...BLOCKAGES_PAINT_LAYER_IDS].reverse()) {
    try {
      if (map.getLayer(id)) map.removeLayer(id);
    } catch {
      /* style may be mid-swap */
    }
  }
  try {
    if (map.getSource(BLOCKAGES_SOURCE_ID)) map.removeSource(BLOCKAGES_SOURCE_ID);
  } catch {
    /* ignore */
  }
}

export function addBlockagesMapLayers(
  map: BlockagesMapSurface,
  options: { data: BlockagesGeoJson; beforeId?: string },
): void {
  removeBlockagesMapLayers(map);
  ensureBlockageMarkIcon(map);

  map.addSource(BLOCKAGES_SOURCE_ID, {
    type: "geojson",
    data: options.data,
  });

  const beforeId = options.beforeId;
  const statusColor = blockagesStatusColorExpression;
  const isLine = blockagesIsLineExpression;
  const isStale = blockagesIsStaleExpression;
  const isFresh = blockagesIsFreshExpression;
  const coreWidth = zoomWidthExpression(BLOCKAGES_CORE_WIDTH_STOPS);
  const casingWidth = zoomWidthExpression(BLOCKAGES_CASING_WIDTH_STOPS);
  const glowWidth = zoomWidthExpression(BLOCKAGES_GLOW_WIDTH_STOPS);
  const roundCap = { "line-cap": "round", "line-join": "round" };

  const lineLayer = (
    id: string,
    filter: unknown,
    paint: Record<string, unknown>,
  ) => ({
    id,
    type: "line",
    source: BLOCKAGES_SOURCE_ID,
    filter,
    paint,
    layout: roundCap,
  });

  map.addLayer(
    lineLayer(
      BLOCKAGES_LAYER_IDS.glow,
      ["all", isLine, isFresh],
      {
        "line-color": statusColor,
        "line-width": glowWidth,
        "line-opacity": BLOCKAGES_GLOW_OPACITY_FRESH,
        "line-blur": 2.5,
      },
    ),
    beforeId,
  );
  map.addLayer(
    lineLayer(
      BLOCKAGES_LAYER_IDS.glowStale,
      ["all", isLine, isStale],
      {
        "line-color": statusColor,
        "line-width": glowWidth,
        "line-opacity": BLOCKAGES_GLOW_OPACITY_STALE,
        "line-blur": 2.5,
      },
    ),
    beforeId,
  );
  map.addLayer(
    lineLayer(
      BLOCKAGES_LAYER_IDS.casing,
      ["all", isLine, isFresh],
      {
        "line-color": BLOCKAGES_CASING,
        "line-width": casingWidth,
        "line-opacity": BLOCKAGES_CASING_OPACITY_FRESH,
      },
    ),
    beforeId,
  );
  map.addLayer(
    lineLayer(
      BLOCKAGES_LAYER_IDS.casingStale,
      ["all", isLine, isStale],
      {
        "line-color": BLOCKAGES_CASING,
        "line-width": casingWidth,
        "line-opacity": BLOCKAGES_CASING_OPACITY_STALE,
        "line-dasharray": [2, 1.6],
      },
    ),
    beforeId,
  );
  map.addLayer(
    lineLayer(
      BLOCKAGES_LAYER_IDS.line,
      ["all", isLine, isFresh],
      {
        "line-color": statusColor,
        "line-width": coreWidth,
        "line-opacity": BLOCKAGES_CORE_OPACITY_FRESH,
      },
    ),
    beforeId,
  );
  map.addLayer(
    lineLayer(
      BLOCKAGES_LAYER_IDS.lineStale,
      ["all", isLine, isStale],
      {
        "line-color": statusColor,
        "line-width": coreWidth,
        "line-opacity": BLOCKAGES_CORE_OPACITY_STALE,
        "line-dasharray": [2, 1.6],
      },
    ),
    beforeId,
  );
  map.addLayer(
    lineLayer(BLOCKAGES_LAYER_IDS.hit, isLine, {
      "line-color": "#000000",
      "line-opacity": 0,
      "line-width": 18,
    }),
    beforeId,
  );

  map.addLayer(
    {
      id: BLOCKAGES_LAYER_IDS.pointHalo,
      type: "circle",
      source: BLOCKAGES_SOURCE_ID,
      filter: ["==", ["geometry-type"], "Point"],
      paint: {
        "circle-radius": zoomWidthExpression(BLOCKAGES_POINT_HALO_RADIUS_STOPS),
        "circle-color": statusColor,
        "circle-opacity": [
          "case",
          isStale,
          0.22,
          0.38,
        ],
        "circle-blur": 0.35,
      },
    },
    beforeId,
  );
  map.addLayer(
    {
      id: BLOCKAGES_LAYER_IDS.point,
      type: "circle",
      source: BLOCKAGES_SOURCE_ID,
      filter: ["==", ["geometry-type"], "Point"],
      paint: {
        "circle-radius": zoomWidthExpression(BLOCKAGES_POINT_RADIUS_STOPS),
        "circle-color": statusColor,
        "circle-opacity": [
          "case",
          isStale,
          BLOCKAGES_CORE_OPACITY_STALE,
          BLOCKAGES_CORE_OPACITY_FRESH,
        ],
        "circle-stroke-width": 2.5,
        "circle-stroke-color": BLOCKAGES_CASING,
      },
    },
    beforeId,
  );
  map.addLayer(
    {
      id: BLOCKAGES_LAYER_IDS.ticks,
      type: "symbol",
      source: BLOCKAGES_SOURCE_ID,
      filter: isLine,
      layout: {
        "symbol-placement": "line",
        "symbol-spacing": zoomWidthExpression(BLOCKAGES_TICK_SPACING_STOPS),
        "icon-image": BLOCKAGE_MARK_ICON_ID,
        "icon-size": zoomWidthExpression(BLOCKAGES_MARK_SIZE_STOPS),
        "icon-rotation-alignment": "map",
        "icon-allow-overlap": true,
        "icon-ignore-placement": true,
      },
      paint: {
        "icon-opacity": [
          "case",
          isStale,
          0.78,
          1,
        ],
      },
    },
    beforeId,
  );
  map.addLayer(
    {
      id: BLOCKAGES_LAYER_IDS.marks,
      type: "symbol",
      source: BLOCKAGES_SOURCE_ID,
      filter: ["==", ["geometry-type"], "Point"],
      layout: {
        "icon-image": BLOCKAGE_MARK_ICON_ID,
        "icon-size": zoomWidthExpression(BLOCKAGES_MARK_SIZE_STOPS),
        "icon-allow-overlap": true,
        "icon-ignore-placement": true,
      },
      paint: {
        "icon-opacity": [
          "case",
          isStale,
          0.78,
          1,
        ],
      },
    },
    beforeId,
  );
}
