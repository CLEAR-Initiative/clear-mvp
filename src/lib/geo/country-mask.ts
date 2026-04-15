/**
 * Inverts a country GeoJSON into a "mask" polygon: the whole world as the
 * outer ring, with the country's outer rings punched out as holes.
 *
 * Used by the map to dim every country except the focus country without
 * loading a world-countries dataset.
 */

type Position = [number, number];

type Geometry =
  | { type: "Polygon"; coordinates: Position[][] }
  | { type: "MultiPolygon"; coordinates: Position[][][] }
  | { type: string; coordinates: unknown };

/**
 * World outer ring, slightly inset from ±180 / ±90 to dodge Mercator
 * projection artefacts at the poles.
 */
const WORLD_RING: Position[] = [
  [-180, -85],
  [180, -85],
  [180, 85],
  [-180, 85],
  [-180, -85],
];

export interface MaskPolygon {
  type: "Polygon";
  coordinates: Position[][];
}

/**
 * Build a world-minus-country polygon. Returns null if the geometry isn't a
 * Polygon / MultiPolygon (e.g. a Point for a city, where masking makes no
 * sense).
 */
export function buildCountryMask(geometry: Geometry | null | undefined): MaskPolygon | null {
  if (!geometry) return null;

  if (geometry.type === "Polygon") {
    const g = geometry as { type: "Polygon"; coordinates: Position[][] };
    const outer = g.coordinates[0];
    if (!outer) return null;
    return { type: "Polygon", coordinates: [WORLD_RING, outer] };
  }

  if (geometry.type === "MultiPolygon") {
    const g = geometry as { type: "MultiPolygon"; coordinates: Position[][][] };
    const holes = g.coordinates.map((poly) => poly[0]).filter(Boolean) as Position[][];
    if (holes.length === 0) return null;
    return { type: "Polygon", coordinates: [WORLD_RING, ...holes] };
  }

  return null;
}

/**
 * Compute a bounding box for a Polygon or MultiPolygon geometry.
 * Returns [west, south, east, north] or null.
 */
export function geometryBounds(
  geometry: Geometry | null | undefined,
): [number, number, number, number] | null {
  if (!geometry) return null;

  let minLng = Infinity;
  let minLat = Infinity;
  let maxLng = -Infinity;
  let maxLat = -Infinity;

  const visit = (coords: Position) => {
    const [lng, lat] = coords;
    if (lng < minLng) minLng = lng;
    if (lat < minLat) minLat = lat;
    if (lng > maxLng) maxLng = lng;
    if (lat > maxLat) maxLat = lat;
  };

  if (geometry.type === "Polygon") {
    const g = geometry as { coordinates: Position[][] };
    for (const ring of g.coordinates) for (const pt of ring) visit(pt);
  } else if (geometry.type === "MultiPolygon") {
    const g = geometry as { coordinates: Position[][][] };
    for (const poly of g.coordinates) for (const ring of poly) for (const pt of ring) visit(pt);
  } else {
    return null;
  }

  if (!isFinite(minLng)) return null;
  return [minLng, minLat, maxLng, maxLat];
}
