import { useCallback, useMemo } from "react";
import { createParser, useQueryStates } from "nuqs";
import { ZOOM_RANGE } from "../constants";

export type LngLat = [number, number];

function parseNumber(value: string): number | null {
  if (value.trim() === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export function parseCenter(value: string): LngLat | null {
  const parts = value.split(",");
  if (parts.length !== 2) return null;
  const [lng, lat] = parts.map(parseNumber);
  if (lng == null || lat == null) return null;
  if (lng < -180 || lng > 180 || lat < -90 || lat > 90) return null;
  return [lng, lat];
}

export function serializeCenter([lng, lat]: LngLat): string {
  return `${Number(lng.toFixed(5))},${Number(lat.toFixed(5))}`;
}

export function parseZoom(value: string): number | null {
  const zoom = parseNumber(value);
  if (zoom == null || zoom < ZOOM_RANGE.min || zoom > ZOOM_RANGE.max) return null;
  return zoom;
}

export function serializeZoom(zoom: number): string {
  return String(Number(zoom.toFixed(1)));
}

export type MapView = { center: LngLat; zoom: number };

export function isSameView(a: MapView, b: MapView): boolean {
  return serializeCenter(a.center) === serializeCenter(b.center) && serializeZoom(a.zoom) === serializeZoom(b.zoom);
}

const viewParsers = {
  center: createParser({ parse: parseCenter, serialize: serializeCenter }),
  zoom: createParser({ parse: parseZoom, serialize: serializeZoom }),
};

export function useMapView() {
  const [{ center, zoom }, setQuery] = useQueryStates(viewParsers, { throttleMs: 1000 });

  const setView = useCallback(
    (view: MapView) => {
      void setQuery(view);
    },
    [setQuery],
  );

  const lng = center?.[0];
  const lat = center?.[1];
  const view = useMemo<MapView | null>(
    () => (lng != null && lat != null && zoom != null ? { center: [lng, lat], zoom } : null),
    [lng, lat, zoom],
  );

  return { view, setView };
}
