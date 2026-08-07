/**
 * Blockages data source — single swap point for spike → clear-api.
 *
 * ## Delivery model (one clear-mvp paint path)
 *
 * The map paints against a **stable contract** (`BlockagesMapCollection`).
 * Do **not** call LogIE ArcGIS from the browser. The client fetches same-origin
 * `/api/logie/blockages` (BFF → clear-api with session cookie). Local development
 * without clear-api still falls back to the disk spike route.
 *
 * | Phase | Source | UI |
 * |-------|--------|-----|
 * | Local spike (#280) | `GET /api/dev/logie-blockages` (disk dump) | Layers toggle |
 * | clear-api ready | `GET /api/logie/blockages` BFF | Same toggle (default outside development) |
 *
 * Optional override: `NEXT_PUBLIC_LOGIE_BLOCKAGES_URL` (must be a **plain**
 * Vercel env — Sensitive/`encrypted` vars are not available at Next build time,
 * so they never inline into the client bundle).
 *
 * Spec: `docs/clear-api-logie-ingest.md` · ADR-0003
 */

import type { BlockagesMapCollection } from "~/lib/map/logie-blockages";

const SPIKE_PATH = "/api/dev/logie-blockages";
/** Same-origin BFF that forwards cookies to clear-api `/api/logie/blockages`. */
export const BLOCKAGES_BFF_PATH = "/api/logie/blockages";

/**
 * True when Layers → Blockages should be an interactive toggle (not Coming soon).
 * Always on — the BFF is the product default. Do not gate on NEXT_PUBLIC_*:
 * Sensitive Vercel envs are runtime-only and leave the client stub stuck on
 * Coming soon even when the value looks correct in the dashboard.
 */
export function isBlockagesUiEnabled(): boolean {
  return true;
}

/**
 * Resolve the GeoJSON URL.
 * Prefer env override; else BFF in preview/prod; else local spike in development.
 * Callers must gate on `isBlockagesUiEnabled()` first.
 */
export function getBlockagesFetchUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_LOGIE_BLOCKAGES_URL?.trim();
  if (fromEnv) return fromEnv;
  if (process.env.NODE_ENV === "development") return SPIKE_PATH;
  return BLOCKAGES_BFF_PATH;
}

export type FetchBlockagesResult = {
  collection: BlockagesMapCollection;
  /** `spike` = local dev route; `api` = BFF / clear-api (any URL via env). */
  source: "spike" | "api";
};

export async function fetchBlockagesMapCollection(
  init?: RequestInit,
): Promise<FetchBlockagesResult> {
  const url = getBlockagesFetchUrl();
  const source: "spike" | "api" =
    url === SPIKE_PATH || url.endsWith(SPIKE_PATH) ? "spike" : "api";

  const res = await fetch(url, {
    ...init,
    // Same-origin BFF needs cookies; harmless for spike. Absolute clear-api
    // URLs also need this + CORS credentials (prefer the BFF instead).
    credentials: "include",
    headers: {
      Accept: "application/json",
      ...init?.headers,
    },
  });

  const body = (await res.json()) as BlockagesMapCollection & {
    error?: string;
  };

  if (!res.ok) {
    throw new Error(body.error ?? `Blockages fetch failed (HTTP ${res.status})`);
  }

  if (body.type !== "FeatureCollection" || !Array.isArray(body.features)) {
    throw new Error("Blockages response is not a FeatureCollection");
  }

  return { collection: body, source };
}

/** Compact Layers-panel hint from meta (feature count + payload reduction). */
export function blockagesHintFromMeta(
  collection: BlockagesMapCollection,
  source: "spike" | "api",
): string {
  const kin = collection.meta?.bytes_in ?? 0;
  const kout = collection.meta?.bytes_out ?? 0;
  const n = collection.meta?.feature_count ?? collection.features.length;
  const pct = kin > 0 ? Math.round((1 - kout / kin) * 100) : null;
  const sizeBit = pct != null ? ` · −${pct}%` : "";
  const srcBit = source === "spike" ? " · spike" : "";
  return `${n}${sizeBit}${srcBit}`;
}
