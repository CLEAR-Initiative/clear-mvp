import { useEffect, useLayoutEffect, useState, type RefObject } from "react";
import type { MapRef } from "react-map-gl/mapbox";

const NAV_TRANSITION_MS = 200;

export function useInsetLeft(probeRef: RefObject<HTMLElement | null>): number | null {
  const [insetLeft, setInsetLeft] = useState<number | null>(null);

  useLayoutEffect(() => {
    const probe = probeRef.current;
    if (!probe) return;
    const measure = () => setInsetLeft(Math.round(probe.getBoundingClientRect().width));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(probe);
    return () => observer.disconnect();
  }, [probeRef]);

  return insetLeft;
}

export function useEaseToInset(mapRef: RefObject<MapRef | null>, insetLeft: number | null, loaded: boolean) {
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loaded || insetLeft == null) return;
    if (map.getPadding().left === insetLeft) return;
    map.easeTo({ padding: { left: insetLeft }, duration: NAV_TRANSITION_MS });
  }, [mapRef, insetLeft, loaded]);
}
