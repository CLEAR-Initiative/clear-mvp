import type { MapMarker } from "~/components/map/crisis-map";
import type { GqlSignalSite } from "~/lib/types/graphql";

/**
 * Minimap markers for a signal's other sites (the places its text names
 * beside the primary location). A site with no point is skipped. A site at the
 * same point as a marker already on the map is skipped, so one place gets one
 * marker. Ids continue from `firstId`. Sites take the primary pin's severity.
 */
export function siteMarkers(
  sites: readonly GqlSignalSite[] | null | undefined,
  firstId: number,
  existing: readonly Pick<MapMarker, "lng" | "lat">[] = [],
  /** The primary pin's severity, so site rings share its colour. */
  severity: MapMarker["severity"] = "medium",
): MapMarker[] {
  const taken = new Set(existing.map((m) => pointKey(m.lng, m.lat)));
  const markers: MapMarker[] = [];
  let id = firstId;
  for (const site of sites ?? []) {
    const geom = site.location.geometry;
    if (!geom || geom.type !== "Point") continue;
    const [lng, lat] = geom.coordinates as [number, number];
    if (typeof lng !== "number" || typeof lat !== "number") continue;
    const key = pointKey(lng, lat);
    if (taken.has(key)) continue;
    taken.add(key);
    const title = site.name ?? site.location.name;
    markers.push({ id: id++, lng, lat, title, severity, description: site.location.name, locationPinRole: "site" });
  }
  return markers;
}

function pointKey(lng: number, lat: number): string {
  return `${lng.toFixed(5)},${lat.toFixed(5)}`;
}
