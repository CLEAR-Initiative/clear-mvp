import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { graphqlFetch, cookieHeaders } from "~/server/api/graphql";
import {
  fillMissingKeyFigures,
  mapSituationAnalysis,
  needsYearlyFill,
  type SaRow,
  type SituationAnalysis,
} from "~/server/api/mappers/situation-analysis";
import {
  recentMonthStarts,
  yearlyWindowStart,
} from "~/server/api/routers/situationAnalysis-windows";

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
  /** The publisher clear-api resolved from the report's ReliefWeb `source`.
   *  Null for legacy rows extracted before source attribution. */
  source: { name: string } | null;
}

/**
 * Look up report metadata in clear-api: the publisher for every source, and
 * title/url/date for reports the narrative cites but the payload's own
 * `sources.reports` omits.
 *
 * The pipeline builds that list from the datapoint aggregation's contributors
 * only, so most RAG-cited reports are missing from it and would otherwise
 * render as bare numbers; and it carries no publisher at all. clear-api knows
 * both: one aliased `reportDatapoint` per id in a single round trip.
 *
 * Best-effort - on failure the caller still renders, just without titles or
 * publishers.
 */
async function fetchReportMeta(
  ids: string[],
  headers: Record<string, string>,
): Promise<Map<string, ReportMeta>> {
  const out = new Map<string, ReportMeta>();
  if (ids.length === 0) return out;

  const fields = ids
    .map(
      (_, i) =>
        `r${i}: reportDatapoint(reportId: $i${i}) { reportId reportTitle sourceUrl publishedAt source { name } }`,
    )
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

      // Prefer the monthly window. Both windows are generated from the same
      // retrieved reports, but the yearly synthesises them as a year in review
      // ("2026 was transformed by...") while the monthly reads as the current
      // state - which is what a situation analysis is for. Monthly also
      // carries fast-moving facts the yearly has been observed to drop.
      //
      // Falls back a month, then to yearly: a window only exists once that
      // month has been generated, so early in a month, or for a country the
      // pipeline has just picked up, the current month can legitimately be
      // missing. Last month is a snapshot fallback only — not a figure donor.
      let source: "monthly" | "yearly" = "yearly";
      let row: SaRow | null = null;
      for (const start of recentMonthStarts(2)) {
        row = await fetchBucket({ ...base, windowKind: "monthly", windowStart: start });
        if (row) {
          source = "monthly";
          break;
        }
      }
      row ??= await fetchBucket({
        ...base,
        windowKind: "yearly",
        windowStart: yearlyWindowStart(
          input.year ?? new Date().getUTCFullYear(),
        ),
      });

      if (!row) return null;

      // Hydrate every source from clear-api in one round trip: the publisher
      // ("OCHA", "WFP") for the reports the payload lists - the pipeline's
      // `sources.reports` carries none, and the URL host only ever says
      // "reliefweb.int" - plus title/url/date for the reports the narrative
      // cites but the list omits, so their citation chips resolve to a real
      // title instead of a bare number.
      const listedReports = row.data?.sources?.reports ?? [];
      const listed = new Set(listedReports.map((r) => r.report_id).filter(Boolean));
      const missing = (row.sourceReportIds ?? []).filter((id) => id && !listed.has(id));
      const wanted = [...listed, ...missing].filter((id): id is string => !!id);
      if (wanted.length > 0) {
        const meta = await fetchReportMeta(wanted, cookieHeaders(ctx));
        const withPublisher = listedReports.map((r) => {
          const name = r.report_id ? meta.get(r.report_id)?.source?.name : undefined;
          return name ? { ...r, publisher: name } : r;
        });
        const hydrated = missing
          .map((id) => meta.get(id))
          .filter((m): m is ReportMeta => !!m)
          .map((m) => ({
            report_id: m.reportId,
            report_title: m.reportTitle ?? undefined,
            source_url: m.sourceUrl ?? undefined,
            published_at: m.publishedAt ?? undefined,
            publisher: m.source?.name ?? undefined,
          }));
        row = {
          ...row,
          data: {
            ...row.data,
            sources: { reports: [...withPublisher, ...hydrated] },
          },
        };
      }

      const mapped = mapSituationAnalysis(row, input.countryName);

      // Per-figure fill: keep the monthly narrative and borrow only unresolved
      // Key figures from the same-year yearly window. Skip when the page *is*
      // already the yearly snapshot (nothing was borrowed) or every figure
      // already has a point estimate.
      if (source !== "monthly" || !needsYearlyFill(mapped)) return mapped;

      const year = new Date(row.windowStart).getUTCFullYear();
      const yearlyRow = await fetchBucket({
        year,
        windowKind: "yearly",
        windowStart: yearlyWindowStart(year),
        ...(input.asOf != null ? { asOf: input.asOf } : {}),
      });
      if (!yearlyRow) return mapped;

      return fillMissingKeyFigures(
        mapped,
        mapSituationAnalysis(yearlyRow, input.countryName),
      );
    }),
});
