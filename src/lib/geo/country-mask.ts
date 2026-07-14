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
 * Count vertices on all exterior rings (closing duplicate not counted twice).
 */
function exteriorVertexCount(geometry: Geometry): number {
  const rings: Position[][] = [];
  if (geometry.type === "Polygon") {
    const outer = (geometry as { coordinates: Position[][] }).coordinates[0];
    if (outer) rings.push(outer);
  } else if (geometry.type === "MultiPolygon") {
    for (const poly of (geometry as { coordinates: Position[][][] }).coordinates) {
      const outer = poly[0];
      if (outer) rings.push(outer);
    }
  }
  let count = 0;
  for (const ring of rings) {
    if (ring.length === 0) continue;
    const first = ring[0]!;
    const last = ring[ring.length - 1]!;
    const closed =
      ring.length > 1 && first[0] === last[0] && first[1] === last[1];
    count += closed ? ring.length - 1 : ring.length;
  }
  return count;
}

/**
 * True when a polygon is (or looks like) an axis-aligned envelope — the shape
 * local `clear-api` seed writes for Sudan L0/L1 (`MULTIPOLYGON` with 4 corners).
 * Real OCHA COD boundaries have far more vertices; those must keep painting.
 */
export function isBboxLikeGeometry(geometry: Geometry | null | undefined): boolean {
  if (!geometry) return false;
  if (geometry.type !== "Polygon" && geometry.type !== "MultiPolygon") return false;

  const vertices = exteriorVertexCount(geometry);
  // Seed bboxes are 4 corners (+ optional close). Allow a little slack for
  // accidental duplicate points, but reject anything resembling a real boundary.
  if (vertices === 0 || vertices > 6) return false;

  const lngs = new Set<number>();
  const lats = new Set<number>();
  const visit = (pt: Position) => {
    lngs.add(pt[0]);
    lats.add(pt[1]);
  };

  if (geometry.type === "Polygon") {
    for (const ring of (geometry as { coordinates: Position[][] }).coordinates) {
      for (const pt of ring) visit(pt);
    }
  } else {
    for (const poly of (geometry as { coordinates: Position[][][] }).coordinates) {
      for (const ring of poly) for (const pt of ring) visit(pt);
    }
  }

  // Axis-aligned rectangle: exactly two distinct longitudes and latitudes.
  return lngs.size === 2 && lats.size === 2;
}

/** Polygon/MultiPolygon suitable for fill/outline layers (not a seed bbox). */
export function isPaintableBoundaryGeometry(
  geometry: Geometry | null | undefined,
): boolean {
  if (!geometry) return false;
  if (geometry.type !== "Polygon" && geometry.type !== "MultiPolygon") return false;
  return !isBboxLikeGeometry(geometry);
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
