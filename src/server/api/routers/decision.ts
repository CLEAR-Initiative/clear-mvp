import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  createTRPCRouter,
  protectedProcedure,
} from "~/server/api/trpc";

export const decisionRouter = createTRPCRouter({
  list: protectedProcedure
    .input(
      z.object({
        crisisId: z.string().optional(),
        limit: z.number().min(1).max(100).default(50),
        cursor: z.string().optional(),
      }).default({})
    )
    .query(async ({ ctx, input }) => {
      const items = await ctx.db.decision.findMany({
        where: input.crisisId ? { crisisId: input.crisisId } : undefined,
        take: input.limit + 1,
        ...(input.cursor && { cursor: { id: input.cursor }, skip: 1 }),
        orderBy: { createdAt: "desc" },
        include: {
          crisis: { select: { id: true, title: true, severity: true } },
          madeBy: { select: { name: true, image: true } },
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
      const decision = await ctx.db.decision.findUnique({
        where: { id: input.id },
        include: {
          crisis: { select: { id: true, title: true, severity: true, location: true } },
          madeBy: { select: { name: true, image: true } },
        },
      });

      if (!decision) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Decision not found" });
      }

      return decision;
    }),

  create: protectedProcedure
    .input(
      z.object({
        crisisId: z.string(),
        title: z.string().min(1).max(200),
        decisionText: z.string().min(1).max(5000),
        rationale: z.string().max(5000).optional(),
        confidenceScore: z.number().int().min(0).max(100).default(50),
        optionA: z.string().max(500).optional(),
        optionB: z.string().max(500).optional(),
        optionC: z.string().max(500).optional(),
        selectedOption: z.enum(["OPTION_A", "OPTION_B", "OPTION_C", "OTHER"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verify crisis exists
      const crisis = await ctx.db.crisis.findUnique({ where: { id: input.crisisId } });
      if (!crisis) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Crisis not found" });
      }

      return ctx.db.decision.create({
        data: {
          ...input,
          madeById: ctx.session.user.id,
        },
      });
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        title: z.string().min(1).max(200).optional(),
        decisionText: z.string().min(1).max(5000).optional(),
        rationale: z.string().max(5000).nullable().optional(),
        confidenceScore: z.number().int().min(0).max(100).optional(),
        outcome: z.string().max(5000).nullable().optional(),
        selectedOption: z.enum(["OPTION_A", "OPTION_B", "OPTION_C", "OTHER"]).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      return ctx.db.decision.update({ where: { id }, data });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.decision.delete({ where: { id: input.id } });
    }),
});
