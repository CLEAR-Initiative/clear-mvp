/**
 * Fan out markers that share (nearly) the same coordinates so stacked pins
 * become separately clickable after a cluster expands.
 *
 * Cluster badges still count real entities; this only affects point placement.
 */

export interface SpiderfyPoint {
  id: string | number;
  lng: number;
  lat: number;
}

/** ~11m grid — matches the manual QA stacked-pin diagnostic. */
export const SPIDERFY_GRID_DECIMALS = 4;

/** Base ring radius in degrees (~220m at equator). */
export const SPIDERFY_BASE_RADIUS_DEG = 0.002;

function positionKey(lng: number, lat: number, decimals: number): string {
  return `${lng.toFixed(decimals)},${lat.toFixed(decimals)}`;
}

/**
 * Returns a map of id → display [lng, lat]. Loners keep their original point;
 * coincident groups are placed on a small ring around the shared location.
 */
export function spiderfyCoincidentLngLats(
  points: SpiderfyPoint[],
  opts?: { gridDecimals?: number; baseRadiusDeg?: number },
): Map<string | number, [number, number]> {
  const decimals = opts?.gridDecimals ?? SPIDERFY_GRID_DECIMALS;
  const baseRadius = opts?.baseRadiusDeg ?? SPIDERFY_BASE_RADIUS_DEG;
  const out = new Map<string | number, [number, number]>();

  const groups = new Map<string, SpiderfyPoint[]>();
  for (const p of points) {
    const key = positionKey(p.lng, p.lat, decimals);
    const list = groups.get(key);
    if (list) list.push(p);
    else groups.set(key, [p]);
  }

  for (const group of groups.values()) {
    if (group.length === 1) {
      const only = group[0]!;
      out.set(only.id, [only.lng, only.lat]);
      continue;
    }

    const anchorLng =
      group.reduce((sum, p) => sum + p.lng, 0) / group.length;
    const anchorLat =
      group.reduce((sum, p) => sum + p.lat, 0) / group.length;
    const n = group.length;
    // Slightly widen the ring when many pins share a point.
    const radius = baseRadius * (1 + 0.12 * Math.max(0, n - 2));
    const cosLat = Math.max(0.2, Math.cos((anchorLat * Math.PI) / 180));

    group.forEach((p, i) => {
      // Start at due-east so pairs (n=2) separate in longitude, not only latitude.
      const angle = (2 * Math.PI * i) / n;
      const lng = anchorLng + (radius * Math.cos(angle)) / cosLat;
      const lat = anchorLat + radius * Math.sin(angle);
      out.set(p.id, [lng, lat]);
    });
  }

  return out;
}
