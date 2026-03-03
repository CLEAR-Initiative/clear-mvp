import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import type { DjangoPipelineSource, DjangoLocationsResponse } from "~/lib/types/django";

export const pipelineRouter = createTRPCRouter({
  getSources: publicProcedure.query(async () => {
    return { success: true, sources: [] as DjangoPipelineSource[] };
  }),

  getStatistics: publicProcedure.query(async () => {
    return {
      success: true,
      period: { start_date: "", end_date: "", days: 0 },
      overall: {
        total_sources: 0,
        total_variables: 0,
        total_data_records: 0,
        recent_data_count: 0,
      },
      by_source: {} as Record<string, { variables: number; data_records: number }>,
      by_type: {} as Record<string, { variables: number; data_records: number }>,
      tasks: {
        total_tasks: 0,
        total_success: 0,
        total_failures: 0,
        avg_duration: 0,
      },
    };
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
    .query(async () => {
      return {
        page: 0,
        page_size: 0,
        total_count: 0,
        locations: [] as DjangoLocationsResponse["locations"],
      };
    }),
});
