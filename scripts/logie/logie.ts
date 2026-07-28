/**
 * LogIE (WFP Logistics Cluster) → CLEAR access-constraint pull.
 *
 * TypeScript port of Ewan’s logie.py gist (core only):
 * https://gist.github.com/eoglethorpe/90f2b9e645d43fe8d74c7b442d7e9ce9
 *
 * Spike additions vs gist: pass through `fclass` (and related class fields).
 * Out of scope for #280: Overpass surface enrichment, download_icons.
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

const AGOL =
  "https://services3.arcgis.com/t6lYS2Pmd8iVx1fy/arcgis/rest/services";
const GIS = "https://gis.logcluster.org/server/rest/services";

const PAGE_SIZE = 1000;
const TIMEOUT_MS = 60_000;
const USER_AGENT = "CLEAR-logie/1.0 (NRC humanitarian platform)";

export type LayerType =
  | "road"
  | "bridge"
  | "port"
  | "aerodrome"
  | "crossing";

export type FeatureType = LayerType | "pac_report";

type LayerConfig = {
  url: string;
  idField: string;
  nameField: string;
  statusField: string;
  blocked: Set<number>;
  isoFields: string[];
};

const LAYERS: Record<LayerType, LayerConfig> = {
  road: {
    url: `${AGOL}/Situational_Roads_view/FeatureServer/0`,
    idField: "osmid",
    nameField: "routenameen",
    statusField: "currstatus_physical",
    blocked: new Set([3, 4]),
    isoFields: ["iso3"],
  },
  bridge: {
    url: `${GIS}/LogIE/wld_trs_bridges_b_w_viewer/FeatureServer/0`,
    idField: "osmid",
    nameField: "name",
    statusField: "currstatus_physical",
    blocked: new Set([3, 4]),
    isoFields: ["iso3"],
  },
  port: {
    url: `${GIS}/LogIE/wld_trs_ports_b_w_showpublic/FeatureServer/0`,
    idField: "osmid",
    nameField: "name",
    statusField: "status",
    blocked: new Set([3, 4]),
    isoFields: ["iso3"],
  },
  aerodrome: {
    url: `${GIS}/LogIE/wld_trs_aerodromes_b_w_viewer/FeatureServer/0`,
    idField: "osmid",
    nameField: "name",
    statusField: "currstatus_operational",
    // Live coded domain (Jul 2026) is Open/Restricted/Closed — not the gist’s
    // Normal/Damaged/{4,5} table. Treat Restricted+Closed as blocked.
    blocked: new Set([2, 3]),
    isoFields: ["iso3"],
  },
  crossing: {
    url: `${AGOL}/Global_EEP_view/FeatureServer/0`,
    idField: "nameen",
    nameField: "nameen",
    statusField: "currstatus_operational",
    blocked: new Set([2, 3]),
    isoFields: ["iso3a", "iso3b", "iso3c"],
  },
};

const PAC_LAYER = `${AGOL}/pacReports_view/FeatureServer/0`;

export type GeoJsonGeometry = {
  type: string;
  coordinates: unknown;
} | null;

export type ShapedProperties = {
  feature_type: FeatureType;
  route_id: string | number | null;
  name: string | null;
  iso3: string | null;
  status_field: string | null;
  status_code: number | string | null;
  status: string | number | null;
  status_remark: string | null;
  status_as_of: string | null;
  source_name: string | null;
  source_reliability_code: number | null;
  surface: string | null;
  fclass: string | null;
  max_vehicle: string | null;
  has_bypass: unknown;
  admin1: string | null;
  admin2: string | null;
  hum_usage_code?: number | null;
  access_denied?: boolean;
  capacity_code?: number | null;
  crossing_countries?: string[];
  truck_flow_a_to_b?: unknown;
  truck_flow_b_to_a?: unknown;
  constraint_type?: unknown;
  pac_type?: string | number | null;
};

export type ShapedFeature = {
  type: "Feature";
  geometry: GeoJsonGeometry;
  properties: ShapedProperties;
};

export type AccessIssuesCollection = {
  type: "FeatureCollection";
  metadata: {
    source: string;
    pulled_at: string;
    iso3: string;
    only_blocked: boolean;
    counts_by_type: Record<string, number>;
    errors: Record<string, string>;
    provenance: string;
  };
  features: ShapedFeature[];
};

export type StatusDomainInfo = {
  field: string;
  domain: Record<string, string>;
  blocked: number[] | string;
};

type RawFeature = {
  type?: string;
  geometry?: GeoJsonGeometry;
  properties?: Record<string, unknown>;
};

const domainCache = new Map<string, Record<string, string>>();

function esriToIso(ms: unknown): string | null {
  if (typeof ms !== "number") return null;
  return new Date(ms).toISOString().replace(/\.\d{3}Z$/, "Z");
}

async function fetchJson(url: string, params?: Record<string, string>) {
  const u = new URL(url);
  if (params) {
    for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v);
  }
  const res = await fetch(u, {
    headers: { "User-Agent": USER_AGENT },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} for ${u.pathname}`);
  }
  return res.json() as Promise<unknown>;
}

async function fetchDomain(
  layerUrl: string,
  field: string,
): Promise<Record<string, string>> {
  const key = `${layerUrl}::${field}`;
  const cached = domainCache.get(key);
  if (cached) return cached;

  const meta = (await fetchJson(layerUrl, { f: "json" })) as {
    fields?: Array<{
      name: string;
      domain?: { type?: string; codedValues?: Array<{ code: unknown; name: string }> };
    }>;
  };
  const out: Record<string, string> = {};
  for (const f of meta.fields ?? []) {
    if (f.name === field && f.domain?.type === "codedValue") {
      for (const cv of f.domain.codedValues ?? []) {
        out[String(cv.code)] = cv.name;
      }
    }
  }
  domainCache.set(key, out);
  return out;
}

async function* queryAll(
  layerUrl: string,
  where: string,
  outFields = "*",
): AsyncGenerator<RawFeature> {
  let offset = 0;
  for (;;) {
    const data = (await fetchJson(`${layerUrl}/query`, {
      where,
      outFields,
      outSR: "4326",
      f: "geojson",
      resultOffset: String(offset),
      resultRecordCount: String(PAGE_SIZE),
    })) as {
      features?: RawFeature[];
      properties?: { exceededTransferLimit?: boolean };
    };
    const feats = data.features ?? [];
    if (feats.length === 0) break;
    for (const f of feats) yield f;
    if (
      feats.length < PAGE_SIZE &&
      !data.properties?.exceededTransferLimit
    ) {
      break;
    }
    offset += feats.length;
    await new Promise((r) => setTimeout(r, 200));
  }
}

function isoClause(iso3: string | undefined, isoFields: string[]): string {
  if (!iso3) return "1=1";
  return `(${isoFields.map((f) => `${f} = '${iso3}'`).join(" OR ")})`;
}

function pickFclass(p: Record<string, unknown>): string | null {
  const candidates = ["fclass", "FCLASS", "f_class", "roadclass", "class"];
  for (const key of candidates) {
    const v = p[key];
    if (typeof v === "string" && v.trim()) return v;
    if (typeof v === "number") return String(v);
  }
  return null;
}

function shapeFeature(
  feature: RawFeature,
  featureType: LayerType,
  cfg: LayerConfig,
  domain: Record<string, string>,
): ShapedFeature {
  const p = feature.properties ?? {};
  const sf = cfg.statusField;
  const code = p[sf] as number | string | null | undefined;
  const codeKey = code == null ? null : String(code);

  const props: ShapedProperties = {
    feature_type: featureType,
    route_id: (p[cfg.idField] as string | number | null | undefined) ?? null,
    name:
      (p[cfg.nameField] as string | null | undefined) ||
      (p.name as string | null | undefined) ||
      (p.roadnameen as string | null | undefined) ||
      null,
    iso3: (p.iso3 as string | null | undefined) ?? null,
    status_field: sf,
    status_code: code ?? null,
    status: codeKey != null ? (domain[codeKey] ?? code ?? null) : null,
    status_remark: (p.currstatusremarken as string | null | undefined) ?? null,
    status_as_of: esriToIso(p.currasofdate),
    source_name: (p.currsourcename as string | null | undefined) ?? null,
    source_reliability_code:
      (p.currinforely as number | null | undefined) ?? null,
    surface: null,
    fclass: pickFclass(p),
    max_vehicle:
      ((p.currvehprac ?? p.currvehtype) as string | null | undefined) ?? null,
    has_bypass: p.hasbypass ?? null,
    admin1: (p.admin1en as string | null | undefined) ?? null,
    admin2: (p.admin2en as string | null | undefined) ?? null,
  };

  if (featureType === "crossing") {
    props.hum_usage_code =
      (p.currhumusage as number | null | undefined) ?? null;
    props.access_denied = p.currhumusage === 2;
    props.capacity_code =
      (p.curreepcapacity as number | null | undefined) ?? null;
    props.crossing_countries = [p.iso3a, p.iso3b, p.iso3c].filter(
      (c): c is string => typeof c === "string" && Boolean(c),
    );
    props.truck_flow_a_to_b = p.currflowtrucksatob ?? null;
    props.truck_flow_b_to_a = p.currflowtrucksbtoa ?? null;
  }

  return {
    type: "Feature",
    geometry: feature.geometry ?? null,
    properties: props,
  };
}

function shapePac(
  feature: RawFeature,
  domainType: Record<string, string>,
  domainPac: Record<string, string>,
): ShapedFeature {
  const p = feature.properties ?? {};
  const constraint = p.type_of_access_constraint;
  const constraintKey =
    constraint == null ? null : String(constraint as string | number);
  const pac = p.pactype;
  const pacKey = pac == null ? null : String(pac as string | number);

  return {
    type: "Feature",
    geometry: feature.geometry ?? null,
    properties: {
      feature_type: "pac_report",
      route_id: null,
      name: (p.what_was_the_constraint as string | null | undefined) ?? null,
      iso3: (p.iso3 as string | null | undefined) ?? null,
      status_field: null,
      status_code: null,
      status:
        constraintKey != null
          ? (domainType[constraintKey] ?? constraintKey)
          : null,
      status_remark:
        ((p.constraint_comment ?? p.reportedremarks) as
          | string
          | null
          | undefined) ?? null,
      status_as_of: esriToIso(p.EditDate),
      source_name: null,
      source_reliability_code: null,
      surface: null,
      fclass: pickFclass(p),
      max_vehicle: null,
      has_bypass: null,
      admin1: null,
      admin2: null,
      constraint_type: constraint ?? null,
      pac_type: pacKey != null ? (domainPac[pacKey] ?? pacKey) : null,
    },
  };
}

export async function pullLayer(
  featureType: LayerType,
  opts: {
    iso3?: string;
    onlyBlocked?: boolean;
    since?: string;
  } = {},
): Promise<ShapedFeature[]> {
  const { iso3, onlyBlocked = true, since } = opts;
  const cfg = LAYERS[featureType];
  const clauses = [isoClause(iso3, cfg.isoFields)];
  if (onlyBlocked) {
    const codes = [...cfg.blocked].sort((a, b) => a - b);
    clauses.push(`${cfg.statusField} IN (${codes.join(",")})`);
  }
  if (since) {
    clauses.push(`currasofdate >= TIMESTAMP '${since} 00:00:00'`);
  }
  const where = clauses.map((c) => `(${c})`).join(" AND ");
  const domain = await fetchDomain(cfg.url, cfg.statusField);
  const out: ShapedFeature[] = [];
  for await (const f of queryAll(cfg.url, where)) {
    out.push(shapeFeature(f, featureType, cfg, domain));
  }
  return out;
}

export async function pullPac(
  opts: { iso3?: string; since?: string } = {},
): Promise<ShapedFeature[]> {
  const { iso3, since } = opts;
  const clauses = [iso3 ? `iso3 = '${iso3}'` : "1=1"];
  if (since) {
    clauses.push(`EditDate >= TIMESTAMP '${since} 00:00:00'`);
  }
  const where = clauses.map((c) => `(${c})`).join(" AND ");
  const [domainType, domainPac] = await Promise.all([
    fetchDomain(PAC_LAYER, "type_of_access_constraint"),
    fetchDomain(PAC_LAYER, "pactype"),
  ]);
  const out: ShapedFeature[] = [];
  for await (const f of queryAll(PAC_LAYER, where)) {
    out.push(shapePac(f, domainType, domainPac));
  }
  return out;
}

export async function accessIssues(
  opts: {
    iso3?: string;
    includePac?: boolean;
    onlyBlocked?: boolean;
    since?: string;
    layers?: LayerType[];
  } = {},
): Promise<AccessIssuesCollection> {
  const {
    iso3,
    includePac = true,
    onlyBlocked = true,
    since,
    layers,
  } = opts;
  const wanted = layers ?? (Object.keys(LAYERS) as LayerType[]);
  const features: ShapedFeature[] = [];
  const counts: Record<string, number> = {};
  const errors: Record<string, string> = {};

  for (const ft of wanted) {
    try {
      const feats = await pullLayer(ft, { iso3, onlyBlocked, since });
      counts[ft] = feats.length;
      features.push(...feats);
    } catch (e) {
      errors[ft] = e instanceof Error ? e.message : String(e);
      counts[ft] = 0;
    }
  }

  if (includePac) {
    try {
      const pac = await pullPac({ iso3, since });
      counts.pac_report = pac.length;
      features.push(...pac);
    } catch (e) {
      errors.pac_report = e instanceof Error ? e.message : String(e);
      counts.pac_report = 0;
    }
  }

  return {
    type: "FeatureCollection",
    metadata: {
      source: "WFP Logistics Cluster LogIE",
      pulled_at: new Date().toISOString().replace(/\.\d{3}Z$/, "Z"),
      iso3: iso3 ?? "ALL",
      only_blocked: onlyBlocked,
      counts_by_type: counts,
      errors,
      provenance:
        "geometry: OSM (osmid); status: partner-reported, IMO-validated via LogIE.",
    },
    features,
  };
}

export async function statusDomains(): Promise<
  Record<string, StatusDomainInfo>
> {
  const out: Record<string, StatusDomainInfo> = {};
  for (const [ft, cfg] of Object.entries(LAYERS) as [LayerType, LayerConfig][]) {
    out[ft] = {
      field: cfg.statusField,
      domain: await fetchDomain(cfg.url, cfg.statusField),
      blocked: [...cfg.blocked].sort((a, b) => a - b),
    };
  }
  out.pac_report = {
    field: "type_of_access_constraint",
    domain: await fetchDomain(PAC_LAYER, "type_of_access_constraint"),
    blocked: "all reports",
  };
  return out;
}

export function save(featureCollection: unknown, path: string): string {
  mkdirSync(dirname(path), { recursive: true });
  const body = JSON.stringify(featureCollection);
  if (!body || body === "undefined") {
    throw new Error(`JSON.stringify produced empty output for ${path}`);
  }
  writeFileSync(path, body, "utf8");
  return path;
}

/** Count open vs blocked for one layer (two pulls). */
export async function openVsBlockedCounts(
  iso3: string,
  layers?: LayerType[],
): Promise<
  Record<
    string,
    { blocked: number; all: number; open_or_other: number; error?: string }
  >
> {
  const wanted = layers ?? (Object.keys(LAYERS) as LayerType[]);
  const out: Record<
    string,
    { blocked: number; all: number; open_or_other: number; error?: string }
  > = {};

  for (const ft of wanted) {
    try {
      const [blocked, all] = await Promise.all([
        pullLayer(ft, { iso3, onlyBlocked: true }),
        pullLayer(ft, { iso3, onlyBlocked: false }),
      ]);
      out[ft] = {
        blocked: blocked.length,
        all: all.length,
        open_or_other: Math.max(0, all.length - blocked.length),
      };
    } catch (e) {
      out[ft] = {
        blocked: 0,
        all: 0,
        open_or_other: 0,
        error: e instanceof Error ? e.message : String(e),
      };
    }
  }
  return out;
}

export function fclassCoverage(features: ShapedFeature[]): {
  total: number;
  with_fclass: number;
  by_type: Record<string, { total: number; with_fclass: number }>;
  top_values: Array<{ value: string; count: number }>;
} {
  const byType: Record<string, { total: number; with_fclass: number }> = {};
  const valueCounts = new Map<string, number>();
  let withFclass = 0;

  for (const f of features) {
    const t = f.properties.feature_type;
    byType[t] ??= { total: 0, with_fclass: 0 };
    byType[t].total += 1;
    const fc = f.properties.fclass;
    if (fc) {
      withFclass += 1;
      byType[t].with_fclass += 1;
      valueCounts.set(fc, (valueCounts.get(fc) ?? 0) + 1);
    }
  }

  const top_values = [...valueCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([value, count]) => ({ value, count }));

  return {
    total: features.length,
    with_fclass: withFclass,
    by_type: byType,
    top_values,
  };
}
