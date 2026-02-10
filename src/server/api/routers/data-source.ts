import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  createTRPCRouter,
  protectedProcedure,
} from "~/server/api/trpc";
import {
  checkDataAvailability,
  performGapAnalysis,
  PARTNER_SOURCES,
  SECTOR_INDICATORS,
} from "~/server/services/data-intelligence";

export const dataSourceRouter = createTRPCRouter({
  // ── List data sources ───────────────────────────────────────────────
  list: protectedProcedure
    .input(
      z.object({
        sector: z.string().optional(),
        sourceType: z.enum([
          "API", "DATABASE", "SURVEY", "MANUAL",
          "SATELLITE", "IOT", "SOCIAL_MEDIA", "OTHER_SOURCE",
        ]).optional(),
        isActive: z.boolean().optional(),
        limit: z.number().min(1).max(100).default(50),
        cursor: z.string().optional(),
      }).default({}),
    )
    .query(async ({ ctx, input }) => {
      const where = {
        ...(input.sector && { sector: input.sector }),
        ...(input.sourceType && { sourceType: input.sourceType }),
        ...(input.isActive !== undefined && { isActive: input.isActive }),
      };

      const items = await ctx.db.dataSource.findMany({
        where,
        take: input.limit + 1,
        ...(input.cursor && { cursor: { id: input.cursor }, skip: 1 }),
        orderBy: { createdAt: "desc" },
        include: {
          _count: { select: { availabilityLogs: true, qualityMetrics: true } },
        },
      });

      let nextCursor: string | undefined;
      if (items.length > input.limit) {
        const next = items.pop();
        nextCursor = next?.id;
      }

      return { items, nextCursor };
    }),

  // ── Get single data source ──────────────────────────────────────────
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const source = await ctx.db.dataSource.findUnique({
        where: { id: input.id },
        include: {
          availabilityLogs: {
            orderBy: { checkedAt: "desc" },
            take: 20,
          },
          qualityMetrics: {
            orderBy: { measuredAt: "desc" },
            take: 20,
          },
        },
      });

      if (!source) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Data source not found" });
      }

      return source;
    }),

  // ── Create data source ──────────────────────────────────────────────
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(200),
        sourceType: z.enum([
          "API", "DATABASE", "SURVEY", "MANUAL",
          "SATELLITE", "IOT", "SOCIAL_MEDIA", "OTHER_SOURCE",
        ]),
        sector: z.string().min(1),
        apiEndpoint: z.string().url().optional(),
        updateFrequency: z.enum(["daily", "weekly", "monthly", "quarterly"]).default("monthly"),
        coverageAreas: z.array(z.string()).default([]),
        populations: z.array(z.string()).default([]),
        indicators: z.array(z.string()).default([]),
        qualityLevel: z.enum(["high", "medium", "low"]).default("medium"),
        accessLevel: z.enum(["public", "partner", "restricted"]).default("public"),
        reliabilityScore: z.number().min(0).max(1).default(0.5),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.dataSource.create({
        data: {
          name: input.name,
          sourceType: input.sourceType,
          sector: input.sector,
          apiEndpoint: input.apiEndpoint,
          updateFrequency: input.updateFrequency,
          coverageAreas: input.coverageAreas,
          populations: input.populations,
          indicators: input.indicators,
          qualityLevel: input.qualityLevel,
          accessLevel: input.accessLevel,
          reliabilityScore: input.reliabilityScore,
        },
      });
    }),

  // ── Update data source ──────────────────────────────────────────────
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).max(200).optional(),
        sourceType: z.enum([
          "API", "DATABASE", "SURVEY", "MANUAL",
          "SATELLITE", "IOT", "SOCIAL_MEDIA", "OTHER_SOURCE",
        ]).optional(),
        sector: z.string().optional(),
        apiEndpoint: z.string().url().nullable().optional(),
        updateFrequency: z.enum(["daily", "weekly", "monthly", "quarterly"]).optional(),
        coverageAreas: z.array(z.string()).optional(),
        populations: z.array(z.string()).optional(),
        indicators: z.array(z.string()).optional(),
        qualityLevel: z.enum(["high", "medium", "low"]).optional(),
        accessLevel: z.enum(["public", "partner", "restricted"]).optional(),
        isActive: z.boolean().optional(),
        reliabilityScore: z.number().min(0).max(1).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      return ctx.db.dataSource.update({ where: { id }, data });
    }),

  // ── Delete data source ──────────────────────────────────────────────
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.dataSource.delete({ where: { id: input.id } });
      return { success: true };
    }),

  // ── Log availability check ──────────────────────────────────────────
  logAvailability: protectedProcedure
    .input(
      z.object({
        sourceId: z.string(),
        isAvailable: z.boolean(),
        responseTime: z.number().int().optional(),
        errorMessage: z.string().optional(),
        recordCount: z.number().int().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [log] = await Promise.all([
        ctx.db.dataSourceAvailability.create({ data: input }),
        ctx.db.dataSource.update({
          where: { id: input.sourceId },
          data: {
            lastSyncedAt: new Date(),
            lastSyncStatus: input.isAvailable ? "ok" : (input.errorMessage ?? "error"),
          },
        }),
      ]);
      return log;
    }),

  // ── Log quality metric ──────────────────────────────────────────────
  logQuality: protectedProcedure
    .input(
      z.object({
        sourceId: z.string(),
        indicator: z.string(),
        qualityDimension: z.enum([
          "COMPLETENESS", "ACCURACY", "CONSISTENCY", "TIMELINESS", "VALIDITY",
        ]),
        score: z.number().min(0).max(1),
        threshold: z.number().min(0).max(1).default(0.7),
        details: z.record(z.unknown()).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.dataQualityMetric.create({
        data: {
          sourceId: input.sourceId,
          indicator: input.indicator,
          qualityDimension: input.qualityDimension,
          score: input.score,
          threshold: input.threshold,
          isPassing: input.score >= input.threshold,
          details: input.details as undefined | Record<string, string | number | boolean | null>,
        },
      });
    }),

  // ── Check data availability (in-memory analysis) ────────────────────
  checkAvailability: protectedProcedure
    .input(
      z.object({
        sectors: z.array(z.string()).min(1),
        location: z.string().optional(),
        crisisType: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      // Pull existing data sources from DB to use as "existing sources"
      const sources = await ctx.db.dataSource.findMany({
        where: {
          isActive: true,
          sector: { in: input.sectors },
        },
      });

      const existingSources = sources.map((s) => ({
        sector: s.sector,
        indicators: Array.isArray(s.indicators) ? (s.indicators as string[]) : [],
      }));

      return checkDataAvailability(
        { sectors: input.sectors, location: input.location, crisisType: input.crisisType },
        existingSources,
      );
    }),

  // ── Perform gap analysis (in-memory analysis) ──────────────────────
  gapAnalysis: protectedProcedure
    .input(
      z.object({
        sectors: z.array(z.string()).min(1),
        crisisType: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const sources = await ctx.db.dataSource.findMany({
        where: {
          isActive: true,
          sector: { in: input.sectors },
        },
      });

      const existingSources = sources.map((s) => ({
        sector: s.sector,
        indicators: Array.isArray(s.indicators) ? (s.indicators as string[]) : [],
      }));

      return performGapAnalysis(input.sectors, existingSources, input.crisisType);
    }),

  // ── Partner source catalog (static data) ────────────────────────────
  partnerSources: protectedProcedure
    .input(
      z.object({
        sector: z.string().optional(),
      }).default({}),
    )
    .query(({ input }) => {
      if (input.sector) {
        return PARTNER_SOURCES.filter((p) => p.sectors.includes(input.sector!));
      }
      return PARTNER_SOURCES;
    }),

  // ── Sector indicators catalog (static data) ─────────────────────────
  sectorIndicators: protectedProcedure
    .query(() => {
      return Object.entries(SECTOR_INDICATORS).map(([sector, indicators]) => ({
        sector,
        indicators,
        count: indicators.length,
      }));
    }),

  // ── Aggregate stats ─────────────────────────────────────────────────
  stats: protectedProcedure.query(async ({ ctx }) => {
    const [totalSources, activeSources, recentChecks, failingMetrics] =
      await Promise.all([
        ctx.db.dataSource.count(),
        ctx.db.dataSource.count({ where: { isActive: true } }),
        ctx.db.dataSourceAvailability.count({
          where: {
            checkedAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
            isAvailable: false,
          },
        }),
        ctx.db.dataQualityMetric.count({
          where: { isPassing: false },
        }),
      ]);

    return {
      totalSources,
      activeSources,
      recentOutages: recentChecks,
      failingMetrics,
    };
  }),
});
