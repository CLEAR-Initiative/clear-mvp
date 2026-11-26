import { useEffect, useMemo, type CSSProperties, type RefObject } from "react";
import type { MapRef } from "react-map-gl/mapbox";

export type MapOffset = { top: number; right: number; bottom: number; left: number };

const OFFSET_TRANSITION_MS = 200;
const SIDES = ["top", "right", "bottom", "left"] as const;

export function useMapOffset(offset: Partial<MapOffset> | undefined): MapOffset {
  const { top = 0, right = 0, bottom = 0, left = 0 } = offset ?? {};
  return useMemo(() => ({ top, right, bottom, left }), [top, right, bottom, left]);
}

export function offsetCssVars(offset: MapOffset): CSSProperties {
  return Object.fromEntries(SIDES.map((side) => [`--map-offset-${side}`, `${offset[side]}px`])) as CSSProperties;
}

export function useEaseToOffset(mapRef: RefObject<MapRef | null>, offset: MapOffset, loaded: boolean) {
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loaded) return;
    const padding = map.getPadding();
    if (SIDES.every((side) => padding[side] === offset[side])) return;
    map.easeTo({ padding: offset, duration: OFFSET_TRANSITION_MS });
  }, [mapRef, offset, loaded]);
}
