import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import {
  djangoFetch,
  buildQueryString,
  extractCookieHeader,
} from "~/server/api/django";
import type {
  DjangoPipelineSourcesResponse,
  DjangoPipelineStatisticsResponse,
  DjangoLocationsResponse,
} from "~/lib/types/django";

/** API returns { success, data, pagination }; we map to { locations, page, page_size, total_count } */
interface LocationsApiResponse {
  success: boolean;
  data: DjangoLocationsResponse["locations"];
  pagination?: { page: number; page_size: number; total_count: number };
}

export const pipelineRouter = createTRPCRouter({
  getSources: publicProcedure.query(async ({ ctx }) => {
    const headers = extractCookieHeader(ctx.headers);
    return await djangoFetch<DjangoPipelineSourcesResponse>(
      "/pipeline/api/sources/",
      { headers },
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
      const headers = extractCookieHeader(ctx.headers);
      const qs = buildQueryString({
        admin_level: input?.adminLevel,
        page_size: input?.pageSize ?? 100,
      });
      const res = await djangoFetch<LocationsApiResponse>(
        `/location/api/locations/${qs}`,
        { headers },
      );
      return {
        page: res.pagination?.page ?? 0,
        page_size: res.pagination?.page_size ?? 0,
        total_count: res.pagination?.total_count ?? 0,
        locations: res.data ?? [],
      } satisfies DjangoLocationsResponse;
    }),
});
