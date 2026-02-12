import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { djangoFetch, buildQueryString } from "~/server/api/django";
import type {
  DjangoAlertsResponse,
  DjangoAlertDetailResponse,
  DjangoAlertStatsResponse,
  DjangoShockTypesResponse,
} from "~/lib/types/django";
import {
  FALLBACK_ALERTS,
  FALLBACK_ALERT_STATS,
  FALLBACK_SHOCK_TYPES,
} from "~/lib/fallback-data";

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
    .query(async ({ input }) => {
      try {
        const qs = buildQueryString({
          page: input?.page,
          page_size: input?.pageSize,
          shock_type: input?.shockType,
          severity: input?.severity,
          location: input?.location,
          active_only: input?.activeOnly === true ? "true" : input?.activeOnly === false ? "false" : undefined,
          search: input?.search,
        });
        return await djangoFetch<DjangoAlertsResponse>(
          `/alerts/api/public/alerts/${qs}`,
          { timeoutMs: 30_000 },
        );
      } catch {
        return FALLBACK_ALERTS;
      }
    }),

  getAlert: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      try {
        return await djangoFetch<DjangoAlertDetailResponse>(
          `/alerts/api/public/alert/${input.id}/`,
        );
      } catch {
        const fallback = FALLBACK_ALERTS.alerts.find((a) => a.id === input.id);
        return {
          success: !!fallback,
          alert: fallback ?? FALLBACK_ALERTS.alerts[0]!,
        } satisfies DjangoAlertDetailResponse;
      }
    }),

  getStats: publicProcedure.query(async () => {
    try {
      return await djangoFetch<DjangoAlertStatsResponse>(
        "/alerts/api/public/stats/",
      );
    } catch {
      return FALLBACK_ALERT_STATS;
    }
  }),

  getShockTypes: publicProcedure.query(async () => {
    try {
      return await djangoFetch<DjangoShockTypesResponse>(
        "/alerts/api/public/shock-types/",
      );
    } catch {
      return FALLBACK_SHOCK_TYPES;
    }
  }),
});
