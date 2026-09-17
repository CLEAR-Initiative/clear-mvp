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
 * Country scope is **ISO3** (`SDN` | `AFG` | `VEN` …). Pass `iso3` on every
 * fetch so All Countries / Venezuela / Afghanistan do not silently get Sudan.
 *
 * | Phase | Source | UI |
 * |-------|--------|-----|
 * | Local spike (#280) | `GET /api/dev/logie-blockages?iso3=` (disk dump) | Layers toggle |
 * | clear-api ready | `GET /api/logie/blockages?iso3=` BFF | Same toggle |
 *
 * Optional override: `NEXT_PUBLIC_LOGIE_BLOCKAGES_URL` (must be a **plain**
 * Vercel env — Sensitive/`encrypted` vars are not available at Next build time,
 * so they never inline into the client bundle).
 *
 * Spec: `docs/clear-api-logie-ingest.md` · ADR-0003
 */

import type { BlockagesMapCollection } from "~/lib/map/logie-blockages";
import { normalizeBlockagesIso3 } from "~/lib/map/blockages-countries";

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
 * Resolve the GeoJSON URL (no query string).
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
  /** ISO3 codes that were requested (after normalize). */
  iso3: string[];
};

function withIso3Query(baseUrl: string, iso3: string): string {
  const url = new URL(baseUrl, "http://local.invalid");
  url.searchParams.set("iso3", iso3);
  // Relative paths stay relative for same-origin fetch.
  if (baseUrl.startsWith("http://") || baseUrl.startsWith("https://")) {
    return url.toString();
  }
  const q = url.searchParams.toString();
  const path = url.pathname;
  return q ? `${path}?${q}` : path;
}

function emptyCollection(
  iso3: string[],
  source: BlockagesMapCollection["meta"]["source"],
): BlockagesMapCollection {
  return {
    type: "FeatureCollection",
    features: [],
    meta: {
      source,
      feature_types: ["road", "bridge"],
      feature_count: 0,
      simplify_tolerance_deg: 0,
      bytes_in: 0,
      bytes_out: 0,
      reduction_ratio: 1,
      ...(iso3.length === 1 ? { iso3: iso3[0] } : {}),
    },
  };
}

function mergeCollections(
  parts: BlockagesMapCollection[],
  iso3: string[],
  sourceTag: BlockagesMapCollection["meta"]["source"],
): BlockagesMapCollection {
  const features = parts.flatMap((p) => p.features);
  const bytesIn = parts.reduce((n, p) => n + (p.meta?.bytes_in ?? 0), 0);
  const bytesOut = parts.reduce((n, p) => n + (p.meta?.bytes_out ?? 0), 0);
  return {
    type: "FeatureCollection",
    features,
    meta: {
      source: sourceTag,
      feature_types: ["road", "bridge"],
      feature_count: features.length,
      simplify_tolerance_deg:
        parts.find((p) => p.meta?.simplify_tolerance_deg != null)?.meta
          .simplify_tolerance_deg ?? 0.0008,
      bytes_in: bytesIn,
      bytes_out: bytesOut,
      reduction_ratio: bytesIn > 0 ? bytesOut / bytesIn : 1,
      ...(iso3.length === 1 ? { iso3: iso3[0] } : {}),
    },
  };
}

async function fetchOneIso3(
  baseUrl: string,
  iso3: string,
  init?: RequestInit,
): Promise<BlockagesMapCollection> {
  const url = withIso3Query(baseUrl, iso3);
  const res = await fetch(url, {
    ...init,
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
    // Missing spike dump / not-yet-ingested country → empty layer, not a hard fail.
    if (res.status === 404) {
      return emptyCollection(
        [iso3],
        baseUrl.includes("/api/dev/") ? "logie-spike-smoke" : "logie-ingest",
      );
    }
    throw new Error(body.error ?? `Blockages fetch failed (HTTP ${res.status})`);
  }

  if (body.type !== "FeatureCollection" || !Array.isArray(body.features)) {
    throw new Error("Blockages response is not a FeatureCollection");
  }

  return body;
}

export type FetchBlockagesOptions = {
  /** One or more LogIE ISO3 codes. Empty → empty collection (no silent SDN). */
  iso3?: string | readonly string[] | null;
  init?: RequestInit;
};

/**
 * Fetch slim Blockages GeoJSON for one or more ISO3 codes.
 * Multiple codes are requested in parallel and merged (All Countries).
 */
export async function fetchBlockagesMapCollection(
  options?: FetchBlockagesOptions,
): Promise<FetchBlockagesResult> {
  const rawList = Array.isArray(options?.iso3)
    ? options.iso3
    : options?.iso3
      ? [options.iso3]
      : [];
  const iso3 = [
    ...new Set(
      rawList
        .map((c) => normalizeBlockagesIso3(c))
        .filter((c): c is string => c != null),
    ),
  ];

  const baseUrl = getBlockagesFetchUrl();
  const source: "spike" | "api" =
    baseUrl === SPIKE_PATH || baseUrl.endsWith(SPIKE_PATH) ? "spike" : "api";
  const sourceTag =
    source === "spike" ? "logie-spike-smoke" : "logie-ingest";

  if (iso3.length === 0) {
    return {
      collection: emptyCollection([], sourceTag),
      source,
      iso3,
    };
  }

  const parts = await Promise.all(
    iso3.map((code) => fetchOneIso3(baseUrl, code, options?.init)),
  );

  return {
    collection: mergeCollections(parts, iso3, sourceTag),
    source,
    iso3,
  };
}

/** Compact Layers-panel hint from meta (feature count + payload reduction). */
export function blockagesHintFromMeta(
  collection: BlockagesMapCollection,
  source: "spike" | "api",
  iso3?: readonly string[],
): string {
  const kin = collection.meta?.bytes_in ?? 0;
  const kout = collection.meta?.bytes_out ?? 0;
  const n = collection.meta?.feature_count ?? collection.features.length;
  const pct = kin > 0 ? Math.round((1 - kout / kin) * 100) : null;
  const sizeBit = pct != null ? ` · −${pct}%` : "";
  const srcBit = source === "spike" ? " · spike" : "";
  const isoBit =
    iso3 && iso3.length > 0
      ? ` · ${iso3.join("+")}`
      : collection.meta && "iso3" in collection.meta && collection.meta.iso3
        ? ` · ${String(collection.meta.iso3)}`
        : "";
  return `${n}${sizeBit}${srcBit}${isoBit}`;
}
