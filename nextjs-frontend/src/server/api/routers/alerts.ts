import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { djangoFetch, buildQueryString, extractCookieHeader } from "~/server/api/django";
import type {
  DjangoAlertsResponse,
  DjangoAlertDetailResponse,
  DjangoAlertStatsResponse,
  DjangoShockTypesResponse,
  DjangoCreateAlertResponse,
} from "~/lib/types/django";

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
    .query(async ({ ctx, input }) => {
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
        { timeoutMs: 30_000, headers: extractCookieHeader(ctx.headers) },
      );
    }),

  getAlert: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      return await djangoFetch<DjangoAlertDetailResponse>(
        `/alerts/api/public/alert/${input.id}/`,
        { headers: extractCookieHeader(ctx.headers) },
      );
    }),

  getStats: publicProcedure.query(async ({ ctx }) => {
    return await djangoFetch<DjangoAlertStatsResponse>(
      "/alerts/api/public/stats/",
      { headers: extractCookieHeader(ctx.headers) },
    );
  }),

  getShockTypes: publicProcedure.query(async ({ ctx }) => {
    return await djangoFetch<DjangoShockTypesResponse>(
      "/alerts/api/public/shock-types/",
      { headers: extractCookieHeader(ctx.headers) },
    );
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
    .mutation(async ({ ctx, input }) => {
      return await djangoFetch<DjangoCreateAlertResponse>(
        "/alerts/webhook/alert/create/",
        {
          method: "POST",
          body: JSON.stringify(input),
          headers: extractCookieHeader(ctx.headers),
          timeoutMs: 15_000,
        },
      );
    }),
});
