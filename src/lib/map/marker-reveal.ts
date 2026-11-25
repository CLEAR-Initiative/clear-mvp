import type { Map as MapboxMap } from "mapbox-gl";
import { MAPBOX_GLOBE_MERCATOR_MORPH_MAX_ZOOM } from "./topography-terrain";

type Point = [number, number];
const FLIGHT_MS = 900;

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
    const margin = previous && !isVisible(map, previous) ? 1.5 : 1;
    map.stop();
    originalZoom = zoom;
    let flying = true;
    map.once("moveend", () => {
      flying = false;
      originalZoom = undefined;
    });
    // Allow a slow renderer to draw the overview even if it misses the nominal 900 ms.
    // flyTo still ends at the destination after a prolonged suspension, and respects reduced motion.
    const deadline = 4 * FLIGHT_MS;
    let midpointTime: number | undefined;
    map.flyTo({
      center: target, zoom, duration: deadline,
      minZoom: visible ? map.getZoom() : (overview?.zoom ?? zoom) - margin,
      easing: (t) => {
        if (t === 1) return 1;
        // Mapbox samples elapsed time on render frames. On a slow renderer the next
        // frame can jump past both pins. Paint the midpoint and ease on from there.
        const elapsed = t * deadline;
        if (elapsed >= FLIGHT_MS / 2) midpointTime ??= elapsed;
        const progress = midpointTime === undefined ? elapsed / FLIGHT_MS : 0.5 + (elapsed - midpointTime) / FLIGHT_MS;
        if (progress >= 1) {
          // Finish after Mapbox applies this last frame. A newer selection can interrupt it.
          queueMicrotask(() => { if (flying) map.stop(); });
          return 1;
        }
        // Ease at both ends and slow slightly through the overview without stopping there.
        const offset = -Math.cos(Math.PI * progress);
        return 0.5 + (offset + offset ** 3) / 4;
      },
    });
  }

  return { reveal, cancel };
}
