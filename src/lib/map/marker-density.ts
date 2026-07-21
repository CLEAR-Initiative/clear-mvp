/**
 * Marker density mode zoom ladder for `/map`.
 *
 * Deterministic bands (no overlap — one mode at a time from the settled zoom).
 * Heatmap → donut shares the Country-band floor with road visibility
 * (`docs/map-design.md`: Region 0–4, Country 5–8, Area 9–11).
 *
 * - heatmap  z < 5
 * - donut    5 ≤ z ≤ 8
 * - point    z > 8
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

export type DensityAggregationMode = "heatmap" | "donut" | "point";

export function aggregationModeForZoom(zoom: number): DensityAggregationMode {
  // Strictly below country band → heatmap; at the floor → donuts (+ roads).
  if (zoom < DENSITY_COUNTRY_BAND_MIN_ZOOM) return "heatmap";
  if (zoom <= DENSITY_DONUT_MAX_ZOOM) return "donut";
  return "point";
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
