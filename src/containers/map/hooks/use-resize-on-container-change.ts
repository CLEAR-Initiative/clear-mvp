import { useEffect, type RefObject } from "react";
import type { MapRef } from "react-map-gl/mapbox";

const AFTER_NAV_TRANSITION_MS = 220;

// Mapbox only resizes its canvas on a window resize, not when the nav collapse widens the container.
export function useResizeOnContainerChange(mapRef: RefObject<MapRef | null>, loaded: boolean) {
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loaded) return;

    const container = map.getContainer();
    const canvas = map.getCanvas();
    let timer: ReturnType<typeof setTimeout> | undefined;

    const observer = new ResizeObserver(() => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        const widthChanged = Math.abs(container.clientWidth - canvas.clientWidth) > 1;
        const heightChanged = Math.abs(container.clientHeight - canvas.clientHeight) > 1;
        if (widthChanged || heightChanged) map.resize();
      }, AFTER_NAV_TRANSITION_MS);
    });

    observer.observe(container);
    return () => {
      observer.disconnect();
      clearTimeout(timer);
    };
  }, [mapRef, loaded]);
}
