/**
 * Point altitude — sample DEM metres via Mapbox `queryTerrainElevation`
 * (unexaggerated). Shared by the Topography hover probe and Marker detail.
 * Visual terrain exaggeration must not affect these values.
 */

export type PointAltitudeMap = {
  queryTerrainElevation?: (
    lngLat: { lng: number; lat: number } | [number, number],
    options?: { exaggerated?: boolean },
  ) => number | null | undefined;
  project?: (
    lngLat: { lng: number; lat: number } | [number, number],
  ) => { x: number; y: number };
};

/**
 * Max screen-px gap between the pointer and `project(lngLat)` before we treat
 * the hover as sky. Pitched Mapbox clamps `lngLat` to the terrain silhouette
 * over empty sky, so the projected point sticks on the horizon while the
 * cursor keeps moving — that gap is the sky signal.
 */
export const TERRAIN_POINTER_SLACK_PX = 8;

export type PointAltitudeResult =
  | { kind: "ok"; metres: number; displayMetres: string }
  | { kind: "unavailable" };

/** Hover probe + marker altitude chrome are Topography-only. */
export function shouldShowPointAltitude(
  baseMapType: "simple" | "topography" | "satellite",
): boolean {
  return baseMapType === "topography";
}

/** Probe label under the orange hover dot (compact — no card chrome). */
export function formatAltitudeProbeLabel(
  altitude: PointAltitudeResult,
  unavailableLabel = "—",
): string {
  return altitude.kind === "ok" ? altitude.displayMetres : unavailableLabel;
}

/** Round to whole metres for soft approx display (not survey grade). */
export function formatAltitudeMetres(metres: number): string {
  if (!Number.isFinite(metres)) return "";
  const rounded = Math.round(metres);
  return `${rounded} m`;
}

export function toPointAltitudeResult(
  metres: number | null | undefined,
): PointAltitudeResult {
  if (metres == null || !Number.isFinite(metres)) {
    return { kind: "unavailable" };
  }
  return {
    kind: "ok",
    metres,
    displayMetres: formatAltitudeMetres(metres),
  };
}

/**
 * Sample unexaggerated DEM elevation at a lng/lat.
 * Returns unavailable when terrain mesh is off or the DEM tile is not loaded.
 */
export function samplePointAltitude(
  map: PointAltitudeMap | null | undefined,
  lng: number,
  lat: number,
): PointAltitudeResult {
  if (!map?.queryTerrainElevation) return { kind: "unavailable" };
  if (!Number.isFinite(lng) || !Number.isFinite(lat)) {
    return { kind: "unavailable" };
  }
  try {
    const metres = map.queryTerrainElevation(
      { lng, lat },
      { exaggerated: false },
    );
    return toPointAltitudeResult(metres);
  } catch {
    return { kind: "unavailable" };
  }
}

/**
 * True when the pointer is over the terrain/globe surface (not pitched sky).
 * Uses screen delta between the real pointer and `project(event.lngLat)`.
 */
export function isPointerOverTerrain(
  map: PointAltitudeMap | null | undefined,
  pointer: { x: number; y: number },
  lngLat: { lng: number; lat: number },
  slackPx: number = TERRAIN_POINTER_SLACK_PX,
): boolean {
  if (!map?.project) return true;
  if (
    !Number.isFinite(pointer.x) ||
    !Number.isFinite(pointer.y) ||
    !Number.isFinite(lngLat.lng) ||
    !Number.isFinite(lngLat.lat)
  ) {
    return false;
  }
  try {
    const projected = map.project([lngLat.lng, lngLat.lat]);
    const dx = projected.x - pointer.x;
    const dy = projected.y - pointer.y;
    return Math.hypot(dx, dy) <= slackPx;
  } catch {
    return false;
  }
}

/** Soft qualifier tokens for UI (i18n maps these keys). */
export const POINT_ALTITUDE_QUALIFIER = {
  approx: "approx.",
  dem: "DEM",
} as const;
