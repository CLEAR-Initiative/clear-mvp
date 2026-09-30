/**
 * Map a unified frame-scoped `analysis` row (clear-api ADR-0007) into the
 * Analysis page shape.
 *
 * The `data` payload is the situation-analysis payload plus `scenarios`
 * (schema v4), so the proven situation mapper does the heavy lifting and this
 * module only adds what is new: the frame, scenarios, and which citations are
 * events rather than reports.
 */

import {
  mapSituationAnalysis,
  type SaBullet,
  type SaPayload,
  type SituationAnalysis,
} from "~/server/api/mappers/situation-analysis";
import { toMapPointGeometry } from "~/lib/geo/to-map-point";
import { scopeLabel, type LabelLocation } from "~/lib/analysis-view";

/** Knowledgebase incident hits cite as `event:<eventId>` (ADR-0006). */
export const EVENT_CITATION_PREFIX = "event:";

export function eventIdFromCitation(id: string): string | null {
  return id.startsWith(EVENT_CITATION_PREFIX) ? id.slice(EVENT_CITATION_PREFIX.length) : null;
}

interface RawScenarios {
  description?: string | null;
  most_likely?: string | null;
  best_case?: string | null;
  worst_case?: string | null;
  source_report_ids?: string[];
}

/** Flash-report style "Subject: finding" bullets under the summary (pipeline schema, additive). */
interface RawKeyFinding {
  description?: string | null;
  source_report_ids?: string[];
}

export type AnalysisPayload = SaPayload & {
  scenarios?: RawScenarios | null;
  ai_summary?: SaPayload["ai_summary"] & { key_findings?: RawKeyFinding[] | null };
};

/** The GraphQL `Analysis` row. */
export interface AnalysisRow {
  id: string;
  locationIds: string[];
  eventTypes: string[];
  needSectors: string[];
  windowStart: string;
  windowEnd: string | null;
  data: AnalysisPayload;
  sourceReportIds: string[];
  generatedByModel: string;
  generatedAt: string;
  schemaVersion: string;
}

export interface AnalysisScenarios {
  description: string | null;
  mostLikely: string | null;
  bestCase: string | null;
  worstCase: string | null;
  refs: number[];
}

export interface Analysis extends SituationAnalysis {
  id: string;
  scope: {
    locationIds: string[];
    name: string;
    windowStart: string;
    windowEnd: string | null;
  };
  scenarios: AnalysisScenarios | null;
  /** "Subject: finding" bullets under the summary; empty for older rows. */
  keyFindings: SaBullet[];
  /** Source ids (as in `sources[].id`) that are events, not reports. */
  eventSourceIds: string[];
}

function clean(s: string | null | undefined): string | null {
  const v = s?.trim();
  return v ? v : null;
}

export function mapAnalysis(row: AnalysisRow, scopeName: string): Analysis {
  const base = mapSituationAnalysis(
    {
      id: row.id,
      countryLocationId: row.locationIds[0] ?? "",
      windowStart: row.windowStart,
      windowEnd: row.windowEnd ?? "",
      data: row.data ?? {},
      sourceReportIds: row.sourceReportIds ?? [],
      generatedByModel: row.generatedByModel,
      generatedAt: row.generatedAt,
      schemaVersion: row.schemaVersion,
    },
    scopeName,
  );

  const index = new Map(base.sources.map((s, i) => [s.id, i + 1]));
  const refsFrom = (ids: string[] | undefined) =>
    [...new Set((ids ?? []).map((id) => index.get(id)).filter((n): n is number => n != null))].sort(
      (a, b) => a - b,
    );

  const raw = row.data?.scenarios;
  const scenarios: AnalysisScenarios | null = raw
    ? {
        description: clean(raw.description),
        mostLikely: clean(raw.most_likely),
        bestCase: clean(raw.best_case),
        worstCase: clean(raw.worst_case),
        refs: refsFrom(raw.source_report_ids),
      }
    : null;
  const hasScenarios =
    scenarios && (scenarios.mostLikely ?? scenarios.bestCase ?? scenarios.worstCase ?? scenarios.description);

  return {
    ...base,
    id: row.id,
    scope: {
      locationIds: row.locationIds,
      name: scopeName,
      windowStart: row.windowStart,
      windowEnd: row.windowEnd,
    },
    scenarios: hasScenarios ? scenarios : null,
    keyFindings: (row.data?.ai_summary?.key_findings ?? [])
      .map((f) => ({ text: clean(f.description) ?? "", refs: refsFrom(f.source_report_ids) }))
      .filter((f) => f.text),
    eventSourceIds: base.sources.map((s) => s.id).filter((id) => eventIdFromCitation(id) !== null),
  };
}

/** SAF sectors the pipeline extracts a people-in-need figure for (`pin_<sector>`). */
export const PIN_SECTORS = [
  "food_security",
  "health",
  "wash",
  "protection",
  "shelter",
  "education",
  "nutrition",
] as const;
export type PinSector = (typeof PIN_SECTORS)[number];

interface RawEnvelope {
  value?: number | null;
  value_low?: number | null;
  value_high?: number | null;
  newest_report_at?: string | null;
}

export interface AnalysisFigure {
  value: number;
  low: number | null;
  high: number | null;
  newestAt: string | null;
}

/**
 * The scope's current stock figures from the all-time aggregation tier: the
 * latest reported value per field, which is what "current" means for stocks
 * (displaced, refugees, people in need). Flows and funding are deliberately
 * not read here: an all-time tier sums them across years.
 */
export interface AnalysisFigures {
  idpStock: AnalysisFigure | null;
  refugees: AnalysisFigure | null;
  returneeStock: AnalysisFigure | null;
  overallPin: AnalysisFigure | null;
  pinBySector: { sector: PinSector; figure: AnalysisFigure }[];
}

function toFigure(raw: unknown): AnalysisFigure | null {
  if (!raw || typeof raw !== "object") return null;
  const e = raw as RawEnvelope;
  if (typeof e.value !== "number" || !Number.isFinite(e.value)) return null;
  const num = (n: unknown) => (typeof n === "number" && Number.isFinite(n) ? n : null);
  return {
    value: Math.round(e.value),
    low: num(e.value_low),
    high: num(e.value_high),
    newestAt: typeof e.newest_report_at === "string" ? e.newest_report_at : null,
  };
}

export function mapFigures(data: Record<string, unknown> | null | undefined): AnalysisFigures {
  const d = data ?? {};
  return {
    idpStock: toFigure(d.idp_stock),
    refugees: toFigure(d.refugees),
    returneeStock: toFigure(d.returnee_stock),
    overallPin: toFigure(d.overall_pin),
    pinBySector: PIN_SECTORS.map((sector) => ({ sector, figure: toFigure(d[`pin_${sector}`]) }))
      .filter((r): r is { sector: PinSector; figure: AnalysisFigure } => r.figure !== null)
      .sort((a, b) => b.figure.value - a.figure.value),
  };
}

export interface GqlAnalysisLocation {
  id: string;
  name: string;
  level: number;
  geometry?: unknown;
  ancestors?: { id: string; name: string; level: number }[] | null;
}

/** The GraphQL `Event` fields the analysis page reads. */
export interface GqlAnalysisEvent {
  id: string;
  title: string | null;
  types: string[];
  severity: number | null;
  firstSignalCreatedAt: string;
  lastSignalCreatedAt: string;
  casualties: number | null;
  populationDisplaced: string | null;
  representativePoint: GqlAnalysisLocation | null;
  generalLocation: GqlAnalysisLocation | null;
}

export interface AnalysisEvent {
  id: string;
  title: string | null;
  types: string[];
  severity: number | null;
  startedAt: string;
  lastSignalAt: string;
  casualties: number | null;
  populationDisplaced: number | null;
  /** [lng, lat] for the map marker, null when the event has no geometry. */
  point: [number, number] | null;
  locationName: string | null;
  /** The admin-1 area the event sits in, for the scope panel's breakdown. */
  admin1: { id: string; name: string } | null;
}

export interface AnalysisEvents {
  totalCount: number;
  items: AnalysisEvent[];
}

/**
 * The frame the weekly pipeline writes for a country: the calendar year to
 * date, regenerated weekly. clear-api matches `windowEnd` exactly, so this must
 * stay byte-identical to the pipeline's `_calendar_year_window`.
 */
export function countryFrame(countryLocationId: string, year: number) {
  return {
    locationIds: [countryLocationId],
    windowStart: `${year}-01-01T00:00:00Z`,
    windowEnd: `${year}-12-31T23:59:59Z`,
  };
}

function admin1Of(loc: GqlAnalysisLocation | null): { id: string; name: string } | null {
  if (!loc) return null;
  if (loc.level === 1) return { id: loc.id, name: loc.name };
  const a1 = loc.ancestors?.find((a) => a.level === 1);
  return a1 ? { id: a1.id, name: a1.name } : null;
}

export function toAnalysisEvent(e: GqlAnalysisEvent): AnalysisEvent {
  const geometry = (e.representativePoint?.geometry ?? null) as Parameters<typeof toMapPointGeometry>[0];
  const point = toMapPointGeometry(geometry)?.coordinates ?? null;
  const displaced = e.populationDisplaced != null ? Number(e.populationDisplaced) : null;
  return {
    id: e.id,
    title: e.title,
    types: e.types ?? [],
    severity: e.severity,
    startedAt: e.firstSignalCreatedAt,
    lastSignalAt: e.lastSignalCreatedAt,
    casualties: e.casualties,
    populationDisplaced: displaced != null && Number.isFinite(displaced) ? displaced : null,
    point,
    locationName: e.generalLocation?.name ?? e.representativePoint?.name ?? null,
    admin1: admin1Of(e.generalLocation),
  };
}

/** The GraphQL `AnalysisAutomation` row. */
export interface GqlAutomation {
  id: string;
  locationIds: string[];
  eventTypes: string[];
  needSectors: string[];
  windowStart: string;
  cadence: string;
  teamId: string | null;
  enabled: boolean;
  createdAt: string;
}

export interface CountryAnalysisEntry {
  id: string;
  name: string;
  analysisId: string | null;
  generatedAt: string | null;
  /** First sentence of the current analysis' summary, for the landing list. */
  headline: string | null;
}

export interface CreatedAnalysis {
  /** Automation id. */
  id: string;
  name: string;
  locationIds: string[];
  eventTypes: string[];
  needSectors: string[];
  /**
   * Country the scope sits in, for filtering by the selected country. Null
   * when the location lookup failed: the UI then lists it under every country
   * rather than hiding it.
   */
  countryId: string | null;
  windowStart: string;
  cadence: string;
  enabled: boolean;
  createdAt: string;
  /** Null until the first run has generated the analysis. */
  analysisId: string | null;
  generatedAt: string | null;
}

export interface AnalysisScopes {
  countries: CountryAnalysisEntry[];
  created: CreatedAnalysis[];
}

export type GqlLabelLocation = LabelLocation & { level: number };

function countryOf(loc: GqlLabelLocation): string | null {
  if (loc.level === 0) return loc.id;
  return loc.ancestors?.find((a) => a.level === 0)?.id ?? null;
}

/**
 * A team automation as a created analysis, named from its locations. Without
 * the locations (lookup failed) it falls back to raw ids and a null country.
 */
export function toCreatedAnalysis(
  a: GqlAutomation,
  locations: Map<string, GqlLabelLocation>,
  stamp: { id: string; generatedAt: string } | null,
): CreatedAnalysis {
  const locs = a.locationIds.map((id) => locations.get(id)).filter((l): l is GqlLabelLocation => !!l);
  return {
    id: a.id,
    name: scopeLabel(locs) || a.locationIds.join(", "),
    locationIds: a.locationIds,
    eventTypes: a.eventTypes,
    needSectors: a.needSectors,
    countryId: locs[0] ? countryOf(locs[0]) : null,
    windowStart: a.windowStart,
    cadence: a.cadence,
    enabled: a.enabled,
    createdAt: a.createdAt,
    analysisId: stamp?.id ?? null,
    generatedAt: stamp?.generatedAt ?? null,
  };
}
