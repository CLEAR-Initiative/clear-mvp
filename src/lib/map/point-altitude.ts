/**
 * Point altitude — sample DEM metres via Mapbox `queryTerrainElevation`
 * (unexaggerated). Shared by cursor HUD and Marker detail. Visual terrain
 * exaggeration must not affect these values.
 */

export type PointAltitudeMap = {
  queryTerrainElevation?: (
    lngLat: { lng: number; lat: number } | [number, number],
    options?: { exaggerated?: boolean },
  ) => number | null | undefined;
};

export type PointAltitudeResult =
  | { kind: "ok"; metres: number; displayMetres: string }
  | { kind: "unavailable" };

/** HUD / marker altitude chrome is Topography-only. */
export function shouldShowPointAltitude(
  baseMapType: "simple" | "topography" | "satellite",
): boolean {
  return baseMapType === "topography";
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

/** Soft qualifier tokens for UI (i18n maps these keys). */
export const POINT_ALTITUDE_QUALIFIER = {
  approx: "approx.",
  dem: "DEM",
} as const;
