/**
 * Marker density mode zoom ladder for `/map`.
 *
 * Heatmap → donut shares the Country-band floor with road visibility
 * (`docs/map-design.md`: Region 0–4, Country 5–8, Area 9–11).
 *
 * Settled bands:
 * - heatmap  z < 5
 * - donut    5 ≤ z ≤ 8
 * - point    z > 8
 *
 * Across the heatmap↔marker boundary a short crossfade band keeps both
 * visible so zoom never blanks.
 */

/**
 * Country-band floor — trunk road corridors become readable and heatmap
 * yields to numbered donuts at this zoom (same moment).
 */
export const DENSITY_COUNTRY_BAND_MIN_ZOOM = 5;

/**
 * Inclusive upper bound used in heatmap paint stops (intensity/radius).
 * Mode switching uses `zoom < DENSITY_COUNTRY_BAND_MIN_ZOOM` so donuts and
 * roads appear together at the country-band floor.
 */
export const DENSITY_HEATMAP_MAX_ZOOM = DENSITY_COUNTRY_BAND_MIN_ZOOM;

/** Mapbox `clusterMaxZoom` — clusters expand to points above this. */
export const DENSITY_DONUT_MAX_ZOOM = 8;

/**
 * Half-width of the heatmap↔marker opacity blend (zoom units).
 * At the country-band floor both sit near 50% so zoom never blanks.
 */
export const DENSITY_CROSSFADE_HALF = 0.75;

/** Peak heatmap paint opacity while fully in heatmap mode. */
export const DENSITY_HEATMAP_PEAK_OPACITY = 0.85;

export type DensityAggregationMode = "heatmap" | "donut" | "point";

export function aggregationModeForZoom(zoom: number): DensityAggregationMode {
  // Strictly below country band → heatmap; at the floor → donuts (+ roads).
  if (zoom < DENSITY_COUNTRY_BAND_MIN_ZOOM) return "heatmap";
  if (zoom <= DENSITY_DONUT_MAX_ZOOM) return "donut";
  return "point";
}

function clamp01(n: number): number {
  if (n <= 0) return 0;
  if (n >= 1) return 1;
  return n;
}

/**
 * Heatmap opacity (0…peak) for the current zoom.
 * Full below the blend, zero above it; linear through the crossfade band.
 */
export function heatmapOpacityForZoom(zoom: number): number {
  const lo = DENSITY_COUNTRY_BAND_MIN_ZOOM - DENSITY_CROSSFADE_HALF;
  const hi = DENSITY_COUNTRY_BAND_MIN_ZOOM + DENSITY_CROSSFADE_HALF;
  if (zoom <= lo) return DENSITY_HEATMAP_PEAK_OPACITY;
  if (zoom >= hi) return 0;
  const t = (zoom - lo) / (hi - lo);
  return DENSITY_HEATMAP_PEAK_OPACITY * (1 - clamp01(t));
}

/**
 * DOM marker (donut/point) opacity for the current zoom — inverse of heatmap
 * across the same crossfade band so the two dissolve through each other.
 */
export function markerOpacityForZoom(zoom: number): number {
  const lo = DENSITY_COUNTRY_BAND_MIN_ZOOM - DENSITY_CROSSFADE_HALF;
  const hi = DENSITY_COUNTRY_BAND_MIN_ZOOM + DENSITY_CROSSFADE_HALF;
  if (zoom <= lo) return 0;
  if (zoom >= hi) return 1;
  return clamp01((zoom - lo) / (hi - lo));
}

/** True when donut/point DOM should be mounted (any visible marker opacity). */
export function markersShouldMount(zoom: number): boolean {
  return markerOpacityForZoom(zoom) > 0.02;
}

export const SEVERITY_ORDER = ["critical", "high", "medium", "low"] as const;
export type DonutSeverity = (typeof SEVERITY_ORDER)[number];

/**
 * Center label for a severity donut — clustered item count in the active view.
 * Caps display at 999+ for dense clusters.
 */
export function donutCenterLabel(props: { point_count?: number | null }): string {
  const total = Math.max(0, Number(props.point_count ?? 0));
  if (total > 999) return "999+";
  return String(total);
}

/** Active-view cluster size used for donut sizing / count semantics. */
export function donutCenterCount(props: { point_count?: number | null }): number {
  return Math.max(0, Number(props.point_count ?? 0));
}

export interface DonutSeveritySegment {
  severity: DonutSeverity;
  count: number;
}

/** Severity ring segments from Mapbox clusterProperties aggregates. */
export function donutSeveritySegments(
  props: Partial<Record<DonutSeverity, number | null | undefined>>,
): DonutSeveritySegment[] {
  return SEVERITY_ORDER.map((severity) => ({
    severity,
    count: Math.max(0, Number(props[severity] ?? 0)),
  })).filter((s) => s.count > 0);
}
