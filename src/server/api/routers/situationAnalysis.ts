import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { graphqlFetch, cookieHeaders } from "~/server/api/graphql";
import {
  mapSituationAnalysis,
  type SaRow,
  type SituationAnalysis,
} from "~/server/api/mappers/situation-analysis";

/**
 * Situation Analysis (SAF Framework).
 *
 * Reads the pre-computed `situationAnalysis` snapshots the Dagster
 * `weekly_situation_analyses` asset writes, one per (country x year). Nothing
 * is generated on request: the resolver is a cache read, so a country with no
 * snapshot yet returns null and the UI renders an empty state rather than
 * blocking on a generation that happens on a weekly cadence.
 */

const SITUATION_ANALYSIS_QUERY = `
  query SituationAnalysis(
    $countryLocationId: String!
    $year: Int
    $asOf: DateTime
    $windowKind: String
    $windowStart: DateTime
  ) {
    situationAnalysis(
      countryLocationId: $countryLocationId
      year: $year
      asOf: $asOf
      windowKind: $windowKind
      windowStart: $windowStart
    ) {
      id
      countryLocationId
      windowStart
      windowEnd
      data
      sourceReportIds
      generatedByModel
      generatedAt
      schemaVersion
    }
  }
`;

const COUNTRIES_QUERY = `
  query SituationAnalysisCountries {
    locations(level: 0) {
      id
      name
    }
  }
`;

interface GqlCountry {
  id: string;
  name: string;
}

interface ReportMeta {
  reportId: string;
  reportTitle: string | null;
  sourceUrl: string | null;
  publishedAt: string | null;
}

/**
 * Look up titles for reports the narrative cites but the payload's own
 * `sources.reports` omits.
 *
 * The pipeline builds that list from the datapoint aggregation's contributors
 * only, so most RAG-cited reports are missing from it and would otherwise
 * render as bare numbers. clear-api knows them: one aliased `reportDatapoint`
 * per id in a single round trip.
 *
 * Best-effort - on failure the caller still renders, just without titles.
 */
async function fetchReportMeta(
  ids: string[],
  headers: Record<string, string>,
): Promise<Map<string, ReportMeta>> {
  const out = new Map<string, ReportMeta>();
  if (ids.length === 0) return out;

  const fields = ids
    .map((_, i) => `r${i}: reportDatapoint(reportId: $i${i}) { reportId reportTitle sourceUrl publishedAt }`)
    .join("\n");
  const params = ids.map((_, i) => `$i${i}: String!`).join(", ");
  const variables = Object.fromEntries(ids.map((id, i) => [`i${i}`, id]));

  try {
    const data = await graphqlFetch<Record<string, ReportMeta | null>>(
      `query ReportMeta(${params}) {\n${fields}\n}`,
      variables,
      headers,
    );
    for (const meta of Object.values(data ?? {})) {
      if (meta?.reportId) out.set(meta.reportId, meta);
    }
  } catch {
    // Titles are a nicety; numbering still works without them.
  }
  return out;
}

/**
 * ISO timestamps for the start of the current month and the `back` months
 * before it, newest first. Midnight UTC on the 1st, which is the exact instant
 * the pipeline writes as `windowStart` - the API matches it for equality, so
 * anything else silently returns null.
 */
function recentMonthStarts(back: number): string[] {
  const now = new Date();
  return Array.from({ length: back }, (_, i) =>
    new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1)).toISOString(),
  );
}

export const situationAnalysisRouter = createTRPCRouter({
  /**
   * Countries available in the selector: every level-0 location.
   *
   * The backend has no "countries that have a situation analysis" query, and
   * `pipelineCountries` carries only a name and bbox (no location id), so it
   * cannot key the analysis read. Listing all countries and letting `get`
   * return null keeps the selector honest about what it can offer without
   * inventing an availability signal the API does not expose.
   */
  countries: protectedProcedure.query(async ({ ctx }): Promise<GqlCountry[]> => {
    const { locations } = await graphqlFetch<{ locations: GqlCountry[] }>(
      COUNTRIES_QUERY,
      undefined,
      cookieHeaders(ctx),
    );
    return [...locations].sort((a, b) => a.name.localeCompare(b.name));
  }),

  /**
   * Current snapshot for a country. `year` defaults server-side to the current
   * calendar year. Returns null when no snapshot exists for that bucket.
   */
  get: protectedProcedure
    .input(
      z.object({
        countryLocationId: z.string().min(1),
        countryName: z.string().min(1),
        year: z.number().int().optional(),
        /** Historical read: the version current at this ISO timestamp. Used by
         *  the "what changed" comparison to fetch a prior snapshot. */
        asOf: z.string().datetime().optional(),
      }),
    )
    .query(async ({ ctx, input }): Promise<SituationAnalysis | null> => {
      const fetchBucket = (vars: Record<string, unknown>) =>
        graphqlFetch<{ situationAnalysis: SaRow | null }>(
          SITUATION_ANALYSIS_QUERY,
          { countryLocationId: input.countryLocationId, ...vars },
          cookieHeaders(ctx),
        ).then((d) => d.situationAnalysis);

      const base = {
        ...(input.year != null ? { year: input.year } : {}),
        ...(input.asOf != null ? { asOf: input.asOf } : {}),
      };

      // Prefer the monthly bucket. Both buckets are generated from the same
      // retrieved reports, but the yearly synthesises them as a year in review
      // ("2026 was transformed by...") while the monthly reads as the current
      // state - which is what a situation analysis is for. Monthly also
      // carries fast-moving facts the yearly has been observed to drop.
      //
      // Falls back a month, then to yearly: a bucket only exists once that
      // month has been generated, so early in a month, or for a country the
      // pipeline has just picked up, the current month can legitimately be
      // missing.
      let row: SaRow | null = null;
      for (const start of recentMonthStarts(2)) {
        row = await fetchBucket({ ...base, windowKind: "monthly", windowStart: start });
        if (row) break;
      }
      row ??= await fetchBucket(base);

      if (!row) return null;

      // Hydrate the reports the narrative cites but `sources.reports` omits, so
      // their citation chips resolve to a real title instead of a bare number.
      const listed = new Set(
        (row.data?.sources?.reports ?? []).map((r) => r.report_id).filter(Boolean),
      );
      const missing = (row.sourceReportIds ?? []).filter((id) => id && !listed.has(id));
      if (missing.length > 0) {
        const meta = await fetchReportMeta(missing, cookieHeaders(ctx));
        const hydrated = missing
          .map((id) => meta.get(id))
          .filter((m): m is ReportMeta => !!m)
          .map((m) => ({
            report_id: m.reportId,
            report_title: m.reportTitle ?? undefined,
            source_url: m.sourceUrl ?? undefined,
            published_at: m.publishedAt ?? undefined,
          }));
        row = {
          ...row,
          data: {
            ...row.data,
            sources: { reports: [...(row.data?.sources?.reports ?? []), ...hydrated] },
          },
        };
      }

      return mapSituationAnalysis(row, input.countryName);
    }),
});
