import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { djangoFetch } from "~/server/api/django";
import type {
  DjangoPipelineSourcesResponse,
  DjangoPipelineStatisticsResponse,
} from "~/lib/types/django";
import {
  FALLBACK_PIPELINE_SOURCES,
  FALLBACK_PIPELINE_STATISTICS,
} from "~/lib/fallback-data";

export const pipelineRouter = createTRPCRouter({
  getSources: publicProcedure.query(async () => {
    try {
      return await djangoFetch<DjangoPipelineSourcesResponse>(
        "/pipeline/api/sources/",
      );
    } catch {
      return FALLBACK_PIPELINE_SOURCES;
    }
  }),

  getStatistics: publicProcedure.query(async () => {
    try {
      return await djangoFetch<DjangoPipelineStatisticsResponse>(
        "/pipeline/api/statistics/",
      );
    } catch {
      return FALLBACK_PIPELINE_STATISTICS;
    }
  }),
});
