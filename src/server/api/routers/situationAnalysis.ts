import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import {
  LEBANON_SITUATION_ANALYSIS,
  type SituationAnalysis,
} from "~/server/api/fixtures/situation-analysis";

/**
 * Situation Analysis (SAF Framework).
 *
 * Currently serves typed fixtures — the backend has no situation-analysis
 * model yet. The return shape is the seam: when a GraphQL endpoint lands,
 * replace the resolver body with a `graphqlFetch` call returning the same
 * `SituationAnalysis` shape and the UI needs no changes.
 */
export const situationAnalysisRouter = createTRPCRouter({
  get: protectedProcedure
    .input(z.object({ country: z.string().optional() }).optional())
    .query(async (): Promise<SituationAnalysis> => {
      // Only Lebanon is available in the fixture; ignore the country filter for now.
      return LEBANON_SITUATION_ANALYSIS;
    }),
});
