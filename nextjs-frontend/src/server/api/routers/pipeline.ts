import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { djangoFetch, buildQueryString, extractCookieHeader } from "~/server/api/django";
import type {
  DjangoPipelineSourcesResponse,
  DjangoPipelineStatisticsResponse,
  DjangoLocationsResponse,
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

  getLocations: publicProcedure
    .input(
      z
        .object({
          adminLevel: z.string().optional(),
          pageSize: z.number().optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const qs = buildQueryString({
        admin_level: input?.adminLevel,
        page_size: input?.pageSize ?? 100,
      });
      return await djangoFetch<DjangoLocationsResponse>(
        `/location/api/locations/${qs}`,
        { headers: extractCookieHeader(ctx.headers) },
      );
    }),
});
