import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import type { DjangoAlert, DjangoAlertStats, DjangoShockType } from "~/lib/types/django";

export const alertsRouter = createTRPCRouter({
  getAlerts: publicProcedure
    .input(
      z
        .object({
          page: z.number().optional(),
          pageSize: z.number().optional(),
          shockType: z.string().optional(),
          severity: z.number().optional(),
          location: z.string().optional(),
          activeOnly: z.boolean().optional(),
          search: z.string().optional(),
        })
        .optional(),
    )
    .query(async () => {
      return { alerts: [] as DjangoAlert[], count: 0, total: 0, page: 1, page_size: 20, total_pages: 0 };
    }),

  getAlert: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async () => {
      return { alert: null as DjangoAlert | null };
    }),

  getStats: publicProcedure.query(async () => {
    return {
      success: true,
      stats: {
        overview: { total_alerts: 0, active_alerts: 0, recent_30_days: 0, recent_7_days: 0 },
        by_shock_type: [] as { shock_type__name: string; count: number }[],
        by_severity: [] as { severity: number; count: number }[],
      } satisfies DjangoAlertStats,
    };
  }),

  getShockTypes: publicProcedure.query(async () => {
    return { success: true, shock_types: [] as DjangoShockType[] };
  }),

  createAlert: publicProcedure
    .input(
      z.object({
        title: z.string().min(1).max(255),
        text: z.string().min(1),
        shock_type_id: z.number(),
        data_source_id: z.number(),
        shock_date: z.string(),
        severity: z.number().min(1).max(5),
        valid_from: z.string().optional(),
        valid_until: z.string().optional(),
        location_ids: z.array(z.number()).optional(),
      }),
    )
    .mutation(async (): Promise<{ success: boolean; message: string; alert: null }> => {
      throw new Error("Alert creation not yet connected to new backend");
    }),
});
