/**
 * Blockages data source — single swap point for spike → clear-api.
 *
 * ## Delivery model (one clear-mvp PR)
 *
 * This branch ships everything the map needs to paint Blockages against a
 * **stable contract** (`BlockagesMapCollection` from `logie-blockages.ts`).
 *
 * | Phase | Source | UI |
 * |-------|--------|-----|
 * | Now (review/QA) | `GET /api/dev/logie-blockages` (spike GeoJSON on disk) | Layers toggle in development |
 * | After Expo #317 | Set `NEXT_PUBLIC_LOGIE_BLOCKAGES_URL` to clear-api slim endpoint | Same toggle; works in preview/prod when URL is set |
 *
 * There is **no** second clear-mvp PR that rewrites the map layer. Expo #277 is
 * “point at ingest + enable for all environments” — ideally just env + a short
 * checklist, not a parallel FE stack.
 *
 * Spec: `docs/clear-api-logie-ingest.md` · ADR-0003
 */

import type { BlockagesMapCollection } from "~/lib/map/logie-blockages";

const SPIKE_PATH = "/api/dev/logie-blockages";

/** True when Layers → Blockages should be an interactive toggle (not Coming soon). */
export function isBlockagesUiEnabled(): boolean {
  if (process.env.NEXT_PUBLIC_LOGIE_BLOCKAGES_URL) return true;
  return process.env.NODE_ENV === "development";
}

/**
 * Resolve the GeoJSON URL. Prefer clear-api when configured; otherwise spike route.
 * Production without `NEXT_PUBLIC_LOGIE_BLOCKAGES_URL` should not call this
 * (`isBlockagesUiEnabled` is false → Coming soon stub).
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
