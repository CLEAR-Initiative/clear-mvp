import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { djangoFetch, extractCookieHeader } from "~/server/api/django";
import type {
  DjangoPipelineSourcesResponse,
  DjangoPipelineStatisticsResponse,
} from "~/lib/types/django";

export const pipelineRouter = createTRPCRouter({
  getSources: publicProcedure.query(async ({ ctx }) => {
    return await djangoFetch<DjangoPipelineSourcesResponse>(
      "/pipeline/api/sources/",
      { headers: extractCookieHeader(ctx.headers) },
    );
  }),

  getStatistics: publicProcedure.query(async ({ ctx }) => {
    return await djangoFetch<DjangoPipelineStatisticsResponse>(
      "/pipeline/api/statistics/",
      { headers: extractCookieHeader(ctx.headers) },
    );
  }),
});
