import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import type { DjangoSubscription, DjangoShockType } from "~/lib/types/django";

export const subscriptionsRouter = createTRPCRouter({
  list: publicProcedure.query(async () => {
    return { success: true, subscriptions: [] as DjangoSubscription[] };
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
    .mutation(async () => {
      throw new Error("Subscriptions not yet connected to new backend");
    }),

  update: publicProcedure
    .input(
      z.object({
        id: z.number(),
        method: z.enum(["email", "sms"]).optional(),
        frequency: z.enum(["immediate", "daily", "weekly", "monthly"]).optional(),
        location_ids: z.array(z.number()).optional(),
        shock_type_ids: z.array(z.number()).optional(),
        active: z.boolean().optional(),
      }),
    )
    .mutation(async () => {
      throw new Error("Subscriptions not yet connected to new backend");
    }),

  delete: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async () => {
      throw new Error("Subscriptions not yet connected to new backend");
    }),

  shockTypes: publicProcedure.query(async () => {
    return { success: true, shock_types: [] as DjangoShockType[] };
  }),

  locations: publicProcedure.query(async () => {
    return { success: true, locations: [] as { id: number; name: string; geo_id: string }[] };
  }),
});
