import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  createTRPCRouter,
  protectedProcedure,
} from "~/server/api/trpc";

export const auditRouter = createTRPCRouter({
  list: protectedProcedure
    .input(
      z.object({
        status: z.enum(["DRAFT", "SUBMITTED", "SYNCED", "ARCHIVED"]).optional(),
        type: z.enum([
          "SECURITY_RESPONSE", "RESOURCE_ALLOCATION", "BENEFICIARY_SELECTION",
          "PROGRAM_MODIFICATION", "PARTNER_MANAGEMENT", "OTHER",
        ]).optional(),
        riskLevel: z.enum(["LOW", "MEDIUM", "HIGH"]).optional(),
        search: z.string().optional(),
        limit: z.number().min(1).max(100).default(50),
        cursor: z.string().optional(),
      }).default({}),
    )
    .query(async ({ ctx, input }) => {
      const where = {
        ...(input.status && { status: input.status }),
        ...(input.type && { type: input.type }),
        ...(input.riskLevel && { riskLevel: input.riskLevel }),
        ...(input.search && {
          OR: [
            { title: { contains: input.search, mode: "insensitive" as const } },
            { decisionMade: { contains: input.search, mode: "insensitive" as const } },
          ],
        }),
      };

      const items = await ctx.db.auditDecision.findMany({
        where,
        take: input.limit + 1,
        ...(input.cursor && { cursor: { id: input.cursor }, skip: 1 }),
        orderBy: { createdAt: "desc" },
        include: {
          createdBy: { select: { name: true } },
          _count: { select: { evidence: true } },
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
      const audit = await ctx.db.auditDecision.findUnique({
        where: { id: input.id },
        include: {
          createdBy: { select: { name: true, email: true, image: true, role: true } },
          evidence: { orderBy: { createdAt: "desc" } },
        },
      });

      if (!audit) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Audit decision not found" });
      }

      return audit;
    }),

  create: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1).max(200),
        type: z.enum([
          "SECURITY_RESPONSE", "RESOURCE_ALLOCATION", "BENEFICIARY_SELECTION",
          "PROGRAM_MODIFICATION", "PARTNER_MANAGEMENT", "OTHER",
        ]),
        decisionMade: z.string().min(1),
        rationale: z.string().min(1),
        riskLevel: z.enum(["LOW", "MEDIUM", "HIGH"]),
        informationSources: z.array(z.string()).default([]),
        stakeholders: z.array(z.string()).default([]),
        alternatives: z.string().optional(),
        locationAddress: z.string().optional(),
        locationLat: z.number().optional(),
        locationLng: z.number().optional(),
        tags: z.array(z.string()).default([]),
        priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]).default("NORMAL"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.auditDecision.create({
        data: {
          ...input,
          createdById: ctx.session.user.id,
          status: "SUBMITTED",
        },
      });
    }),

  updateStatus: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        status: z.enum(["DRAFT", "SUBMITTED", "SYNCED", "ARCHIVED"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.auditDecision.update({
        where: { id: input.id },
        data: { status: input.status },
      });
    }),

  addEvidence: protectedProcedure
    .input(
      z.object({
        auditDecisionId: z.string(),
        type: z.enum(["DOCUMENT", "IMAGE", "AUDIO", "VIDEO", "OTHER"]),
        filename: z.string().min(1),
        size: z.number().int().min(0),
        hash: z.string().optional(),
        metadata: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Verify audit decision exists
      const audit = await ctx.db.auditDecision.findUnique({
        where: { id: input.auditDecisionId },
      });
      if (!audit) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Audit decision not found" });
      }

      /* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any */
      return ctx.db.evidence.create({
        data: input as any,
      });
      /* eslint-enable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any */
    }),

  stats: protectedProcedure.query(async ({ ctx }) => {
    const [total, byStatus, byRiskLevel, byType] = await Promise.all([
      ctx.db.auditDecision.count(),
      ctx.db.auditDecision.groupBy({ by: ["status"], _count: true }),
      ctx.db.auditDecision.groupBy({ by: ["riskLevel"], _count: true }),
      ctx.db.auditDecision.groupBy({ by: ["type"], _count: true }),
    ]);

    return {
      total,
      byStatus: byStatus.map((g) => ({ status: g.status, count: g._count })),
      byRiskLevel: byRiskLevel.map((g) => ({ riskLevel: g.riskLevel, count: g._count })),
      byType: byType.map((g) => ({ type: g.type, count: g._count })),
    };
  }),
});
