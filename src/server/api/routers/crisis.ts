import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  createTRPCRouter,
  protectedProcedure,
} from "~/server/api/trpc";

export const crisisRouter = createTRPCRouter({
  list: protectedProcedure
    .input(
      z.object({
        status: z.enum(["ACTIVE", "MONITORING", "RESOLVED", "ARCHIVED"]).optional(),
        type: z.enum([
          "NATURAL_DISASTER", "CONFLICT", "EPIDEMIC", "FAMINE",
          "REFUGEE_CRISIS", "ECONOMIC_CRISIS", "OTHER",
        ]).optional(),
        severity: z.enum(["LOW", "MODERATE", "HIGH", "CRITICAL"]).optional(),
        search: z.string().optional(),
        limit: z.number().min(1).max(100).default(50),
        cursor: z.string().optional(),
      }).default({})
    )
    .query(async ({ ctx, input }) => {
      const where = {
        ...(input.status && { status: input.status }),
        ...(input.type && { type: input.type }),
        ...(input.severity && { severity: input.severity }),
        ...(input.search && {
          OR: [
            { title: { contains: input.search, mode: "insensitive" as const } },
            { location: { contains: input.search, mode: "insensitive" as const } },
          ],
        }),
      };

      const items = await ctx.db.crisis.findMany({
        where,
        take: input.limit + 1,
        ...(input.cursor && { cursor: { id: input.cursor }, skip: 1 }),
        orderBy: { createdAt: "desc" },
        include: {
          _count: { select: { decisions: true, alerts: true } },
          createdBy: { select: { name: true } },
        },
      });

      let nextCursor: string | undefined;
      if (items.length > input.limit) {
        const nextItem = items.pop();
        nextCursor = nextItem?.id;
      }

      return { items, nextCursor };
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const crisis = await ctx.db.crisis.findUnique({
        where: { id: input.id },
        include: {
          decisions: {
            orderBy: { createdAt: "desc" },
            include: { madeBy: { select: { name: true, image: true } } },
          },
          alerts: { orderBy: { triggeredAt: "desc" } },
          createdBy: { select: { name: true, image: true } },
          _count: { select: { decisions: true, alerts: true } },
        },
      });

      if (!crisis) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Crisis not found" });
      }

      return crisis;
    }),

  create: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1).max(200),
        type: z.enum([
          "NATURAL_DISASTER", "CONFLICT", "EPIDEMIC", "FAMINE",
          "REFUGEE_CRISIS", "ECONOMIC_CRISIS", "OTHER",
        ]),
        severity: z.enum(["LOW", "MODERATE", "HIGH", "CRITICAL"]),
        location: z.string().min(1).max(200),
        latitude: z.number().min(-90).max(90).optional(),
        longitude: z.number().min(-180).max(180).optional(),
        description: z.string().max(5000).optional(),
        affectedPopulation: z.number().int().min(0).default(0),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.crisis.create({
        data: {
          ...input,
          createdById: ctx.session.user.id,
        },
      });
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        title: z.string().min(1).max(200).optional(),
        type: z.enum([
          "NATURAL_DISASTER", "CONFLICT", "EPIDEMIC", "FAMINE",
          "REFUGEE_CRISIS", "ECONOMIC_CRISIS", "OTHER",
        ]).optional(),
        severity: z.enum(["LOW", "MODERATE", "HIGH", "CRITICAL"]).optional(),
        location: z.string().min(1).max(200).optional(),
        latitude: z.number().min(-90).max(90).nullable().optional(),
        longitude: z.number().min(-180).max(180).nullable().optional(),
        description: z.string().max(5000).nullable().optional(),
        affectedPopulation: z.number().int().min(0).optional(),
        status: z.enum(["ACTIVE", "MONITORING", "RESOLVED", "ARCHIVED"]).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      return ctx.db.crisis.update({ where: { id }, data });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.crisis.delete({ where: { id: input.id } });
    }),
});
