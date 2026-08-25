/**
 * Map-ready Seismic (earthquake epicenters) shape from USGS FDSN Event GeoJSON.
 *
 * Smoke today: `/api/dev/usgs-earthquakes` applies this to a live FDSN query.
 * Prod tomorrow: clear-api scheduled ingest serves the same slim contract so
 * `/map` never calls earthquake.usgs.gov from the browser.
 */

/** Earthquakes older than this (days) are still shown but demoted visually. */
export const SEISMIC_STALE_AFTER_DAYS = 30;

/** PAGER alert levels from USGS. */
export type PagerAlert = "green" | "yellow" | "orange" | "red" | null;

/** Review status from USGS. */
export type ReviewStatus = "automatic" | "reviewed" | null;

type GeoJsonPoint = {
  type: "Point";
  coordinates: [number, number, number]; // [lng, lat, depth_km]
};

type GeoJsonGeometry = {
  type: string;
  coordinates: unknown;
};

/** Upstream USGS FDSN feature (fat properties). */
export type UsgsFdsnFeature = {
  type: "Feature";
  id?: string;
  geometry: GeoJsonGeometry | null;
  properties: Record<string, unknown>;
};

/** Upstream USGS FDSN FeatureCollection. */
export type UsgsFdsnCollection = {
  type: "FeatureCollection";
  features: UsgsFdsnFeature[];
  metadata?: Record<string, unknown>;
};

/** Slim map-ready properties for earthquake epicenters. */
export type SeismicMapProperties = {
  /** USGS event id (e.g. "us6000tk74"). */
  id: string;
  /** Magnitude (e.g. 6.0). */
  mag: number | null;
  /** Magnitude type (e.g. "mww", "mb"). */
  mag_type: string | null;
  /** Human-readable location (e.g. "South Sandwich Islands region"). */
  place: string | null;
  /** Full event title from USGS (e.g. "M 6.0 - South Sandwich Islands region"). */
  title: string | null;
  /** Event time in ms since epoch. */
  time: number | null;
  /** Last update time in ms since epoch. */
  updated: number | null;
  /** Depth in km (from geometry[2]). */
  depth_km: number | null;
  /** PAGER alert level. */
  alert: PagerAlert;
  /** Maximum Modified Mercalli Intensity (ShakeMap). */
  mmi: number | null;
  /** USGS event page URL. */
  url: string | null;
  /** True if this event has a ShakeMap product (for future intensity overlay). */
  has_shakemap: boolean;
  /** Review status. */
  status: ReviewStatus;
  /** Whole days since event time; null if time unknown. */
  age_days: number | null;
  /** 1 when age_days >= SEISMIC_STALE_AFTER_DAYS (Mapbox-friendly). */
  stale: 0 | 1;
};

/** Slim map feature. */
export type SeismicMapFeature = {
  type: "Feature";
  id?: string;
  geometry: GeoJsonPoint | null;
  properties: SeismicMapProperties;
};

/** ShakeMap MMI contour feature (isoseismal line). */
export type ShakeMapContourFeature = {
  type: "Feature";
  properties: {
    value: number; // MMI intensity value
    units: string;
    color?: string;
    weight?: number;
  };
  geometry: {
    type: "MultiLineString" | "LineString";
    coordinates: unknown;
  };
};

/**
 * ShakeMap contours for a single earthquake.
 * 
 * VISUALIZATION APPROACH (Topographic Shockwave):
 * - Contours rendered as thick, overlapping bands with gradient blur
 * - Color gradient: Green (MMI 1-3, weak) → Yellow (4-5) → Orange (6-7) → Red (8-10, severe)
 * - Sorted ascending so higher intensities draw on top
 * - Epicenter: prominent red circle (12px, 4px white border)
 * 
 * DATA FORMAT:
 * - Each feature is a MultiLineString boundary of equal intensity (isoseismal)
 * - properties.value = MMI level (1-10); higher = closer to epicenter
 * - Source: USGS ShakeMap API /detail/{eventId}.geojson → products.shakemap[0].contents["download/cont_mmi.json"]
 * - Size: ~10-50 KB per event (5-15 contours, 100-500 coords each)
 */
export type ShakeMapContours = {
  eventId: string;
  type: "FeatureCollection";
  features: ShakeMapContourFeature[];
};

/** Slim map-ready FeatureCollection. */
export type SeismicMapCollection = {
  type: "FeatureCollection";
  features: SeismicMapFeature[];
  /** Optional ShakeMap contours for events that have them. */
  shakemaps?: ShakeMapContours[];
  meta: {
    source: "usgs-spike" | "usgs-ingest";
    feature_count: number;
    min_magnitude: number | null;
    window_days: number | null;
    bbox: [number, number, number, number] | null; // [minLng, minLat, maxLng, maxLat]
    pulled_at: string; // ISO timestamp
    bytes_in: number;
    bytes_out: number;
    reduction_ratio: number;
  };
};

/** Calculate age in days from ms epoch timestamp. */
export function ageDaysSinceEpoch(
  timeMs: number | null | undefined,
  now: Date = new Date(),
): number | null {
  if (timeMs == null || !Number.isFinite(timeMs)) return null;
  const ms = now.getTime() - timeMs;
  if (ms < 0) return 0;
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

/** True if earthquake is considered stale (old event in the 30-day window). */
export function isSeismicEventStale(ageDays: number | null): boolean {
  return ageDays != null && ageDays >= SEISMIC_STALE_AFTER_DAYS;
}

/** UTC `YYYY-MM` for timeline chips; null when USGS `time` is missing. */
export function utcYearMonthFromEpochMs(
  time: number | null | undefined,
): string | null {
  if (time == null || !Number.isFinite(time)) return null;
  const d = new Date(time);
  if (Number.isNaN(d.getTime())) return null;
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** Distinct UTC months in a collection, newest first. */
export function seismicYearMonths(collection: SeismicMapCollection): string[] {
  const set = new Set<string>();
  for (const f of collection.features) {
    const ym = utcYearMonthFromEpochMs(f.properties.time);
    if (ym) set.add(ym);
  }
  return [...set].sort().reverse();
}

/**
 * Client-side month chip filter. `selectedMonth` null = entire fetched window.
 * ShakeMaps follow their epicenter’s month.
 */
export function filterSeismicMapCollection(
  collection: SeismicMapCollection,
  selectedMonth: string | null,
): SeismicMapCollection {
  if (!selectedMonth) return collection;
  const features = collection.features.filter(
    (f) => utcYearMonthFromEpochMs(f.properties.time) === selectedMonth,
  );
  const ids = new Set(features.map((f) => f.properties.id));
  return {
    ...collection,
    features,
    ...(collection.shakemaps
      ? { shakemaps: collection.shakemaps.filter((s) => ids.has(s.eventId)) }
      : {}),
    meta: {
      ...collection.meta,
      feature_count: features.length,
    },
  };
}

/** Format earthquake age for display (e.g. "2026-07-15 (28 days ago)"). */
export function formatSeismicFreshness(
  timeMs: number | null | undefined,
  ageDays: number | null = ageDaysSinceEpoch(timeMs),
): string {
  if (timeMs == null || ageDays == null) return "Time unknown";
  const date = new Date(timeMs);
  const day = date.toISOString().slice(0, 10);
  const ago =
    ageDays === 0 ? "today" : ageDays === 1 ? "1 day ago" : `${ageDays} days ago`;
  return `${day} (${ago})`;
}

/** Normalize PAGER alert level. */
function normalizePagerAlert(raw: unknown): PagerAlert {
  if (typeof raw !== "string") return null;
  const s = raw.toLowerCase();
  if (s === "green" || s === "yellow" || s === "orange" || s === "red") return s;
  return null;
}

/** Normalize review status. */
function normalizeReviewStatus(raw: unknown): ReviewStatus {
  if (typeof raw !== "string") return null;
  const s = raw.toLowerCase();
  if (s === "automatic" || s === "reviewed") return s;
  return null;
}

/** Check if USGS event has ShakeMap product (for future intensity overlay). */
function hasShakeMapProduct(types: unknown): boolean {
  if (typeof types !== "string") return false;
  return types.includes("shakemap");
}

/** Extract depth from Point geometry (third coordinate in km). */
function extractDepth(geometry: GeoJsonGeometry | null): number | null {
  if (!geometry || geometry.type !== "Point") return null;
  const coords = geometry.coordinates as unknown[];
  if (!Array.isArray(coords) || coords.length < 3) return null;
  const depth = coords[2];
  return typeof depth === "number" && Number.isFinite(depth) ? depth : null;
}

/** Filter non-earthquakes and slim properties. */
function slimProperties(
  p: Record<string, unknown>,
  geometry: GeoJsonGeometry | null,
  featureId?: string,
): SeismicMapProperties | null {
  // Filter to earthquakes only (eventtype=earthquake on FDSN, but double-check)
  const eventType = p.type;
  if (eventType !== "earthquake") return null;

  const id = featureId || (typeof p.id === "string" ? p.id : String(p.id ?? "unknown"));
  const mag = typeof p.mag === "number" && Number.isFinite(p.mag) ? p.mag : null;
  const magType = typeof p.magType === "string" ? p.magType : null;
  const place = typeof p.place === "string" ? p.place.trim() || null : null;
  const title = typeof p.title === "string" ? p.title.trim() || null : null;
  const time = typeof p.time === "number" && Number.isFinite(p.time) ? p.time : null;
  const updated =
    typeof p.updated === "number" && Number.isFinite(p.updated) ? p.updated : null;
  const depthKm = extractDepth(geometry);
  const alert = normalizePagerAlert(p.alert);
  const mmi = typeof p.mmi === "number" && Number.isFinite(p.mmi) ? p.mmi : null;
  const url = typeof p.url === "string" ? p.url.trim() || null : null;
  const hasShakemap = hasShakeMapProduct(p.types);
  const status = normalizeReviewStatus(p.status);
  const ageDays = ageDaysSinceEpoch(time);

  return {
    id,
    mag,
    mag_type: magType,
    place,
    title,
    time,
    updated,
    depth_km: depthKm,
    alert,
    mmi,
    url,
    has_shakemap: hasShakemap,
    status,
    age_days: ageDays,
    stale: isSeismicEventStale(ageDays) ? 1 : 0,
  };
}

/**
 * Transform USGS FDSN GeoJSON into slim map-ready SeismicMapCollection.
 * Filters to earthquakes only; drops fat upstream properties.
 */
export function toSeismicMapCollection(
  input: UsgsFdsnCollection,
  opts: {
    source: "usgs-spike" | "usgs-ingest";
    minMagnitude?: number | null;
    windowDays?: number | null;
    bbox?: [number, number, number, number] | null;
  },
): SeismicMapCollection {
  const bytesIn = JSON.stringify(input).length;
  const pulledAt = new Date().toISOString();

  const features: SeismicMapFeature[] = [];
  for (const f of input.features ?? []) {
    const featureId = typeof f.id === "string" ? f.id : undefined;
    const props = slimProperties(f.properties ?? {}, f.geometry, featureId);
    if (!props) continue;

    // Only include Point geometries (epicenters)
    if (!f.geometry || f.geometry.type !== "Point") continue;

    features.push({
      type: "Feature",
      id: props.id,
      geometry: f.geometry as GeoJsonPoint,
      properties: props,
    });
  }

  const out: SeismicMapCollection = {
    type: "FeatureCollection",
    features,
    meta: {
      source: opts.source,
      feature_count: features.length,
      min_magnitude: opts.minMagnitude ?? null,
      window_days: opts.windowDays ?? null,
      bbox: opts.bbox ?? null,
      pulled_at: pulledAt,
      bytes_in: bytesIn,
      bytes_out: 0,
      reduction_ratio: 0,
    },
  };
  out.meta.bytes_out = JSON.stringify(out).length;
  out.meta.reduction_ratio =
    out.meta.bytes_in > 0 ? out.meta.bytes_out / out.meta.bytes_in : 1;
  return out;
}
