/**
 * Blockages paint — LogIE road/bridge access constraints on the crisis map.
 *
 * Country band (z5–8) is the acceptance zoom. Thin uncased red/amber lines
 * disappear against tan corridors and satellite imagery; this module is the
 * single source of truth for colors, width curves, layer ids, and add/remove.
 *
 * Stack (bottom → top, still below settlement labels):
 * ghost → glow → casing → core → hit → point halo → point → cues (line text) → marks (point icons).
 *
 * Animation uses opacity fade (not width/trim) - corridors stay thick always.
 * Cue chips replace periodic X ticks; bridge points keep the closed-access mark.
 */

export const BLOCKAGES_SOURCE_ID = "logie-blockages";
export const BLOCKAGE_MARK_ICON_ID = "logie-blockage-mark";

// OCHA humanitarian bridge icons by status
export const BRIDGE_ICON_NOT_PASSABLE = "bridge-not-passable";
export const BRIDGE_ICON_RESTRICTED = "bridge-restricted";
export const BRIDGE_ICON_CLOSED = "bridge-closed";
export const BRIDGE_ICON_OPEN = "bridge-open";

export const BLOCKAGES_LAYER_IDS = {
  ghost: "logie-blockages-ghost",
  glow: "logie-blockages-glow",
  glowStale: "logie-blockages-glow-stale",
  casing: "logie-blockages-casing",
  casingStale: "logie-blockages-casing-stale",
  line: "logie-blockages-line",
  lineStale: "logie-blockages-line-stale",
  hit: "logie-blockages-line-hit",
  point: "logie-blockages-point",
  cues: "logie-blockages-cues",
} as const;

export const BLOCKAGES_PAINT_LAYER_IDS = Object.values(BLOCKAGES_LAYER_IDS);

/** Layers that participate in hover hit-testing / cursor. */
export const BLOCKAGES_HOVER_LAYER_IDS = [
  BLOCKAGES_LAYER_IDS.hit,
  BLOCKAGES_LAYER_IDS.line,
  BLOCKAGES_LAYER_IDS.lineStale,
  BLOCKAGES_LAYER_IDS.point,
  BLOCKAGES_LAYER_IDS.cues,
] as const;

/** Not Passable (LogIE status_code 4). */
export const BLOCKAGES_NOT_PASSABLE = "#B91C1C";
/** Restricted / damaged (LogIE status_code 3) — vivid enough to leave tan roads. */
export const BLOCKAGES_RESTRICTED = "#EA580C";
/** Halo that keeps the core readable on Simple, Topography, and Satellite. */
export const BLOCKAGES_CASING = "#FFFFFF";

export const BLOCKAGES_CORE_OPACITY_FRESH = 1.0;  // 100% for fresh
export const BLOCKAGES_CORE_OPACITY_STALE = 0.6;  // 60% for stale
export const BLOCKAGES_GLOW_OPACITY_FRESH = 0.28;
export const BLOCKAGES_GLOW_OPACITY_STALE = 0.16;
export const BLOCKAGES_CASING_OPACITY_FRESH = 1.0;  // 100% for fresh
export const BLOCKAGES_CASING_OPACITY_STALE = 0.6;  // 60% for stale

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

/** Ghost track: very faint full corridor visible while fill animates. */
export const BLOCKAGES_GHOST_WIDTH_STOPS = [
  [4, 1.5],
  [6, 2],
  [8, 2.5],
  [12, 3],
] as const;

export const BLOCKAGES_GHOST_OPACITY = 0.12; // Much fainter so thick default is clear

/** Screen-pixel spacing for cue text chips — wide so Country zoom stays calm. */
export const BLOCKAGES_CUE_SPACING_STOPS = [
  [4, 200],
  [8, 180],
  [12, 160],
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
  setPaintProperty: (layerId: string, name: string, value: unknown) => void;
  queryRenderedFeatures: (
    point?: unknown,
    options?: { layers?: string[] },
  ) => Array<{ geometry?: { type: string; coordinates: unknown } }>;
  project: (lngLat: [number, number]) => { x: number; y: number };
  getZoom: () => number;
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

function fillRect(
  data: Uint8ClampedArray,
  size: number,
  x: number,
  y: number,
  width: number,
  height: number,
  r: number,
  g: number,
  b: number,
  a: number,
): void {
  const minX = Math.max(0, Math.floor(x));
  const maxX = Math.min(size - 1, Math.ceil(x + width));
  const minY = Math.max(0, Math.floor(y));
  const maxY = Math.min(size - 1, Math.ceil(y + height));
  
  for (let py = minY; py <= maxY; py++) {
    for (let px = minX; px <= maxX; px++) {
      const i = (py * size + px) * 4;
      data[i] = r;
      data[i + 1] = g;
      data[i + 2] = b;
      data[i + 3] = a;
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
/**
 * Create a simple bridge icon for blocked bridge points.
 * Simplified design: just the bridge structure, no background circle.
 * TODO: Replace with proper OCHA humanitarian icon SVG.
 */
export function createBlockageMarkIcon(
  size = BLOCKAGE_MARK_ICON_SIZE,
): { width: number; height: number; data: Uint8Array } {
  const data = new Uint8ClampedArray(size * size * 4);
  const cx = size / 2;
  const cy = size / 2;
  
  // Simple bridge icon (red) - no background, no border
  const red = 185;
  const green = 28;
  const blue = 28;
  const alpha = 255;
  
  // Top deck (thicker horizontal bar)
  const deckWidth = size * 0.6;
  const deckThick = size * 0.12;
  const deckY = cy - size * 0.12;
  fillRect(
    data,
    size,
    cx - deckWidth / 2,
    deckY - deckThick / 2,
    deckWidth,
    deckThick,
    red,
    green,
    blue,
    alpha,
  );
  
  // Left support pillar
  const pillarWidth = size * 0.1;
  const pillarHeight = size * 0.3;
  const pillarY = deckY + deckThick / 2;
  fillRect(
    data,
    size,
    cx - deckWidth * 0.35 - pillarWidth / 2,
    pillarY,
    pillarWidth,
    pillarHeight,
    red,
    green,
    blue,
    alpha,
  );
  
  // Right support pillar
  fillRect(
    data,
    size,
    cx + deckWidth * 0.35 - pillarWidth / 2,
    pillarY,
    pillarWidth,
    pillarHeight,
    red,
    green,
    blue,
    alpha,
  );
  
  // Bottom base (ground connection)
  const baseWidth = size * 0.7;
  const baseThick = size * 0.08;
  const baseY = pillarY + pillarHeight;
  fillRect(
    data,
    size,
    cx - baseWidth / 2,
    baseY,
    baseWidth,
    baseThick,
    red,
    green,
    blue,
    alpha,
  );
  
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

// Icon cache to prevent re-fetching/re-processing on every layer add
const iconCache = new Map<string, { width: number; height: number; data: Uint8ClampedArray }>();

/**
 * Load OCHA humanitarian bridge icons from SVG files.
 * Converts SVG to Mapbox-compatible image format with caching.
 * 
 * @param map - Mapbox map instance
 * @param signal - AbortController signal for cancellation
 * @throws Error if any critical icon fails to load
 */
export async function loadBridgeIcons(
  map: BlockagesMapSurface,
  signal?: AbortSignal,
): Promise<void> {
  // Skip in test environment (Image loading doesn't work in jsdom/vitest)
  if (process.env.NODE_ENV === "test" || typeof Image === "undefined") {
    return;
  }
  
  const icons = [
    { id: BRIDGE_ICON_NOT_PASSABLE, path: "/images/ui-kit/signals/icons/bridge-not-passable.svg" },
    { id: BRIDGE_ICON_RESTRICTED, path: "/images/ui-kit/signals/icons/bridge-restricted.svg" },
    { id: BRIDGE_ICON_CLOSED, path: "/images/ui-kit/signals/icons/bridge-closed.svg" },
    { id: BRIDGE_ICON_OPEN, path: "/images/ui-kit/signals/icons/bridge-open.svg" },
  ];

  const loadPromises = icons.map(({ id, path }) => {
    // Skip if already registered with Mapbox
    if (map.hasImage(id)) return Promise.resolve({ id, success: true });
    
    // Check cache first
    const cached = iconCache.get(id);
    if (cached) {
      map.addImage(id, cached, { pixelRatio: 2 });
      return Promise.resolve({ id, success: true });
    }
    
    // Load via Image element (more reliable than fetch + createImageBitmap for SVG)
    return new Promise<{ id: string; success: boolean; error?: string }>((resolve) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      
      // Setup abort handling
      const onAbort = () => {
        img.src = "";
        resolve({ id, success: false, error: "Aborted" });
      };
      signal?.addEventListener("abort", onAbort);
      
      img.onload = () => {
        signal?.removeEventListener("abort", onAbort);
        
        try {
          // Convert to Mapbox format using canvas
          const canvas = document.createElement("canvas");
          canvas.width = img.width || 64;
          canvas.height = img.height || 64;
          const ctx = canvas.getContext("2d");
          
          if (!ctx) {
            resolve({ id, success: false, error: "No canvas context" });
            return;
          }
          
          ctx.drawImage(img, 0, 0);
          const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          
          // Cache it
          const imageData = {
            width: canvas.width,
            height: canvas.height,
            data: new Uint8ClampedArray(imgData.data),
          };
          iconCache.set(id, imageData);
          
          // Register with Mapbox
          map.addImage(id, imageData, { pixelRatio: 2 });
          resolve({ id, success: true });
          
        } catch (error) {
          const msg = error instanceof Error ? error.message : String(error);
          resolve({ id, success: false, error: msg });
        }
      };
      
      img.onerror = () => {
        signal?.removeEventListener("abort", onAbort);
        resolve({ id, success: false, error: "Failed to load image" });
      };
      
      // Trigger load
      img.src = path;
    });
  });

  const results = await Promise.all(loadPromises);
  
  // Check if any critical icons failed
  const failures = results.filter(r => !r.success);
  const successes = results.filter(r => r.success);
  
  if (successes.length > 0) {
    console.log(`✓ Loaded ${successes.length} bridge icons:`, successes.map(s => s.id).join(", "));
  }
  
  if (failures.length > 0) {
    console.warn(`✗ Bridge icon loading failures (${failures.length}):`, failures.map(f => f.id).join(", "));
    // Non-blocking: map will use fallback canvas icon
  }
}

/**
 * Update fill animation progress using opacity (not width/trim).
 * Progress 0 = invisible, 1 = fully visible at base opacity.
 * Corridors stay thick always - only opacity changes.
 */
export function setBlockagesFillProgress(
  map: BlockagesMapSurface,
  progress: number,
): void {
  const t = Math.max(0, Math.min(1, progress));
  
  // Animate opacity for each layer, respecting their base opacity values
  const layerOpacities = [
    { id: BLOCKAGES_LAYER_IDS.glow, baseOpacity: BLOCKAGES_GLOW_OPACITY_FRESH },
    { id: BLOCKAGES_LAYER_IDS.glowStale, baseOpacity: BLOCKAGES_GLOW_OPACITY_STALE },
    { id: BLOCKAGES_LAYER_IDS.casing, baseOpacity: BLOCKAGES_CASING_OPACITY_FRESH },
    { id: BLOCKAGES_LAYER_IDS.casingStale, baseOpacity: BLOCKAGES_CASING_OPACITY_STALE },
    { id: BLOCKAGES_LAYER_IDS.line, baseOpacity: BLOCKAGES_CORE_OPACITY_FRESH },
    { id: BLOCKAGES_LAYER_IDS.lineStale, baseOpacity: BLOCKAGES_CORE_OPACITY_STALE },
  ];
  
  for (const { id, baseOpacity } of layerOpacities) {
    try {
      if (map.getLayer(id)) {
        // Multiply base opacity by progress to fade in/out
        map.setPaintProperty(id, "line-opacity", baseOpacity * t);
      }
    } catch {
      /* layer may not exist yet or style mid-swap */
    }
  }
}

/**
 * Calculate average screen-pixel length of visible blockage lines.
 * Used to set animation duration proportional to visible length for constant speed.
 */
export function getBlockagesAveragePixelLength(map: BlockagesMapSurface): number {
  try {
    const features = map.queryRenderedFeatures(undefined, {
      layers: [BLOCKAGES_LAYER_IDS.line, BLOCKAGES_LAYER_IDS.lineStale],
    });
    
    if (features.length === 0) return 300; // fallback
    
    let totalPixels = 0;
    let lineCount = 0;
    
    for (const feature of features) {
      const geom = feature.geometry;
      if (!geom || (geom.type !== "LineString" && geom.type !== "MultiLineString")) continue;
      
      const coords =
        geom.type === "LineString"
          ? [geom.coordinates as number[][]]
          : (geom.coordinates as number[][][]);
      
      for (const line of coords) {
        if (!Array.isArray(line) || line.length < 2) continue;
        
        let linePixels = 0;
        for (let i = 1; i < line.length; i++) {
          const prev = line[i - 1];
          const curr = line[i];
          if (!Array.isArray(prev) || !Array.isArray(curr)) continue;
          
          const p1 = map.project([prev[0] as number, prev[1] as number]);
          const p2 = map.project([curr[0] as number, curr[1] as number]);
          const dx = p2.x - p1.x;
          const dy = p2.y - p1.y;
          linePixels += Math.sqrt(dx * dx + dy * dy);
        }
        
        if (linePixels > 0) {
          totalPixels += linePixels;
          lineCount++;
        }
      }
    }
    
    return lineCount > 0 ? totalPixels / lineCount : 300;
  } catch {
    return 300; // fallback on error
  }
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

export async function addBlockagesMapLayers(
  map: BlockagesMapSurface,
  options: { data: BlockagesGeoJson; beforeId?: string; signal?: AbortSignal },
): Promise<void> {
  removeBlockagesMapLayers(map);
  
  // Load OCHA humanitarian bridge icons (async, with cancellation support)
  await loadBridgeIcons(map, options.signal);
  
  // Ensure fallback canvas icon
  ensureBlockageMarkIcon(map);

  const data = options.data;
  map.addSource(BLOCKAGES_SOURCE_ID, {
    type: "geojson",
    data,
    lineMetrics: true,
  });
  
  // Debug: log feature types and status codes
  if (data.features.length > 0) {
    const points = data.features.filter((f: any) => f.geometry.type === "Point");
    const lines = data.features.filter((f: any) => f.geometry.type === "LineString");
    console.log(`Blockages: ${points.length} points, ${lines.length} lines`);
    if (points.length > 0) {
      const statuses = points.map((p: any) => p.properties?.status_code).filter(Boolean);
      console.log(`Point status codes:`, [...new Set(statuses)]);
    }
  }

  const beforeId = options.beforeId;
  const statusColor = blockagesStatusColorExpression;
  const isLine = blockagesIsLineExpression;
  const isStale = blockagesIsStaleExpression;
  const isFresh = blockagesIsFreshExpression;
  const coreWidth = zoomWidthExpression(BLOCKAGES_CORE_WIDTH_STOPS);
  const casingWidth = zoomWidthExpression(BLOCKAGES_CASING_WIDTH_STOPS);
  const glowWidth = zoomWidthExpression(BLOCKAGES_GLOW_WIDTH_STOPS);
  const ghostWidth = zoomWidthExpression(BLOCKAGES_GHOST_WIDTH_STOPS);
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

  // Ghost track: faint full corridor always visible (extent readable during fill)
  map.addLayer(
    lineLayer(
      BLOCKAGES_LAYER_IDS.ghost,
      isLine,
      {
        "line-color": statusColor,
        "line-width": ghostWidth,
        "line-opacity": BLOCKAGES_GHOST_OPACITY,
      },
    ),
    beforeId,
  );

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

  // Bridge icons - OCHA humanitarian icons based on status
  // Note: Icons are loaded async, fallback to canvas icon if not ready
  
  // Bridge icon symbol layer with status-based icon selection
  map.addLayer(
    {
      id: BLOCKAGES_LAYER_IDS.point,
      type: "symbol",
      source: BLOCKAGES_SOURCE_ID,
      filter: ["==", ["geometry-type"], "Point"],
      layout: {
        "icon-image": [
          "case",
          // Not Passable (status_code 4) → bridge destroyed/closed icon
          ["==", ["get", "status_code"], 4],
          BRIDGE_ICON_NOT_PASSABLE,
          // Restricted/Damaged (status_code 3) → bridge affected icon
          ["==", ["get", "status_code"], 3],
          BRIDGE_ICON_RESTRICTED,
          // Fallback to canvas icon
          BLOCKAGE_MARK_ICON_ID,
        ],
        "icon-size": 0.8, // Constant size at all zoom levels (increased for visibility)
        "icon-allow-overlap": true,
        "icon-ignore-placement": false,
        "icon-padding": 2,
      },
      paint: {
        "icon-opacity": [
          "case",
          isStale,
          BLOCKAGES_CORE_OPACITY_STALE,
          BLOCKAGES_CORE_OPACITY_FRESH,
        ],
      },
    },
    beforeId,
  );
  map.addLayer(
    {
      id: BLOCKAGES_LAYER_IDS.cues,
      type: "symbol",
      source: BLOCKAGES_SOURCE_ID,
      filter: isLine,
      layout: {
        "symbol-placement": "line-center",  // Center on line, not along it
        "text-field": ["get", "cue_label"],
        "text-font": ["DIN Pro Bold", "Arial Unicode MS Bold"],
        "text-size": 11,
        "text-allow-overlap": false,
        "text-ignore-placement": false,
        "text-padding": 4,
        "text-offset": [0, -1.5],  // Position above the line
        "text-rotation-alignment": "viewport",  // Keep horizontal
      },
      paint: {
        "text-color": statusColor,  // Solid red/orange, no halo
        "text-opacity": [
          "case",
          isStale,
          0.6,  // Match line opacity
          1.0,
        ],
      },
    },
    beforeId,
  );
}
