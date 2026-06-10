import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { graphqlFetch, cookieHeaders } from "~/server/api/graphql";
import {
  LEBANON_SITUATION_ANALYSIS,
  type SituationAnalysis,
} from "~/server/api/fixtures/situation-analysis";
import {
  mapSituationAnalysis,
  type SaPayload,
} from "~/server/api/mappers/situation-analysis";

/**
 * Situation Analysis (SAF Framework).
 *
 * Serves the `clear_situation_analysis` LocationMetadata rows produced by the
 * CLEAR-AutomatedAnalysis pipeline, mapped into the UI's `SituationAnalysis`
 * shape (see `mappers/situation-analysis`). When the backend has no metadata
 * yet, it falls back to the typed Lebanon fixture so the page still renders in
 * dev.
 */

/** The pipeline writes SAF bundles under this metadata `type`. */
const SITUATION_ANALYSIS_TYPE = "clear_situation_analysis";

/** Lebanon is served from the curated fixture, not the pipeline. */
const LEBANON_COUNTRY = LEBANON_SITUATION_ANALYSIS.crisis.country;
const isLebanon = (name: string) =>
  name.toLowerCase() === LEBANON_COUNTRY.toLowerCase();

interface GqlLocationMetadata {
  id: string;
  updatedAt: string;
  location: { id: string; name: string };
  data: SaPayload;
}

const ALL_SITUATION_ANALYSIS_QUERY = `
  query AllSituationAnalysis($type: String!) {
    allLocationMetadata(type: $type) {
      id
      updatedAt
      location { id name }
      data
    }
  }
`;

export const situationAnalysisRouter = createTRPCRouter({
  /**
   * Fetch the situation analysis for a country. With no `country`, returns the
   * first available location's analysis. Falls back to the Lebanon fixture when
   * no metadata exists.
   */
  get: protectedProcedure
    .input(z.object({ country: z.string().optional() }).optional())
    .query(async ({ ctx, input }): Promise<SituationAnalysis> => {
      // Lebanon stays on the curated fixture — selecting it never hits the
      // pipeline data.
      if (input?.country && isLebanon(input.country)) {
        return LEBANON_SITUATION_ANALYSIS;
      }

      const { allLocationMetadata } = await graphqlFetch<{
        allLocationMetadata: GqlLocationMetadata[];
      }>(
        ALL_SITUATION_ANALYSIS_QUERY,
        { type: SITUATION_ANALYSIS_TYPE },
        cookieHeaders(ctx),
      );

      if (!allLocationMetadata.length) {
        return LEBANON_SITUATION_ANALYSIS;
      }

      const wanted = input?.country?.toLowerCase();
      const row =
        (wanted
          ? allLocationMetadata.find(
              (m) => m.location.name.toLowerCase() === wanted,
            )
          : undefined) ?? allLocationMetadata[0]!;

      return mapSituationAnalysis(row.data, row.location.name);
    }),

  /**
   * List the countries that have a situation analysis available — the live
   * pipeline locations plus the curated Lebanon fixture.
   */
  countries: protectedProcedure.query(async ({ ctx }) => {
    const { allLocationMetadata } = await graphqlFetch<{
      allLocationMetadata: GqlLocationMetadata[];
    }>(
      ALL_SITUATION_ANALYSIS_QUERY,
      { type: SITUATION_ANALYSIS_TYPE },
      cookieHeaders(ctx),
    );
    const live = allLocationMetadata.map((m) => ({
      id: m.location.id,
      name: m.location.name,
    }));
    // Always offer Lebanon (fixture) unless a live row already provides it.
    return live.some((c) => isLebanon(c.name))
      ? live
      : [...live, { id: "lebanon-fixture", name: LEBANON_COUNTRY }];
  }),
});
