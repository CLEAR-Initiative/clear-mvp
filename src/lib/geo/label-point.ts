/**
 * Where a place's name goes on a map: one point inside its largest polygon,
 * near the middle. A centroid can fall outside a concave shape (a bent
 * district), so that case falls back to the middle of the widest stretch of
 * the polygon on the centroid's latitude, which is always inside.
 */

import { containsPoint } from "~/lib/analysis-view";

type Position = [number, number];
type Ring = Position[];

function isPosition(p: unknown): p is Position {
  return Array.isArray(p) && p.length >= 2 && Number.isFinite(p[0]) && Number.isFinite(p[1]);
}

/** Signed shoelace area (degrees², only compared, never shown). */
function ringArea(ring: Ring): number {
  let sum = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    sum += ring[j]![0] * ring[i]![1] - ring[i]![0] * ring[j]![1];
  }
  return sum / 2;
}

/** Area-weighted centroid; the vertex average for a degenerate ring. */
function ringCentroid(ring: Ring): Position | null {
  if (ring.length === 0) return null;
  const area = ringArea(ring);
  if (Math.abs(area) < 1e-12) {
    const [x, y] = ring.reduce(([sx, sy], [px, py]) => [sx + px, sy + py], [0, 0]);
    return [x / ring.length, y / ring.length];
  }
  let cx = 0;
  let cy = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [x0, y0] = ring[j]!;
    const [x1, y1] = ring[i]!;
    const f = x0 * y1 - x1 * y0;
    cx += (x0 + x1) * f;
    cy += (y0 + y1) * f;
  }
  return [cx / (6 * area), cy / (6 * area)];
}

/** Middle of the widest inside stretch along `lat` (even-odd over every ring). */
function widestStretch(polygon: Ring[], lat: number): Position | null {
  const xs: number[] = [];
  for (const ring of polygon) {
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [x0, y0] = ring[j]!;
      const [x1, y1] = ring[i]!;
      if (y0 > lat !== y1 > lat) xs.push(x0 + ((lat - y0) * (x1 - x0)) / (y1 - y0));
    }
  }
  xs.sort((a, b) => a - b);
  let best: Position | null = null;
  let width = -1;
  for (let i = 0; i + 1 < xs.length; i += 2) {
    const w = xs[i + 1]! - xs[i]!;
    if (w > width) {
      width = w;
      best = [(xs[i]! + xs[i + 1]!) / 2, lat];
    }
  }
  return best;
}

/** A label point for a Point, Polygon or MultiPolygon; null for anything else. */
export function labelPoint(geometry: unknown): Position | null {
  const geo = geometry as { type?: string; coordinates?: unknown } | null;
  if (!geo?.coordinates) return null;
  if (geo.type === "Point") return isPosition(geo.coordinates) ? [geo.coordinates[0], geo.coordinates[1]] : null;
  const polygons =
    geo.type === "Polygon" ? [geo.coordinates as Ring[]] : geo.type === "MultiPolygon" ? (geo.coordinates as Ring[][]) : [];

  let best: Ring[] | null = null;
  let bestArea = -1;
  for (const polygon of polygons) {
    const outer = polygon?.[0];
    if (!Array.isArray(outer) || outer.length < 3 || !outer.every(isPosition)) continue;
    const area = Math.abs(ringArea(outer));
    if (area > bestArea) {
      best = polygon;
      bestArea = area;
    }
  }
  if (!best) return null;

  const centroid = ringCentroid(best[0]!);
  if (centroid && containsPoint({ type: "Polygon", coordinates: best }, centroid)) return centroid;
  const ys = best[0]!.map(([, y]) => y);
  const lat = centroid?.[1] ?? (Math.min(...ys) + Math.max(...ys)) / 2;
  return widestStretch(best, lat) ?? centroid;
}
