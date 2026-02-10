import { z } from "zod";
import {
  createTRPCRouter,
  protectedProcedure,
} from "~/server/api/trpc";

export const alertRouter = createTRPCRouter({
  list: protectedProcedure
    .input(
      z.object({
        crisisId: z.string().optional(),
        isActive: z.boolean().optional(),
        severity: z.enum(["LOW", "MODERATE", "HIGH", "CRITICAL"]).optional(),
        limit: z.number().min(1).max(100).default(50),
      }).default({})
    )
    .query(async ({ ctx, input }) => {
      return ctx.db.alert.findMany({
        where: {
          ...(input.crisisId && { crisisId: input.crisisId }),
          ...(input.isActive !== undefined && { isActive: input.isActive }),
          ...(input.severity && { severity: input.severity }),
        },
        take: input.limit,
        orderBy: { triggeredAt: "desc" },
        include: {
          crisis: { select: { id: true, title: true } },
        },
      });
    }),

  create: protectedProcedure
    .input(
      z.object({
        crisisId: z.string(),
        type: z.enum([
          "THRESHOLD_EXCEEDED", "NEW_CRISIS_DETECTED",
          "DATA_ANOMALY", "SYSTEM_HEALTH", "OTHER",
        ]),
        severity: z.enum(["LOW", "MODERATE", "HIGH", "CRITICAL"]),
        message: z.string().min(1).max(2000),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.alert.create({ data: input });
    }),

  resolve: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.alert.update({
        where: { id: input.id },
        data: { isActive: false, resolvedAt: new Date() },
      });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.alert.delete({ where: { id: input.id } });
    }),
});
