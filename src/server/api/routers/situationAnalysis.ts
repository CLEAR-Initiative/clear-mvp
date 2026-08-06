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
  query SituationAnalysis($countryLocationId: String!, $year: Int, $asOf: DateTime) {
    situationAnalysis(countryLocationId: $countryLocationId, year: $year, asOf: $asOf) {
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
      const { situationAnalysis } = await graphqlFetch<{
        situationAnalysis: SaRow | null;
      }>(
        SITUATION_ANALYSIS_QUERY,
        {
          countryLocationId: input.countryLocationId,
          ...(input.year != null ? { year: input.year } : {}),
          ...(input.asOf != null ? { asOf: input.asOf } : {}),
        },
        cookieHeaders(ctx),
      );

      if (!situationAnalysis) return null;
      return mapSituationAnalysis(situationAnalysis, input.countryName);
    }),
});
