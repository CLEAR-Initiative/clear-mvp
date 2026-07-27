/**
 * Blockages data source — single swap point for spike → clear-api.
 *
 * ## Delivery model (one clear-mvp paint path)
 *
 * The map paints against a **stable contract** (`BlockagesMapCollection`).
 * Do **not** call LogIE ArcGIS from the browser. After Expo **#317**, the client
 * only talks to **clear-api** (auth’d / server-persisted slim GeoJSON) via
 * `NEXT_PUBLIC_LOGIE_BLOCKAGES_URL` (or a future BFF proxy). Hold shipping this
 * layer to shared environments until that ingest path exists.
 *
 * | Phase | Source | UI |
 * |-------|--------|-----|
 * | Local spike (#280) | `GET /api/dev/logie-blockages` (disk dump) | Layers toggle in **development only** |
 * | After Expo #317 | clear-api slim Blockages URL | Same toggle when env URL is set |
 * | Expo #277 | Env + checklist | Enable outside local spike — **not** a FE rewrite |
 *
 * Spec: `docs/clear-api-logie-ingest.md` · ADR-0003
 */

import type { BlockagesMapCollection } from "~/lib/map/logie-blockages";

const SPIKE_PATH = "/api/dev/logie-blockages";

/**
 * True when Layers → Blockages should be an interactive toggle (not Coming soon).
 * Production / preview stay Coming soon unless clear-api URL is configured —
 * never expose the local spike route as the prod data path.
 */
export function isBlockagesUiEnabled(): boolean {
  if (process.env.NEXT_PUBLIC_LOGIE_BLOCKAGES_URL?.trim()) return true;
  return process.env.NODE_ENV === "development";
}

/**
 * Resolve the GeoJSON URL. Prefer clear-api when configured; otherwise spike route.
 * Callers must gate on `isBlockagesUiEnabled()` first.
 */
export function getBlockagesFetchUrl(): string {
  return process.env.NEXT_PUBLIC_LOGIE_BLOCKAGES_URL?.trim() || SPIKE_PATH;
}

export type FetchBlockagesResult = {
  collection: BlockagesMapCollection;
  /** `spike` = local dev route; `api` = clear-api (or any URL via env). */
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
