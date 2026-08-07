/**
 * Map-ready Blockages shape from LogIE access-issue GeoJSON.
 *
 * Smoke today: `/api/dev/logie-blockages` applies this to the spike dump.
 * Prod tomorrow: clear-api ingest should serve the same slim contract (or the BFF
 * runs this transform once on the API payload) so `/map` never loads full LogIE
 * LineStrings + fat properties.
 */

export const BLOCKAGES_FEATURE_TYPES = ["road", "bridge"] as const;
export type BlockagesFeatureType = (typeof BLOCKAGES_FEATURE_TYPES)[number];

/** Default RDP tolerance in degrees (~90m at equator). Tunable for ingest. */
export const DEFAULT_SIMPLIFY_TOLERANCE_DEG = 0.0008;

export type LogieAccessFeature = {
  type: "Feature";
  geometry: GeoJsonGeometry | null;
  properties: Record<string, unknown>;
};

export type LogieAccessCollection = {
  type: "FeatureCollection";
  features: LogieAccessFeature[];
  metadata?: Record<string, unknown>;
};

/** Status older than this (days) is still shown but demoted + warned. */
export const BLOCKAGES_STALE_AFTER_DAYS = 15;

export const LOGIE_RELIABILITY_LABELS: Record<number, string> = {
  0: "Unknown",
  1: "Low (rumours, 3rd-hand)",
  2: "Medium (heard, media)",
  3: "High (first-hand, crowdsource)",
  4: "Reliable (first-hand, credible)",
};

export type BlockagesMapProperties = {
  feature_type: BlockagesFeatureType;
  route_id: string | number | null;
  /** Raw LogIE name (often null on SDN roads). */
  name: string | null;
  /** Always set — name, else remark snippet, else "Road · {status}". */
  label: string;
  status_code: number | string | null;
  status: string | null;
  status_as_of: string | null;
  status_remark: string | null;
  /** Optional partner reporter from LogIE; platform attribution is always LogIE. */
  source_name: string | null;
  /** Normalized partner / LC label for UI. */
  source_label: string | null;
  source_reliability_code: number | null;
  source_reliability: string | null;
  /** Whole days since status_as_of; null if unknown. */
  age_days: number | null;
  /** 1 when age_days >= BLOCKAGES_STALE_AFTER_DAYS (Mapbox-friendly). */
  stale: 0 | 1;
};

export type BlockagesMapFeature = {
  type: "Feature";
  geometry: GeoJsonGeometry | null;
  properties: BlockagesMapProperties;
};

export type BlockagesMapCollection = {
  type: "FeatureCollection";
  features: BlockagesMapFeature[];
  meta: {
    source: "logie-spike-smoke" | "logie-ingest";
    feature_types: BlockagesFeatureType[];
    feature_count: number;
    simplify_tolerance_deg: number;
    bytes_in: number;
    bytes_out: number;
    reduction_ratio: number;
  };
};

type Position = number[];
type GeoJsonGeometry = {
  type: string;
  coordinates: unknown;
};

function isBlockagesType(t: unknown): t is BlockagesFeatureType {
  return t === "road" || t === "bridge";
}

/** Squared perpendicular distance from point to segment AB (lon/lat degrees). */
function perpDistSq(p: Position, a: Position, b: Position): number {
  const [x, y] = p;
  const [x1, y1] = a;
  const [x2, y2] = b;
  const dx = x2 - x1;
  const dy = y2 - y1;
  if (dx === 0 && dy === 0) {
    const ex = x - x1;
    const ey = y - y1;
    return ex * ex + ey * ey;
  }
  const t = Math.max(0, Math.min(1, ((x - x1) * dx + (y - y1) * dy) / (dx * dx + dy * dy)));
  const px = x1 + t * dx;
  const py = y1 + t * dy;
  const ex = x - px;
  const ey = y - py;
  return ex * ex + ey * ey;
}

/** Ramer–Douglas–Peucker; keeps endpoints. */
export function simplifyLine(
  coords: Position[],
  toleranceDeg: number,
): Position[] {
  if (coords.length <= 2) return coords;
  const tolSq = toleranceDeg * toleranceDeg;

  const simplify = (points: Position[]): Position[] => {
    if (points.length <= 2) return points;
    let maxDist = 0;
    let maxIdx = 0;
    const first = points[0]!;
    const last = points[points.length - 1]!;
    for (let i = 1; i < points.length - 1; i++) {
      const d = perpDistSq(points[i]!, first, last);
      if (d > maxDist) {
        maxDist = d;
        maxIdx = i;
      }
    }
    if (maxDist < tolSq) return [first, last];
    const left = simplify(points.slice(0, maxIdx + 1));
    const right = simplify(points.slice(maxIdx));
    return left.slice(0, -1).concat(right);
  };

  return simplify(coords);
}

export function simplifyGeometry(
  geometry: GeoJsonGeometry | null,
  toleranceDeg: number,
): GeoJsonGeometry | null {
  if (!geometry || toleranceDeg <= 0) return geometry;
  if (geometry.type === "LineString") {
    const coords = geometry.coordinates as Position[];
    return { type: "LineString", coordinates: simplifyLine(coords, toleranceDeg) };
  }
  if (geometry.type === "MultiLineString") {
    const lines = geometry.coordinates as Position[][];
    return {
      type: "MultiLineString",
      coordinates: lines.map((line) => simplifyLine(line, toleranceDeg)),
    };
  }
  // Points (bridges) — unchanged
  return geometry;
}

/** LogIE often omits routenameen on SDN roads — never leave the map with an empty title. */
export function blockagesDisplayLabel(p: Record<string, unknown>): string {
  const rawName = typeof p.name === "string" ? p.name.trim() : "";
  if (rawName) return rawName;

  const remark = typeof p.status_remark === "string" ? p.status_remark.trim() : "";
  if (remark && remark.toLowerCase() !== "unknown") {
    const short = remark.split(/[.\n]/)[0]?.trim().slice(0, 80) ?? "";
    if (short) return short;
  }

  const kind =
    p.feature_type === "bridge"
      ? "Bridge"
      : p.feature_type === "road"
        ? "Road"
        : "Segment";
  const statusRaw = typeof p.status === "string" ? p.status : null;
  const status = statusRaw
    ? statusRaw.replace(/Damanged/g, "Damaged")
    : "access constraint";
  return `${kind} · ${status}`;
}

/** Collapse messy LogIE reporter strings into a short UI label. */
export function normalizeBlockagesSourceName(
  raw: string | null | undefined,
): string | null {
  if (!raw?.trim()) return null;
  const s = raw.trim();
  const key = s.toUpperCase().replace(/[^A-Z0-9]+/g, "");
  if (
    key === "WFPLC" ||
    key === "LC" ||
    key === "LCWFP" ||
    key === "WFPC" ||
    key.startsWith("WFPLC") ||
    key.startsWith("LCWFP")
  ) {
    return "WFP Logistics Cluster";
  }
  if (key.includes("PARTNER")) return "Partner report";
  return s;
}

export function ageDaysSince(
  statusAsOf: string | null | undefined,
  now: Date = new Date(),
): number | null {
  if (!statusAsOf) return null;
  const dt = new Date(statusAsOf);
  if (Number.isNaN(dt.getTime())) return null;
  const ms = now.getTime() - dt.getTime();
  if (ms < 0) return 0;
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

export function isBlockagesStatusStale(ageDays: number | null): boolean {
  return ageDays != null && ageDays >= BLOCKAGES_STALE_AFTER_DAYS;
}

/** e.g. "2026-06-15 (42 days ago)" or "unknown date". */
export function formatBlockagesFreshness(
  statusAsOf: string | null | undefined,
  ageDays: number | null = ageDaysSince(statusAsOf),
): string {
  if (!statusAsOf || ageDays == null) return "Status date unknown";
  const day = statusAsOf.slice(0, 10);
  const ago =
    ageDays === 0 ? "today" : ageDays === 1 ? "1 day ago" : `${ageDays} days ago`;
  return `${day} (${ago})`;
}

function parseReliabilityCode(raw: unknown): number | null {
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  if (typeof raw === "string" && raw.trim() !== "") {
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function slimProperties(p: Record<string, unknown>): BlockagesMapProperties | null {
  if (!isBlockagesType(p.feature_type)) return null;
  const name =
    typeof p.name === "string" && p.name.trim() ? p.name.trim() : null;
  const remark =
    typeof p.status_remark === "string" && p.status_remark.trim()
      ? p.status_remark.trim()
      : null;
  const statusRaw = (p.status as string | null | undefined) ?? null;
  const status = statusRaw
    ? statusRaw.replace(/Damanged/g, "Damaged")
    : null;
  const sourceName =
    typeof p.source_name === "string" && p.source_name.trim()
      ? p.source_name.trim()
      : null;
  const statusAsOf =
    (p.status_as_of as string | null | undefined) ?? null;
  const ageDays = ageDaysSince(statusAsOf);
  const relCode = parseReliabilityCode(p.source_reliability_code);
  return {
    feature_type: p.feature_type,
    route_id: (p.route_id as string | number | null | undefined) ?? null,
    name,
    label: blockagesDisplayLabel({ ...p, name, status_remark: remark, status }),
    status_code: (p.status_code as number | string | null | undefined) ?? null,
    status,
    status_as_of: statusAsOf,
    status_remark: remark,
    source_name: sourceName,
    source_label: normalizeBlockagesSourceName(sourceName),
    source_reliability_code: relCode,
    source_reliability:
      relCode != null ? (LOGIE_RELIABILITY_LABELS[relCode] ?? String(relCode)) : null,
    age_days: ageDays,
    stale: isBlockagesStatusStale(ageDays) ? 1 : 0,
  };
}

/**
 * Filter to Blockages v1 types, drop fat props, simplify line geometries.
 * `source` tags smoke vs future ingest so the map can label the layer.
 */
export function toBlockagesMapCollection(
  input: LogieAccessCollection,
  opts: {
    source: "logie-spike-smoke" | "logie-ingest";
    simplifyToleranceDeg?: number;
  },
): BlockagesMapCollection {
  const tolerance = opts.simplifyToleranceDeg ?? DEFAULT_SIMPLIFY_TOLERANCE_DEG;
  const bytesIn = JSON.stringify(input).length;

  const features: BlockagesMapFeature[] = [];
  for (const f of input.features ?? []) {
    const props = slimProperties(f.properties ?? {});
    if (!props) continue;
    features.push({
      type: "Feature",
      geometry: simplifyGeometry(f.geometry, tolerance),
      properties: props,
    });
  }

  const out: BlockagesMapCollection = {
    type: "FeatureCollection",
    features,
    meta: {
      source: opts.source,
      feature_types: [...BLOCKAGES_FEATURE_TYPES],
      feature_count: features.length,
      simplify_tolerance_deg: tolerance,
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
