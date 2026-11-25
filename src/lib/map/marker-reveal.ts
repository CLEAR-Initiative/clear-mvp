import type { Map as MapboxMap } from "mapbox-gl";
import { MAPBOX_GLOBE_MERCATOR_MORPH_MAX_ZOOM } from "./topography-terrain";

type Point = [number, number];

function longitudeNear(lng: number, reference: number) {
  return lng + 360 * Math.round((reference - lng) / 360);
}

function isVisible(map: MapboxMap, target: Point) {
  const point = map.project(target);
  const canvas = map.getCanvas();
  if (point.x < 0 || point.y < 0 || point.x > canvas.clientWidth || point.y > canvas.clientHeight) return false;
  // The far side of the globe also projects inside the canvas. Check which location faces us.
  if (map.getZoom() < MAPBOX_GLOBE_MERCATOR_MORPH_MAX_ZOOM && map.getProjection().name === "globe") {
    const surface = map.unproject(point);
    return Math.abs(surface.lat - target[1]) < 0.01 && Math.abs(longitudeNear(surface.lng, target[0]) - target[0]) < 0.01;
  }
  return true;
}

/** Frame the previous and new locations along a single flight ending at the analyst's zoom. */
export function createMarkerReveal(map: MapboxMap) {
  let originalZoom: number | undefined;

  function finished() {
    originalZoom = undefined;
  }

  function cancel() {
    if (originalZoom !== undefined) map.stop();
  }

  function reveal(target: Point, previous?: Point) {
    const zoom = originalZoom ?? map.getZoom();
    cancel();
    const visible = isVisible(map, target);
    // A retarget during the overview may already be visible at its temporary zoom.
    if (visible && Math.abs(map.getZoom() - zoom) < 0.01) return;

    const start = map.getCenter();
    const [lng, lat] = previous ?? start.toArray();
    // Include the actual camera start when the analyst has panned away from the old pin.
    // Keep all longitudes on the same side of the antimeridian as the destination.
    const longitudes = [longitudeNear(start.lng, target[0]), longitudeNear(lng, target[0]), target[0]];
    const latitudes = [start.lat, lat, target[1]];
    const overview = map.cameraForBounds([
      [Math.min(...longitudes), Math.min(...latitudes)],
      [Math.max(...longitudes), Math.max(...latitudes)],
    ], {
      padding: 40, maxZoom: zoom, bearing: map.getBearing(), pitch: map.getPitch(),
    });
    // Give both pins time in view as the camera passes the midpoint of its path.
    const margin = previous && !isVisible(map, previous) ? 1 : 0.5;
    map.stop();
    originalZoom = zoom;
    map.once("moveend", finished);
    // flyTo continuously pans through the widest view and respects reduced motion.
    map.flyTo({
      center: target, zoom, duration: 900,
      minZoom: visible ? map.getZoom() : (overview?.zoom ?? zoom) - margin,
      easing: (t) => (1 - Math.cos(Math.PI * t)) / 2,
    });
  }

  return { reveal, cancel };
}
