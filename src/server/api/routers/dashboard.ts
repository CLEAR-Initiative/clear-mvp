import {
  createTRPCRouter,
  protectedProcedure,
} from "~/server/api/trpc";

export const dashboardRouter = createTRPCRouter({
  stats: protectedProcedure.query(async ({ ctx }) => {
    const [
      totalCrises,
      activeCrises,
      totalDecisions,
      activeAlerts,
      crisesBySeverity,
      crisesByType,
    ] = await Promise.all([
      ctx.db.crisis.count(),
      ctx.db.crisis.count({ where: { status: "ACTIVE" } }),
      ctx.db.decision.count(),
      ctx.db.alert.count({ where: { isActive: true } }),
      ctx.db.crisis.groupBy({ by: ["severity"], _count: true }),
      ctx.db.crisis.groupBy({ by: ["type"], _count: true }),
    ]);

    return {
      totalCrises,
      activeCrises,
      totalDecisions,
      activeAlerts,
      crisesBySeverity: crisesBySeverity.map((g) => ({
        severity: g.severity,
        count: g._count,
      })),
      crisesByType: crisesByType.map((g) => ({
        type: g.type,
        count: g._count,
      })),
    };
  }),

  recentCrises: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.crisis.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { decisions: true, alerts: true } },
        createdBy: { select: { name: true } },
      },
    });
  }),

  recentDecisions: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.decision.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      include: {
        crisis: { select: { id: true, title: true } },
        madeBy: { select: { name: true } },
      },
    });
  }),

  activeAlerts: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.alert.findMany({
      where: { isActive: true },
      take: 10,
      orderBy: { triggeredAt: "desc" },
      include: {
        crisis: { select: { id: true, title: true } },
      },
    });
  }),
});
