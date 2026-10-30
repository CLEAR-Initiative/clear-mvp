/**
 * Sector needs for an analysis scope, read from location metadata rather than
 * a crisis entity. MSNA scores and OCHA 3W live on admin-2 districts. A wider
 * scope (country, state, several districts) sums people in need and merges
 * partners. A place finer than a district uses its admin-2 ancestor: the
 * surveys are not stored below that.
 */

export const NEEDS_SECTOR_DEFS = [
  { key: "shelter", label: "Shelter", ochaCodes: ["SHL", "SNFI", "NFI"], msnaKey: "Shelter" },
  { key: "wash", label: "WASH", ochaCodes: ["WSH", "WASH", "WS"], msnaKey: "WASH" },
  { key: "protection", label: "Protection", ochaCodes: ["PRO", "CP", "GBV"], msnaKey: "Protection" },
  { key: "health", label: "Health", ochaCodes: ["HLT", "HEA", "HEALTH"], msnaKey: "Health" },
  { key: "food", label: "Food Security", ochaCodes: ["FSL", "FSC", "FOOD", "FSLA"], msnaKey: "FSL" },
  { key: "education", label: "Education", ochaCodes: ["EDU"], msnaKey: "Education" },
] as const;

export type NeedsSectorKey = (typeof NEEDS_SECTOR_DEFS)[number]["key"];

/** Education's MSNA score is the share of school-age children, not the whole population. */
export const CHILD_SHARE_APPROX = 0.18;

export const SAF_ORDER: Record<string, number> = {
  Catastrophic: 0,
  Extreme: 1,
  Severe: 2,
  Stressed: 3,
  Minimal: 4,
};

export const SAF_LABEL_KEYS: Record<string, "catastrophic" | "extreme" | "severe" | "stressed" | "minimal" | "unknown"> = {
  Catastrophic: "catastrophic",
  Extreme: "extreme",
  Severe: "severe",
  Stressed: "stressed",
  Minimal: "minimal",
  Unknown: "unknown",
};

export interface MsnaSectorEntry {
  label: string | null;
  score: number | null;
}
export type MsnaData = Record<string, MsnaSectorEntry>;

export interface OchaOrg {
  acronym: string;
  name: string;
  type: string;
}

export interface Ocha3wSector {
  code: string;
  name: string;
  org_count: number;
  by_type: Record<string, number>;
  organizations?: OchaOrg[];
}

export interface Ocha3wData {
  as_of?: string;
  sectors: Ocha3wSector[];
}

export type LocationMeta = { type: string; data: unknown }[] | null | undefined;

export interface RawNeedsLocation {
  id: string;
  level: number;
  population?: string | null;
  ancestorIds?: string[] | null;
  metadata?: LocationMeta;
  ancestors?: {
    id: string;
    level: number;
    population?: string | null;
    metadata?: LocationMeta;
  }[] | null;
}

export interface DistrictNeeds {
  id: string;
  population: number | null;
  msna: MsnaData | null;
  ocha: Ocha3wData | null;
}

export interface AggregatedSectorNeeds {
  key: NeedsSectorKey;
  /** Worst SAF label across the scope's districts. Null when none is known. */
  saf: string | null;
  /** Sum of per-district people-in-need estimates. Null when none could be computed. */
  pin: number | null;
  pinIsApprox: boolean;
  ocha: Ocha3wSector | null;
  /** True when at least one district has an MSNA label or score for this sector. */
  hasMsna: boolean;
}

export interface AggregatedScopeNeeds {
  sectors: AggregatedSectorNeeds[];
  hasMsna: boolean;
  /** Latest OCHA 3W `as_of` among the districts that have one. */
  ochaAsOf: string | null;
}

export function parsePopulation(raw: string | number | null | undefined): number | null {
  if (typeof raw === "number") return Number.isFinite(raw) && raw > 0 ? raw : null;
  if (typeof raw !== "string" || !raw.trim()) return null;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function parseMsna(meta: LocationMeta): MsnaData | null {
  const entry = meta?.find((m) => m.type === "msna_severity_082025");
  if (!entry || !entry.data || typeof entry.data !== "object") return null;
  const sectors = (entry.data as { sectors?: unknown }).sectors;
  if (!sectors || typeof sectors !== "object" || Array.isArray(sectors)) return null;
  const out: MsnaData = {};
  for (const [key, raw] of Object.entries(sectors as Record<string, unknown>)) {
    if (!raw || typeof raw !== "object") continue;
    const row = raw as { label?: unknown; score?: unknown };
    const label = typeof row.label === "string" && row.label.trim() ? row.label.trim() : null;
    const score = typeof row.score === "number" && Number.isFinite(row.score) ? row.score : null;
    if (!label && score == null) continue;
    out[key] = { label, score };
  }
  return Object.keys(out).length > 0 ? out : null;
}

function asOrg(raw: unknown): OchaOrg | null {
  if (!raw || typeof raw !== "object") return null;
  const org = raw as { acronym?: unknown; name?: unknown; type?: unknown };
  const acronym = typeof org.acronym === "string" ? org.acronym.trim() : "";
  if (!acronym) return null;
  return {
    acronym,
    name: typeof org.name === "string" ? org.name : acronym,
    type: typeof org.type === "string" && org.type.trim() ? org.type : "Other",
  };
}

export function parseOcha3w(meta: LocationMeta): Ocha3wData | null {
  const entry = meta?.find((m) => m.type === "ocha_3w");
  if (!entry || !entry.data || typeof entry.data !== "object") return null;
  const data = entry.data as { as_of?: unknown; sectors?: unknown };
  if (!Array.isArray(data.sectors)) return null;
  const sectors: Ocha3wSector[] = [];
  for (const raw of data.sectors) {
    if (!raw || typeof raw !== "object") continue;
    const row = raw as {
      code?: unknown;
      name?: unknown;
      org_count?: unknown;
      by_type?: unknown;
      organizations?: unknown;
    };
    const code = typeof row.code === "string" ? row.code : "";
    if (!code) continue;
    const byType: Record<string, number> = {};
    if (row.by_type && typeof row.by_type === "object" && !Array.isArray(row.by_type)) {
      for (const [type, n] of Object.entries(row.by_type as Record<string, unknown>)) {
        if (typeof n === "number" && Number.isFinite(n) && n > 0) byType[type] = n;
      }
    }
    const organizations = Array.isArray(row.organizations)
      ? row.organizations.map(asOrg).filter((org): org is OchaOrg => org !== null)
      : undefined;
    const orgCount = typeof row.org_count === "number" && Number.isFinite(row.org_count) ? row.org_count : 0;
    if (orgCount <= 0 && (!organizations || organizations.length === 0)) continue;
    sectors.push({
      code,
      name: typeof row.name === "string" ? row.name : code,
      org_count: orgCount > 0 ? orgCount : (organizations?.length ?? 0),
      by_type: byType,
      organizations,
    });
  }
  if (sectors.length === 0) return null;
  return {
    as_of: typeof data.as_of === "string" && data.as_of.trim() ? data.as_of : undefined,
    sectors,
  };
}

/** People in need for one district. Missing score or population stays null, never zero. */
export function sectorPin(
  score: number | null,
  population: number | null,
  education: boolean,
): { pin: number | null; approx: boolean } {
  if (score == null || population == null || population <= 0 || !Number.isFinite(score) || score < 0) {
    return { pin: null, approx: false };
  }
  const base = education ? Math.round(population * CHILD_SHARE_APPROX) : population;
  if (base <= 0) return { pin: null, approx: false };
  return { pin: Math.round((score / 100) * base), approx: education };
}

export function matchOchaSector(sectors: Ocha3wSector[], codes: string[]): Ocha3wSector | null {
  const upper = codes.map((c) => c.toUpperCase());
  return sectors.find((s) => upper.includes(s.code.toUpperCase())) ?? null;
}

/** Union named partners. Districts that only have counts are added on top. A total of zero is dropped. */
export function mergeOchaSectors(parts: Ocha3wSector[]): Ocha3wSector | null {
  if (parts.length === 0) return null;
  const named = new Map<string, OchaOrg>();
  let extra = 0;
  const extraType: Record<string, number> = {};
  for (const part of parts) {
    if (part.organizations && part.organizations.length > 0) {
      for (const org of part.organizations) {
        const key = org.acronym.trim().toUpperCase();
        if (key && !named.has(key)) named.set(key, org);
      }
    } else if (part.org_count > 0) {
      extra += part.org_count;
      for (const [type, n] of Object.entries(part.by_type)) {
        if (n > 0) extraType[type] = (extraType[type] ?? 0) + n;
      }
    }
  }
  const organizations = [...named.values()];
  const byType: Record<string, number> = { ...extraType };
  for (const org of organizations) {
    byType[org.type] = (byType[org.type] ?? 0) + 1;
  }
  const orgCount = organizations.length + extra;
  if (orgCount <= 0) return null;
  return {
    code: parts[0]!.code,
    name: parts[0]!.name,
    org_count: orgCount,
    by_type: byType,
    organizations: organizations.length > 0 ? organizations : undefined,
  };
}

function worstSaf(labels: (string | null | undefined)[]): string | null {
  let best: { label: string; rank: number } | null = null;
  for (const label of labels) {
    if (!label) continue;
    const rank = SAF_ORDER[label];
    if (rank == null) continue;
    if (!best || rank < best.rank) best = { label, rank };
  }
  return best?.label ?? null;
}

function latestAsOf(dates: (string | undefined)[]): string | null {
  let best: { iso: string; time: number } | null = null;
  for (const iso of dates) {
    if (!iso) continue;
    const time = Date.parse(iso);
    if (Number.isNaN(time)) continue;
    if (!best || time > best.time) best = { iso, time };
  }
  return best?.iso ?? null;
}

/** The admin-2 record for this location, or null when the location is a country or state. */
export function resolveDistrict(loc: RawNeedsLocation): DistrictNeeds | null {
  const a2 = loc.level === 2 ? loc : loc.level > 2 ? (loc.ancestors?.find((a) => a.level === 2) ?? null) : null;
  if (!a2) return null;
  return {
    id: a2.id,
    population: parsePopulation(a2.population),
    msna: parseMsna(a2.metadata),
    ocha: parseOcha3w(a2.metadata),
  };
}

/**
 * District rows for a scope. Locations above admin-2 expand to the supplied
 * level-2 list (their descendants). Finer locations collapse to their district,
 * and the same district is counted once.
 */
export function districtsInScope(scope: RawNeedsLocation[], level2: RawNeedsLocation[]): DistrictNeeds[] {
  const byId = new Map<string, DistrictNeeds>();
  const add = (district: DistrictNeeds | null) => {
    if (district && !byId.has(district.id)) byId.set(district.id, district);
  };
  const parents = scope.filter((loc) => loc.level < 2).map((loc) => loc.id);
  for (const loc of scope) {
    if (loc.level >= 2) add(resolveDistrict(loc));
  }
  if (parents.length > 0) {
    for (const loc of level2) {
      const ancestors = loc.ancestorIds ?? [];
      if (parents.some((id) => id === loc.id || ancestors.includes(id))) add(resolveDistrict(loc));
    }
  }
  return [...byId.values()];
}

export function aggregateScopeNeeds(districts: DistrictNeeds[]): AggregatedScopeNeeds {
  const unique = new Map<string, DistrictNeeds>();
  for (const district of districts) unique.set(district.id, district);
  const rows = [...unique.values()];

  const sectors = NEEDS_SECTOR_DEFS.map((def): AggregatedSectorNeeds => {
    const entries = rows.map((row) => row.msna?.[def.msnaKey] ?? null);
    let pin: number | null = null;
    for (const [index, entry] of entries.entries()) {
      const estimated = sectorPin(entry?.score ?? null, rows[index]!.population, def.key === "education");
      if (estimated.pin == null) continue;
      pin = (pin ?? 0) + estimated.pin;
    }
    const ochaParts = rows
      .map((row) => (row.ocha ? matchOchaSector(row.ocha.sectors, [...def.ochaCodes]) : null))
      .filter((part): part is Ocha3wSector => part !== null);
    return {
      key: def.key,
      saf: worstSaf(entries.map((entry) => entry?.label)),
      pin,
      pinIsApprox: def.key === "education" && pin != null,
      ocha: mergeOchaSectors(ochaParts),
      hasMsna: entries.some((entry) => entry != null && (entry.label != null || entry.score != null)),
    };
  });

  return {
    sectors,
    hasMsna: sectors.some((sector) => sector.hasMsna),
    ochaAsOf: latestAsOf(rows.map((row) => row.ocha?.as_of)),
  };
}

/** `crisis.needs.generalSummary`, when the pipeline wrote one. */
export function needsGeneralSummary(needs: unknown): string | string[] | null {
  if (!needs || typeof needs !== "object") return null;
  const raw = (needs as { generalSummary?: unknown }).generalSummary;
  if (Array.isArray(raw)) {
    const bullets = raw.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean);
    return bullets.length > 0 ? bullets : null;
  }
  if (typeof raw === "string" && raw.trim()) return raw.trim();
  return null;
}
