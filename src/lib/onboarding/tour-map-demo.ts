/** Custom event: Product Tour asks `/map` to demo cluster zoom + marker detail. */
export const TOUR_MAP_DEMO_EVENT = "clear-tour-map-demo";

export type TourMapDemoAction = "start" | "stop";

export interface TourMapDemoDetail {
  action: TourMapDemoAction;
}

export function requestTourMapDemo(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<TourMapDemoDetail>(TOUR_MAP_DEMO_EVENT, {
      detail: { action: "start" },
    }),
  );
}

/** Close the tour demo marker detail (e.g. Back from step 4 → step 3). */
export function stopTourMapDemo(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<TourMapDemoDetail>(TOUR_MAP_DEMO_EVENT, {
      detail: { action: "stop" },
    }),
  );
}

/** Prefer a pin with nearby neighbors so the fly-in reads as a cluster area. */
export function pickTourDemoMarker<T extends { id: number; lng: number; lat: number }>(
  markers: T[],
): T | null {
  if (markers.length === 0) return null;
  let best = markers[0]!;
  let bestNearby = 0;
  for (const m of markers) {
    let nearby = 0;
    for (const o of markers) {
      if (o.id === m.id) continue;
      if (Math.hypot(o.lng - m.lng, o.lat - m.lat) < 0.4) nearby += 1;
    }
    if (nearby > bestNearby) {
      bestNearby = nearby;
      best = m;
    }
  }
  return best;
}
