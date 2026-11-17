import { useCallback } from "react";
import { createParser, useQueryStates } from "nuqs";
import { WORLD_VIEW } from "~/lib/constants/country-config";
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

const viewParsers = {
  center: createParser({ parse: parseCenter, serialize: serializeCenter }).withDefault(WORLD_VIEW.center),
  zoom: createParser({ parse: parseZoom, serialize: serializeZoom }).withDefault(WORLD_VIEW.zoom),
};

export function useMapView() {
  const [{ center, zoom }, setQuery] = useQueryStates(viewParsers, { throttleMs: 1000 });

  const setView = useCallback(
    (view: { center: LngLat; zoom: number }) => {
      void setQuery(view);
    },
    [setQuery],
  );

  return { center, zoom, setView };
}
