/**
 * USGS FDSN query helpers — bbox from the map country toggle, not a hardcoded
 * Venezuela rectangle. Spike + (later) clear-api share this contract:
 * `bbox=minLng,minLat,maxLng,maxLat` or omit for global.
 */

import { staticCountryBounds } from "~/lib/constants/country-config";

export type LngLatBbox = [number, number, number, number];

/** Country views: M4+ so regional events (e.g. Hindu Kush) are visible. */
export const COUNTRY_MIN_MAGNITUDE = 4.0;
/** All Countries: worldwide M5.5+ — M4+ global is thousands of points. */
export const GLOBAL_MIN_MAGNITUDE = 5.5;
/** Pad past borders so adjacent-plate events still paint. ~250 km. */
export const SEISMIC_BBOX_PAD_DEG = 2.5;

export const USGS_FDSN_BASE = "https://earthquake.usgs.gov/fdsnws/event/1/query";

export function padBbox(bbox: LngLatBbox, padDeg: number): LngLatBbox {
  return [
    Math.max(-180, bbox[0] - padDeg),
    Math.max(-90, bbox[1] - padDeg),
    Math.min(180, bbox[2] + padDeg),
    Math.min(90, bbox[3] + padDeg),
  ];
}

/**
 * Padded focus bbox for a map country. `All Countries` / unknown → null (global).
 */
export function seismicQueryBboxForCountry(
  countryName: string | undefined,
): LngLatBbox | null {
  if (!countryName || countryName === "All Countries") return null;
  const bounds = staticCountryBounds(countryName);
  if (!bounds) return null;
  return padBbox(bounds, SEISMIC_BBOX_PAD_DEG);
}

export function minMagnitudeForBbox(bbox: LngLatBbox | null): number {
  return bbox ? COUNTRY_MIN_MAGNITUDE : GLOBAL_MIN_MAGNITUDE;
}

export function formatBboxParam(bbox: LngLatBbox): string {
  return bbox.join(",");
}

export function parseBboxParam(
  raw: string | null | undefined,
): LngLatBbox | null {
  if (!raw?.trim()) return null;
  const parts = raw.split(",").map((p) => Number(p.trim()));
  if (parts.length !== 4 || parts.some((n) => !Number.isFinite(n))) return null;
  const [minLng, minLat, maxLng, maxLat] = parts as LngLatBbox;
  if (minLng < -180 || maxLng > 180 || minLat < -90 || maxLat > 90) return null;
  if (minLng >= maxLng || minLat >= maxLat) return null;
  return [minLng, minLat, maxLng, maxLat];
}

export function buildUsgsFdsnUrl(opts: {
  minMagnitude: number;
  startTime: Date;
  bbox: LngLatBbox | null;
}): URL {
  const url = new URL(USGS_FDSN_BASE);
  url.searchParams.set("format", "geojson");
  url.searchParams.set("eventtype", "earthquake");
  url.searchParams.set("minmagnitude", String(opts.minMagnitude));
  url.searchParams.set("starttime", opts.startTime.toISOString());
  url.searchParams.set("orderby", "time");
  url.searchParams.set("limit", "20000");
  if (opts.bbox) {
    url.searchParams.set("minlongitude", String(opts.bbox[0]));
    url.searchParams.set("minlatitude", String(opts.bbox[1]));
    url.searchParams.set("maxlongitude", String(opts.bbox[2]));
    url.searchParams.set("maxlatitude", String(opts.bbox[3]));
  }
  return url;
}
