import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  createTRPCRouter,
  protectedProcedure,
} from "~/server/api/trpc";
import {
  calculateVulnerabilityScore,
  generateTargetingRecommendations,
} from "~/server/services/vulnerability-scorer";

export const assessmentRouter = createTRPCRouter({
  // ── List quick profiles ─────────────────────────────────────────────
  list: protectedProcedure
    .input(
      z.object({
        riskCategory: z.enum(["CRITICAL", "HIGH", "MEDIUM_RISK", "LOW_RISK"]).optional(),
        search: z.string().optional(),
        limit: z.number().min(1).max(100).default(50),
        cursor: z.string().optional(),
      }).default({}),
    )
    .query(async ({ ctx, input }) => {
      const where = {
        ...(input.riskCategory && { riskCategory: input.riskCategory }),
        ...(input.search && {
          siteId: { contains: input.search, mode: "insensitive" as const },
        }),
      };

      const items = await ctx.db.quickProfile.findMany({
        where,
        take: input.limit + 1,
        ...(input.cursor && { cursor: { id: input.cursor }, skip: 1 }),
        orderBy: { assessedAt: "desc" },
        include: {
          assessedBy: { select: { id: true, name: true } },
          vulnerabilityDetail: true,
        },
      });

      let nextCursor: string | undefined;
      if (items.length > input.limit) {
        const next = items.pop();
        nextCursor = next?.id;
      }

      return { items, nextCursor };
    }),

  // ── Get profile by ID ───────────────────────────────────────────────
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const profile = await ctx.db.quickProfile.findUnique({
        where: { id: input.id },
        include: {
          assessedBy: { select: { id: true, name: true, email: true } },
          vulnerabilityDetail: true,
        },
      });

      if (!profile) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Assessment not found" });
      }

      return profile;
    }),

  // ── Create rapid assessment ─────────────────────────────────────────
  create: protectedProcedure
    .input(
      z.object({
        siteId: z.string().optional(),
        householdSize: z.number().min(1).max(50),
        femaleHeaded: z.boolean().default(false),
        hasVulnerable: z.boolean().default(false),
        pwdCount: z.number().min(0).default(0),
        elderlyCount: z.number().min(0).default(0),
        childHeaded: z.boolean().default(false),
        primaryNeed: z.enum(["FOOD", "SHELTER", "WASH", "HEALTH", "PROTECTION"]),
        serviceDistance: z.number().min(0).optional(),
        gbvRisk: z.boolean().default(false),
        latitude: z.number().optional(),
        longitude: z.number().optional(),
        assessmentDuration: z.number().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Calculate vulnerability score
      const result = calculateVulnerabilityScore({
        householdSize: input.householdSize,
        femaleHeaded: input.femaleHeaded,
        hasVulnerable: input.hasVulnerable,
        primaryNeed: input.primaryNeed,
        pwdCount: input.pwdCount,
        elderlyCount: input.elderlyCount,
        childHeaded: input.childHeaded,
        gbvRisk: input.gbvRisk,
        serviceDistance: input.serviceDistance,
      });

      // Create profile + score in a transaction
      const profile = await ctx.db.quickProfile.create({
        data: {
          siteId: input.siteId,
          householdSize: input.householdSize,
          femaleHeaded: input.femaleHeaded,
          hasVulnerable: input.hasVulnerable,
          pwdCount: input.pwdCount,
          elderlyCount: input.elderlyCount,
          childHeaded: input.childHeaded,
          primaryNeed: input.primaryNeed,
          serviceDistance: input.serviceDistance,
          gbvRisk: input.gbvRisk,
          latitude: input.latitude,
          longitude: input.longitude,
          vulnerabilityScore: result.total,
          riskCategory: result.category,
          priorityRank: result.rank,
          assessmentDuration: input.assessmentDuration,
          assessedById: ctx.session.user.id,
          vulnerabilityDetail: {
            create: {
              totalScore: result.total,
              riskCategory: result.category,
              priorityRank: result.rank,
              femaleHeadedScore: result.breakdown.femaleHeaded,
              vulnerableMembersScore: result.breakdown.vulnerableMembers,
              householdSizeScore: result.breakdown.householdSize,
              primaryNeedScore: result.breakdown.primaryNeed,
              serviceDistanceScore: result.breakdown.distanceFromServices,
              gbvRiskScore: result.breakdown.gbvRisk,
              eligiblePrograms: result.eligiblePrograms,
            },
          },
        },
        include: {
          vulnerabilityDetail: true,
        },
      });

      return profile;
    }),

  // ── Calculate score without saving (preview) ────────────────────────
  preview: protectedProcedure
    .input(
      z.object({
        householdSize: z.number().min(1).max(50),
        femaleHeaded: z.boolean().default(false),
        hasVulnerable: z.boolean().default(false),
        pwdCount: z.number().min(0).default(0),
        elderlyCount: z.number().min(0).default(0),
        childHeaded: z.boolean().default(false),
        primaryNeed: z.enum(["FOOD", "SHELTER", "WASH", "HEALTH", "PROTECTION"]),
        serviceDistance: z.number().min(0).optional(),
        gbvRisk: z.boolean().default(false),
      }),
    )
    .query(({ input }) => {
      return calculateVulnerabilityScore(input);
    }),

  // ── Stats and targeting recommendations ─────────────────────────────
  stats: protectedProcedure.query(async ({ ctx }) => {
    const profiles = await ctx.db.quickProfile.findMany({
      select: {
        vulnerabilityScore: true,
        riskCategory: true,
      },
    });

    const results = profiles.map((p) => ({
      total: p.vulnerabilityScore,
      category: p.riskCategory,
      rank: 0,
      eligiblePrograms: [],
      breakdown: {
        femaleHeaded: 0,
        vulnerableMembers: 0,
        householdSize: 0,
        primaryNeed: 0,
        distanceFromServices: 0,
        gbvRisk: 0,
      },
    }));

    const recommendations = generateTargetingRecommendations(results);

    const byNeed = await ctx.db.quickProfile.groupBy({
      by: ["primaryNeed"],
      _count: true,
    });

    return { recommendations, byNeed };
  }),
});
