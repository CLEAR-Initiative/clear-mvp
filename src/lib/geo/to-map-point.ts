/**
 * Convert any GeoJSON geometry to a Point for map markers.
 * - Point geometries pass through unchanged
 * - Polygon/MultiPolygon geometries are replaced with their centroid as a Point
 * - Other/invalid geometries return null
 *
 * This strips heavy polygon payloads from location data before sending to the browser,
 * keeping only the point coordinates needed to render map markers.
 */

type PointGeometry = {
  type: "Point";
  coordinates: [number, number];
};

type PolygonGeometry = {
  type: "Polygon";
  coordinates: number[][][];
};

type MultiPolygonGeometry = {
  type: "MultiPolygon";
  coordinates: number[][][][];
};

type Geometry = PointGeometry | PolygonGeometry | MultiPolygonGeometry | { type: string; coordinates?: unknown };

/**
 * Convert a GeoJSON geometry to a Point (passthrough for Point, centroid for Polygon/MultiPolygon).
 * Returns null if the geometry is invalid or cannot be converted.
 */
export function toMapPointGeometry(geometry: Geometry | null | undefined): PointGeometry | null {
  if (!geometry) return null;

  // Point: pass through unchanged
  if (geometry.type === "Point") {
    const coords = (geometry as PointGeometry).coordinates;
    if (Array.isArray(coords) && coords.length >= 2) {
      const [lng, lat] = coords;
      if (typeof lng === "number" && typeof lat === "number" && Number.isFinite(lng) && Number.isFinite(lat)) {
        return { type: "Point", coordinates: [lng, lat] };
      }
    }
    return null;
  }

  // Polygon: compute centroid of the outer ring
  if (geometry.type === "Polygon") {
    const ring = (geometry as PolygonGeometry).coordinates?.[0];
    if (ring?.length) {
      let sumLng = 0;
      let sumLat = 0;
      let count = 0;
      
      for (const pt of ring) {
        if (Array.isArray(pt) && pt.length >= 2) {
          const [lng, lat] = pt;
          if (typeof lng === "number" && typeof lat === "number" && Number.isFinite(lng) && Number.isFinite(lat)) {
            sumLng += lng;
            sumLat += lat;
            count++;
          }
        }
      }
      
      if (count > 0) {
        return {
          type: "Point",
          coordinates: [sumLng / count, sumLat / count],
        };
      }
    }
    return null;
  }

  // MultiPolygon: compute centroid of all outer rings
  if (geometry.type === "MultiPolygon") {
    const polygons = (geometry as MultiPolygonGeometry).coordinates ?? [];
    let sumLng = 0;
    let sumLat = 0;
    let count = 0;
    
    for (const polygon of polygons) {
      const ring = polygon?.[0];
      if (ring) {
        for (const pt of ring) {
          if (Array.isArray(pt) && pt.length >= 2) {
            const [lng, lat] = pt;
            if (typeof lng === "number" && typeof lat === "number" && Number.isFinite(lng) && Number.isFinite(lat)) {
              sumLng += lng;
              sumLat += lat;
              count++;
            }
          }
        }
      }
    }
    
    if (count > 0) {
      return {
        type: "Point",
        coordinates: [sumLng / count, sumLat / count],
      };
    }
    return null;
  }

  // Other geometry types: not supported
  return null;
}

/**
 * Sanitize a location object by replacing its geometry with a map-friendly Point.
 * Mutates the location object in place for efficiency (tRPC layer after fetch).
 */
export function sanitizeLocationGeometry<T extends { geometry?: unknown }>(
  location: T | null | undefined,
): T | null {
  if (!location) return null;
  
  const pointGeom = toMapPointGeometry(location.geometry as Geometry);
  if (pointGeom) {
    location.geometry = pointGeom;
  } else {
    // If we can't extract a point, remove the geometry entirely rather than shipping invalid data
    location.geometry = undefined;
  }
  
  return location;
}
