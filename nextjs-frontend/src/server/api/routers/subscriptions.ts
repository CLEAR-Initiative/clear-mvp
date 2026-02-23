import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { djangoFetch, extractCookieHeader } from "~/server/api/django";
import type {
  DjangoSubscriptionsResponse,
  DjangoSubscriptionResponse,
  DjangoShockTypesResponse,
  DjangoProfileUpdateResponse,
} from "~/lib/types/django";

interface DjangoLocationsResponse {
  success: boolean;
  locations: { id: number; name: string; geo_id: string }[];
}

export const subscriptionsRouter = createTRPCRouter({
  list: publicProcedure.query(async ({ ctx }) => {
    return await djangoFetch<DjangoSubscriptionsResponse>(
      "/alerts/api/subscriptions/",
      { headers: extractCookieHeader(ctx.headers) },
    );
  }),

  create: publicProcedure
    .input(
      z.object({
        method: z.enum(["email", "sms"]),
        frequency: z.enum(["immediate", "daily", "weekly", "monthly"]),
        location_ids: z.array(z.number()).min(1),
        shock_type_ids: z.array(z.number()).min(1),
        active: z.boolean().optional().default(true),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return await djangoFetch<DjangoSubscriptionResponse>(
        "/alerts/api/subscriptions/",
        {
          method: "POST",
          headers: extractCookieHeader(ctx.headers),
          body: JSON.stringify(input),
        },
      );
    }),

  update: publicProcedure
    .input(
      z.object({
        id: z.number(),
        method: z.enum(["email", "sms"]).optional(),
        frequency: z
          .enum(["immediate", "daily", "weekly", "monthly"])
          .optional(),
        location_ids: z.array(z.number()).optional(),
        shock_type_ids: z.array(z.number()).optional(),
        active: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...body } = input;
      return await djangoFetch<DjangoSubscriptionResponse>(
        `/alerts/api/subscriptions/${id}/`,
        {
          method: "PUT",
          headers: extractCookieHeader(ctx.headers),
          body: JSON.stringify(body),
        },
      );
    }),

  delete: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      return await djangoFetch<{ success: boolean; message: string }>(
        `/alerts/api/subscriptions/${input.id}/`,
        {
          method: "DELETE",
          headers: extractCookieHeader(ctx.headers),
        },
      );
    }),

  shockTypes: publicProcedure.query(async ({ ctx }) => {
    return await djangoFetch<DjangoShockTypesResponse>(
      "/alerts/api/shock-types/",
      { headers: extractCookieHeader(ctx.headers) },
    );
  }),

  locations: publicProcedure.query(async ({ ctx }) => {
    return await djangoFetch<DjangoLocationsResponse>(
      "/location/api/locations/simple/",
      { headers: extractCookieHeader(ctx.headers) },
    );
  }),

  updateProfile: publicProcedure
    .input(
      z.object({
        mobile_number: z.string().optional(),
        sms_notifications_enabled: z.boolean().optional(),
        email_notifications_enabled: z.boolean().optional(),
        preferred_language: z.string().optional(),
        timezone: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return await djangoFetch<DjangoProfileUpdateResponse>(
        "/users/api/profile/update/",
        {
          method: "PATCH",
          headers: extractCookieHeader(ctx.headers),
          body: JSON.stringify(input),
        },
      );
    }),
});
