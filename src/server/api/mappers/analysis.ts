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
