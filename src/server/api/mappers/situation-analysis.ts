/**
 * Map the `situationAnalysis` GraphQL payload into the shape the Situation
 * Analysis UI consumes.
 *
 * The backend deliberately types `data` as opaque `JSON` because the taxonomy
 * still evolves - it is versioned via `schemaVersion` instead. The Pydantic
 * models in `clear-context-pipeline/.../situation/schemas.py` are the source of
 * truth for the payload; the interfaces below hand-mirror them for `v1`.
 *
 * Every field is treated as optional. Early pipeline runs leave most numeric
 * datapoints null and can emit a sector with no severity and empty lists, so
 * the mapper drops empty collections rather than passing placeholders down -
 * the UI hides a section instead of rendering an empty one.
 */

/**
 * Severity scale. Mirrors the `Severity` Literal in the pipeline's
 * `situation/schemas.py` exactly - it emits only these four values, and the
 * generator is instructed to return null rather than hedge to `medium` when
 * the evidence is too thin to judge. `null` = not assessed.
 */
export type SaSeverity = "critical" | "high" | "medium" | "low" | null;

const KNOWN_SEVERITIES: readonly string[] = ["critical", "high", "medium", "low"];

// ─── Raw payload (schemaVersion v1) ──────────────────────────────────────────

interface RawSector {
  severity?: string | null;
  impact?: string[];
  top_needs?: string[];
  vulnerable_sections?: string[];
  priority_interventions?: string[];
  humanitarian_conditions?: string[];
  information_coverage?: Array<{
    area?: string;
    report_count?: number;
    rating_out_of_10?: number;
  }>;
  source_report_ids?: string[];
  evidence_scope?: "sector" | "fallback" | null;
  /**
   * Per-line attribution from the pipeline (PR #31): report_id -> the exact
   * generated lines that report supported. Inverted below into line -> refs so
   * a bullet can cite its own sources rather than the whole sector's.
   */
  contributing_sources?: Record<string, string[]>;
}

interface RawContextRisk {
  bullets?: string[];
  source_report_ids?: string[];
  contributing_sources?: Record<string, string[]>;
}

interface RawDescribed {
  description?: string;
  source_report_ids?: string[];
}

/** A headline figure served as a RANGE, not a point (pipeline ADR-0007). `value`
 *  is the point estimate; `[low, high]` its honest error bar; `bias` says which
 *  way the pipeline would project the band to one number; `confidence` is the
 *  field's 0–1 data-quality signal. All nullable; an exact figure has
 *  `low === high === value`. Legacy pre-v3 rows may still carry a bare number. */
interface RawRangeFigure {
  value?: number | null;
  low?: number | null;
  high?: number | null;
  range_width?: number | null;
  bias?: string | null;
  confidence?: number | null;
}

export interface SaPayload {
  ai_summary?: {
    text?: string | null;
    source_report_ids?: string[];
    contributing_sources?: Record<string, string[]>;
  };
  datapoints?: {
    envelope?: {
      report_count?: number;
      quality_score?: number;
      oldest_source_at?: string;
      newest_source_at?: string;
    };
    returnees?: RawRangeFigure | null;
    number_of_events?: number | null;
    population_in_need?: RawRangeFigure | null;
    population_affected?: RawRangeFigure | null;
    population_displaced?: RawRangeFigure | null;
    funding_received_usd?: RawRangeFigure | null;
    funding_required_usd?: RawRangeFigure | null;
  };
  context_risks?: Record<string, RawContextRisk>;
  hazards_and_vulnerabilities?: {
    hazards?: RawDescribed[];
    vulnerabilities?: RawDescribed[];
  };
  displacement?: {
    push_factors?: RawDescribed[];
    return_intention?: RawDescribed[];
  };
  sectors?: Record<string, RawSector>;
  sources?: {
    reports?: Array<{
      report_id?: string;
      source_url?: string | null;
      published_at?: string | null;
      report_title?: string | null;
    }>;
  };
  changes?: {
    compared_to?: string | null;
    notes?: Record<string, string>;
  };
}

/** The GraphQL row wrapping the payload. */
export interface SaRow {
  id: string;
  countryLocationId: string;
  windowStart: string;
  windowEnd: string;
  data: SaPayload;
  sourceReportIds: string[];
  generatedByModel: string;
  generatedAt: string;
  schemaVersion: string;
}

// ─── UI shape ────────────────────────────────────────────────────────────────

/**
 * `key` resolves to an `insights.situation.stats.<key>` i18n message. Kept as a
 * literal union so next-intl can check the message exists at compile time.
 */
export type SaStatKey =
  | "displaced"
  | "affected"
  | "inNeed"
  | "returnees"
  | "fundingRequired"
  | "fundingReceived";

export interface SaStat {
  key: SaStatKey;
  /** Compact point estimate, e.g. "6.5M" (funding rows are prefixed "$"). */
  value: string;
  /** Compact error bar, e.g. "6.1M – 6.9M" (or "$..."). Null when the figure is
   *  exact (low === high) or the band is absent - render just the point then. */
  range: string | null;
  /** The figure's 0–1 data-quality signal, null when the pipeline didn't set it. */
  confidence: number | null;
}

export interface SaCrisis {
  country: string;
  /** Calendar year of the analysis window, e.g. "2026". */
  year: string;
  generatedAt: string;
  generatedByModel: string;
  schemaVersion: string;
  reportCount: number | null;
  qualityScore: number | null;
  /** Newest contributing source date, for the "freshest 5 days ago" line. */
  freshestSourceAt: string | null;
}

export interface SaContextRisk {
  key: string;
  label: string;
  items: string[];
  /** Citation numbers (1-based, into `sources`) this domain drew on. */
  refs: number[];
  /** Per-bullet citations keyed by exact bullet text. Empty on older analyses,
   *  in which case callers fall back to the domain-level `refs`. */
  lineRefs: Record<string, number[]>;
}

export interface SaCoverage {
  area: string;
  /** 0–10 information-coverage rating. */
  score: number;
  reportCount: number;
}

export interface SaSector {
  id: string;
  code: string;
  name: string;
  severity: SaSeverity;
  impact: string[];
  humanitarian: string[];
  atRisk: string[];
  needs: string[];
  interventions: string[];
  coverage: SaCoverage[];
  /** Citation numbers (1-based, into `sources`) this sector drew on. */
  refs: number[];
  /**
   * Per-line citations: bullet text -> citation numbers. Keyed by the exact
   * generated line, which is how the pipeline emits it. Empty for analyses
   * generated before per-line attribution shipped, so callers must fall back
   * to the sector-level `refs`.
   */
  lineRefs: Record<string, number[]>;
  /** Distinct contributing reports - a plain evidence-count signal. */
  reportCount: number;
  /** "fallback" when the grade came from an off-sector search (an inference,
   *  not sector reporting); "sector" when evidenced; null when not produced. */
  evidenceScope: "sector" | "fallback" | null;
}

export interface SaSource {
  id: string;
  title: string;
  url: string | null;
  publishedAt: string | null;
}

/** A single sourced claim: the text plus the citation numbers backing it.
 *  Hazards and displacement carry genuine per-bullet source ids, so these
 *  render true inline citations - one `[n]` right after each claim. */
export interface SaBullet {
  text: string;
  refs: number[];
}

export interface SituationAnalysis {
  crisis: SaCrisis;
  summary: string | null;
  /** Citation numbers the AI summary drew on, as a whole. */
  summaryRefs: number[];
  /**
   * Per-sentence citations for the summary: exact sentence -> citation
   * numbers. Empty when the pipeline produced no per-line attribution, in
   * which case the UI falls back to the block-level `summaryRefs`.
   */
  summaryLineRefs: Record<string, number[]>;
  stats: SaStat[];
  /** Raw numeric datapoints, keyed for the "what changed" numeric diff. Null
   *  where the pipeline did not resolve a value. */
  figures: Record<SaStatKey, number | null>;
  contextRisks: SaContextRisk[];
  hazards: { hazards: SaBullet[]; vulnerabilities: SaBullet[] };
  displacement: { push: SaBullet[]; return: SaBullet[] };
  sectors: SaSector[];
  sources: SaSource[];
  /** Pipeline-generated "what changed vs the prior snapshot" notes, keyed by
   *  section path (summary, context_risks.<domain>, hazards, displacement,
   *  sectors.<id>). Empty until the pipeline produces them. */
  changes: { comparedTo: string | null; notes: Record<string, string> };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Canonical two-letter sector codes; falls back to the first two letters. */
const SECTOR_CODES: Record<string, string> = {
  education: "ED",
  food_security: "FS",
  health: "HE",
  livelihoods: "LH",
  logistics: "LG",
  nutrition: "NU",
  protection: "PR",
  shelter: "SH",
  wash: "WA",
};

/** Order sectors deterministically; unknown sectors sort last, alphabetically. */
const SECTOR_ORDER = [
  "protection",
  "food_security",
  "health",
  "wash",
  "shelter",
  "nutrition",
  "education",
  "livelihoods",
  "logistics",
];

/** snake_case → Title Case ("food_security" → "Food Security"). */
function titleise(key: string): string {
  return key
    .split("_")
    .map((w) => (w ? w[0]!.toUpperCase() + w.slice(1) : w))
    .join(" ");
}

function toSeverity(raw: string | null | undefined): SaSeverity {
  const s = raw?.toLowerCase().trim();
  return s && KNOWN_SEVERITIES.includes(s) ? (s as SaSeverity) : null;
}

/** Short human number: 19_100_000 → "19.1M". */
export function compactNumber(n: number): string {
  if (Math.abs(n) >= 1_000_000_000)
    return `${(n / 1_000_000_000).toFixed(1).replace(/\.0$/, "")}B`;
  if (Math.abs(n) >= 1_000_000)
    return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (Math.abs(n) >= 1_000)
    return `${(n / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  return String(n);
}

/** Pull each SAF bullet's text + its own citation numbers, dropping blanks. */
function sourcedBullets(
  items: RawDescribed[] | undefined,
  refsFrom: (ids: string[] | undefined) => number[],
): SaBullet[] {
  return (items ?? [])
    .map((i) => ({ text: i.description?.trim() ?? "", refs: refsFrom(i.source_report_ids) }))
    .filter((b) => b.text.length > 0);
}

function cleanStrings(items: string[] | undefined): string[] {
  return (items ?? []).map((s) => s?.trim()).filter((s): s is string => Boolean(s));
}

/** Build a `report_id -> citation number` index from the ordered source list,
 *  and return a resolver that turns a component's report ids into sorted,
 *  de-duplicated 1-based citation numbers. Report ids with no matching source
 *  row are dropped (they can't be cited if they aren't in the list). */
function makeRefResolver(sources: SaSource[]): (ids: string[] | undefined) => number[] {
  const index = new Map<string, number>();
  sources.forEach((s, i) => index.set(s.id, i + 1));
  return (ids) => {
    const nums = new Set<number>();
    for (const id of ids ?? []) {
      const n = index.get(id);
      if (n != null) nums.add(n);
    }
    return [...nums].sort((a, b) => a - b);
  };
}

/**
 * Invert the pipeline's `contributing_sources` (report_id -> lines it
 * supported) into the lookup the UI needs: line -> citation numbers.
 *
 * Report IDs that aren't in `sources` resolve to nothing and are skipped, same
 * as everywhere else. A line whose every citation is unresolvable is omitted
 * rather than stored empty, so callers can treat "absent" as "no per-line
 * citation" and fall back to the component-level refs.
 */
function invertContributingSources(
  contributing: Record<string, string[]> | undefined,
  refsFrom: (ids: string[] | undefined) => number[],
): Record<string, number[]> {
  if (!contributing) return {};

  const byLine = new Map<string, Set<number>>();
  for (const [reportId, lines] of Object.entries(contributing)) {
    const [ref] = refsFrom([reportId]);
    if (ref == null) continue;
    for (const line of lines ?? []) {
      const key = line.trim();
      if (!key) continue;
      const set = byLine.get(key) ?? new Set<number>();
      set.add(ref);
      byLine.set(key, set);
    }
  }

  const out: Record<string, number[]> = {};
  for (const [line, refs] of byLine) {
    out[line] = [...refs].sort((a, b) => a - b);
  }
  return out;
}

// ─── Mapper ──────────────────────────────────────────────────────────────────

/**
 * Build the stat row. Only datapoints the pipeline actually resolved appear -
 * most are null on early runs, and a "-" tile communicates nothing.
 */
function mapStats(dp: SaPayload["datapoints"]): SaStat[] {
  if (!dp) return [];

  const people: Array<[SaStatKey, RawRangeFigure | null | undefined]> = [
    ["displaced", dp.population_displaced],
    ["affected", dp.population_affected],
    ["inNeed", dp.population_in_need],
    ["returnees", dp.returnees],
  ];
  const funding: Array<[SaStatKey, RawRangeFigure | null | undefined]> = [
    ["fundingRequired", dp.funding_required_usd],
    ["fundingReceived", dp.funding_received_usd],
  ];

  const stats: SaStat[] = [];
  const push = (
    key: SaStatKey,
    f: RawRangeFigure | number | null | undefined,
    prefix: string,
  ) => {
    const { value, low, high, confidence } = figureParts(f);
    if (value == null) return; // no point estimate → no tile ("-" says nothing)
    // Only surface a band when it is a genuine spread around the point; an exact
    // source figure (low === high === value) renders as the point alone.
    const hasBand = low != null && high != null && high > low;
    const range = hasBand
      ? `${prefix}${compactNumber(low)} – ${prefix}${compactNumber(high)}`
      : null;
    stats.push({ key, value: `${prefix}${compactNumber(value)}`, range, confidence });
  };
  for (const [key, f] of people) push(key, f, "");
  for (const [key, f] of funding) push(key, f, "$");
  return stats;
}

/** Coerce a served figure - the ADR-0007 range object, or a legacy bare number
 *  from a pre-v3 row - into its numeric parts. Non-numeric members drop to null. */
function figureParts(f: RawRangeFigure | number | null | undefined): {
  value: number | null;
  low: number | null;
  high: number | null;
  confidence: number | null;
} {
  if (typeof f === "number")
    return { value: f, low: null, high: null, confidence: null };
  if (f && typeof f === "object")
    return {
      value: typeof f.value === "number" ? f.value : null,
      low: typeof f.low === "number" ? f.low : null,
      high: typeof f.high === "number" ? f.high : null,
      confidence: typeof f.confidence === "number" ? f.confidence : null,
    };
  return { value: null, low: null, high: null, confidence: null };
}

function mapSectors(
  raw: SaPayload["sectors"],
  refsFrom: (ids: string[] | undefined) => number[],
): SaSector[] {
  if (!raw) return [];

  return Object.entries(raw)
    .map(([id, s]) => ({
      id,
      code: SECTOR_CODES[id] ?? id.slice(0, 2).toUpperCase(),
      name: titleise(id),
      severity: toSeverity(s?.severity),
      impact: cleanStrings(s?.impact),
      humanitarian: cleanStrings(s?.humanitarian_conditions),
      atRisk: cleanStrings(s?.vulnerable_sections),
      needs: cleanStrings(s?.top_needs),
      interventions: cleanStrings(s?.priority_interventions),
      coverage: (s?.information_coverage ?? [])
        .filter((c) => c.area)
        .map((c) => ({
          area: c.area!,
          score: c.rating_out_of_10 ?? 0,
          reportCount: c.report_count ?? 0,
        })),
      refs: refsFrom(s?.source_report_ids),
      lineRefs: invertContributingSources(s?.contributing_sources, refsFrom),
      reportCount: new Set(s?.source_report_ids ?? []).size,
      evidenceScope: s?.evidence_scope ?? null,
    }))
    .sort((a, b) => {
      const ai = SECTOR_ORDER.indexOf(a.id);
      const bi = SECTOR_ORDER.indexOf(b.id);
      if (ai !== -1 && bi !== -1) return ai - bi;
      if (ai !== -1) return -1;
      if (bi !== -1) return 1;
      return a.name.localeCompare(b.name);
    });
}

function mapContextRisks(
  raw: SaPayload["context_risks"],
  refsFrom: (ids: string[] | undefined) => number[],
): SaContextRisk[] {
  if (!raw) return [];
  return Object.entries(raw)
    .map(([key, v]) => ({
      key,
      label: titleise(key),
      items: cleanStrings(v?.bullets),
      refs: refsFrom(v?.source_report_ids),
      lineRefs: invertContributingSources(v?.contributing_sources, refsFrom),
    }))
    // A risk category with no bullets carries no information - drop it rather
    // than render an empty row.
    .filter((r) => r.items.length > 0)
    .sort((a, b) => a.label.localeCompare(b.label));
}

function mapSources(raw: SaPayload["sources"], citedIds: string[]): SaSource[] {
  const sources: SaSource[] = (raw?.reports ?? [])
    .filter((r) => r.report_id)
    .map((r) => ({
      id: r.report_id!,
      title: r.report_title?.trim() ?? "Untitled report",
      url: r.source_url ?? null,
      publishedAt: r.published_at ?? null,
    }));

  // The pipeline builds `sources.reports` from the datapoint aggregation's
  // contributors only, while the narrative cites whatever RAG retrieved - so
  // most cited reports are missing from it (Venezuela monthly: 2 of 7 summary
  // citations resolve, 11 listed against 50 on the row). Every unresolvable id
  // is dropped downstream, which silently deletes the citation.
  //
  // Append the cited-but-unlisted ids so they at least get a number. The row's
  // `sourceReportIds` is the pipeline's own union of every contributing report,
  // so it is the right authority. Titles are unavailable for these - Citations
  // falls back to "Report n" - and they sort last, after the titled ones.
  const known = new Set(sources.map((s) => s.id));
  for (const id of citedIds) {
    if (!id || known.has(id)) continue;
    known.add(id);
    sources.push({ id, title: "", url: null, publishedAt: null });
  }
  return sources;
}

export function mapSituationAnalysis(
  row: SaRow,
  countryName: string,
): SituationAnalysis {
  const data = row.data ?? {};
  const envelope = data.datapoints?.envelope;
  const dp = data.datapoints;

  // Sources first: the citation index keys off their order, and every
  // component resolves its `source_report_ids` through the same resolver so
  // the numbers are stable across the whole analysis.
  const sources = mapSources(data.sources, row.sourceReportIds ?? []);
  const refsFrom = makeRefResolver(sources);

  return {
    crisis: {
      country: countryName,
      year: String(new Date(row.windowStart).getUTCFullYear()),
      generatedAt: row.generatedAt,
      generatedByModel: row.generatedByModel,
      schemaVersion: row.schemaVersion,
      reportCount: envelope?.report_count ?? null,
      qualityScore: envelope?.quality_score ?? null,
      freshestSourceAt: envelope?.newest_source_at ?? null,
    },
    summary: data.ai_summary?.text?.trim() ?? null,
    summaryRefs: refsFrom(data.ai_summary?.source_report_ids),
    summaryLineRefs: invertContributingSources(
      data.ai_summary?.contributing_sources,
      refsFrom,
    ),
    stats: mapStats(dp),
    figures: {
      displaced: figureParts(dp?.population_displaced).value,
      affected: figureParts(dp?.population_affected).value,
      inNeed: figureParts(dp?.population_in_need).value,
      returnees: figureParts(dp?.returnees).value,
      fundingRequired: figureParts(dp?.funding_required_usd).value,
      fundingReceived: figureParts(dp?.funding_received_usd).value,
    },
    contextRisks: mapContextRisks(data.context_risks, refsFrom),
    hazards: {
      hazards: sourcedBullets(data.hazards_and_vulnerabilities?.hazards, refsFrom),
      vulnerabilities: sourcedBullets(
        data.hazards_and_vulnerabilities?.vulnerabilities,
        refsFrom,
      ),
    },
    displacement: {
      push: sourcedBullets(data.displacement?.push_factors, refsFrom),
      return: sourcedBullets(data.displacement?.return_intention, refsFrom),
    },
    sectors: mapSectors(data.sectors, refsFrom),
    sources,
    changes: {
      comparedTo: data.changes?.compared_to ?? null,
      notes: data.changes?.notes ?? {},
    },
  };
}
