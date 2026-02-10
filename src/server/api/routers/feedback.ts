import { z } from "zod";
import {
  createTRPCRouter,
  protectedProcedure,
} from "~/server/api/trpc";

export const feedbackRouter = createTRPCRouter({
  submit: protectedProcedure
    .input(
      z.object({
        type: z.enum(["BUG_REPORT", "FEATURE_REQUEST", "GENERAL", "PAGE_COMMENT", "FLOW_RATING"]),
        pageUrl: z.string().min(1),
        feedbackText: z.string().max(5000).optional(),
        rating: z.number().int().min(1).max(5).optional(),
        category: z.string().optional(),
        priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).default("MEDIUM"),
        screenshotUrl: z.string().optional(),
        userAgent: z.string().optional(),
        deviceType: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.feedback.create({
        data: {
          ...input,
          userId: ctx.session.user.id,
        },
      });
    }),

  list: protectedProcedure
    .input(
      z.object({
        type: z.enum(["BUG_REPORT", "FEATURE_REQUEST", "GENERAL", "PAGE_COMMENT", "FLOW_RATING"]).optional(),
        status: z.enum(["NEW", "REVIEWING", "IN_PROGRESS", "RESOLVED", "CLOSED"]).optional(),
        priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
        limit: z.number().min(1).max(100).default(50),
        cursor: z.string().optional(),
      }).default({}),
    )
    .query(async ({ ctx, input }) => {
      const where = {
        ...(input.type && { type: input.type }),
        ...(input.status && { status: input.status }),
        ...(input.priority && { priority: input.priority }),
      };

      const items = await ctx.db.feedback.findMany({
        where,
        take: input.limit + 1,
        ...(input.cursor && { cursor: { id: input.cursor }, skip: 1 }),
        orderBy: { createdAt: "desc" },
        include: {
          user: { select: { name: true, email: true } },
        },
      });

      let nextCursor: string | undefined;
      if (items.length > input.limit) {
        const nextItem = items.pop();
        nextCursor = nextItem?.id;
      }

      return { items, nextCursor };
    }),

  updateStatus: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        status: z.enum(["NEW", "REVIEWING", "IN_PROGRESS", "RESOLVED", "CLOSED"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.feedback.update({
        where: { id: input.id },
        data: { status: input.status },
      });
    }),

  analytics: protectedProcedure.query(async ({ ctx }) => {
    const [total, byType, byStatus, byPriority] = await Promise.all([
      ctx.db.feedback.count(),
      ctx.db.feedback.groupBy({ by: ["type"], _count: true }),
      ctx.db.feedback.groupBy({ by: ["status"], _count: true }),
      ctx.db.feedback.groupBy({ by: ["priority"], _count: true }),
    ]);

    return {
      total,
      byType: byType.map((g) => ({ type: g.type, count: g._count })),
      byStatus: byStatus.map((g) => ({ status: g.status, count: g._count })),
      byPriority: byPriority.map((g) => ({ priority: g.priority, count: g._count })),
    };
  }),
});
