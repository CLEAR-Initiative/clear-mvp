/**
 * USGS Seismic Signals data source — single swap point for spike → clear-api.
 *
 * ## Delivery model (one clear-mvp paint path)
 *
 * The map paints against a **stable contract** (`SeismicMapCollection`).
 * Do **not** call earthquake.usgs.gov from the browser. The client fetches
 * same-origin `/api/usgs/earthquakes` (BFF → clear-api with session cookie).
 * Local development without clear-api falls back to the spike route.
 *
 * | Phase | Source | UI |
 * |-------|--------|-----|
 * | Local + Vercel preview | `GET /api/dev/usgs-earthquakes` (live USGS FDSN) | Layers toggle |
 * | Production (clear-api) | `GET /api/usgs/earthquakes` BFF | Same toggle |
 *
 * Optional override: `NEXT_PUBLIC_USGS_EARTHQUAKES_URL` (must be a **plain**
 * Vercel env — Sensitive/`encrypted` vars are not available at Next build time).
 *
 * Spec: `docs/clear-api-usgs-seismic-ingest.md` · Expo #465
 */

import type { SeismicMapCollection } from "~/lib/map/usgs-earthquakes";
import {
  formatBboxParam,
  type LngLatBbox,
} from "~/lib/map/usgs-fdsn-query";

const SPIKE_PATH = "/api/dev/usgs-earthquakes";
/** Same-origin BFF that forwards cookies to clear-api `/api/usgs/earthquakes`. */
export const EARTHQUAKES_BFF_PATH = "/api/usgs/earthquakes";

/**
 * True when Layers → Seismic activity should be an interactive toggle (not Coming soon).
 * Always on — the spike is live USGS in dev, BFF in prod. Do not gate on NEXT_PUBLIC_*:
 * Sensitive Vercel envs are runtime-only.
 */
export function isSeismicSignalsUiEnabled(): boolean {
  return true;
}

/**
 * Live USGS spike is for `next dev` and Vercel Preview. Production (`VERCEL_ENV=production`)
 * uses the BFF → clear-api path. Preview must not hit that BFF until ingest exists —
 * Vercel builds with `NODE_ENV=production`, so a NODE_ENV-only check 404s the spike
 * and proxies `/api/usgs/earthquakes` to a missing clear-api route.
 *
 * `NEXT_PUBLIC_VERCEL_ENV` is inlined into the client bundle at build time.
 */
export function isUsgsSpikeAllowed(): boolean {
  if (process.env.NODE_ENV === "development") return true;
  const vercelEnv =
    process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.VERCEL_ENV;
  return vercelEnv === "preview";
}

/**
 * Resolve the GeoJSON URL.
 * Prefer env override; else spike in development/preview; else BFF in production.
 * Callers must gate on `isSeismicSignalsUiEnabled()` first.
 * Optional `bbox` is the map country (padded); omit for All Countries / global.
 */
export function getSeismicSignalsFetchUrl(query?: {
  bbox?: LngLatBbox | null;
  start?: string | null;
  end?: string | null;
}): string {
  const fromEnv = process.env.NEXT_PUBLIC_USGS_EARTHQUAKES_URL?.trim();
  const path = fromEnv
    ? fromEnv
    : isUsgsSpikeAllowed()
      ? SPIKE_PATH
      : EARTHQUAKES_BFF_PATH;
  const params = new URLSearchParams();
  if (query?.bbox) params.set("bbox", formatBboxParam(query.bbox));
  if (query?.start) params.set("start", query.start);
  if (query?.end) params.set("end", query.end);
  const qs = params.toString();
  if (!qs) return path;
  const joiner = path.includes("?") ? "&" : "?";
  return `${path}${joiner}${qs}`;
}

export type FetchSeismicSignalsResult = {
  collection: SeismicMapCollection;
  /** `spike` = local dev route; `api` = BFF / clear-api (any URL via env). */
  source: "spike" | "api";
};

export async function fetchSeismicSignalsMapCollection(opts?: {
  bbox?: LngLatBbox | null;
  start?: string | null;
  end?: string | null;
  init?: RequestInit;
}): Promise<FetchSeismicSignalsResult> {
  const url = getSeismicSignalsFetchUrl({
    bbox: opts?.bbox,
    start: opts?.start,
    end: opts?.end,
  });
  const pathOnly = url.split("?")[0] ?? url;
  const source: "spike" | "api" =
    pathOnly === SPIKE_PATH || pathOnly.endsWith(SPIKE_PATH) ? "spike" : "api";

  const res = await fetch(url, {
    ...opts?.init,
    // Same-origin BFF needs cookies; harmless for spike. Absolute clear-api
    // URLs also need this + CORS credentials (prefer the BFF instead).
    credentials: "include",
    headers: {
      Accept: "application/json",
      ...opts?.init?.headers,
    },
  });

  const body = (await res.json()) as SeismicMapCollection & {
    error?: string;
  };

  if (!res.ok) {
    throw new Error(body.error ?? `Seismic activity fetch failed (HTTP ${res.status})`);
  }

  if (body.type !== "FeatureCollection" || !Array.isArray(body.features)) {
    throw new Error("Seismic activity response is not a FeatureCollection");
  }

  return { collection: body, source };
}

/** Compact Layers-panel hint from meta (feature count + reduction). */
export function seismicSignalsHintFromMeta(
  collection: SeismicMapCollection,
  source: "spike" | "api",
): string {
  const kin = collection.meta?.bytes_in ?? 0;
  const kout = collection.meta?.bytes_out ?? 0;
  const n = collection.meta?.feature_count ?? collection.features.length;
  const pct = kin > 0 ? Math.round((1 - kout / kin) * 100) : null;
  const sizeBit = pct != null ? ` · −${pct}%` : "";
  const srcBit = source === "spike" ? " · spike" : "";
  return `${n} event${n === 1 ? "" : "s"}${sizeBit}${srcBit}`;
}
