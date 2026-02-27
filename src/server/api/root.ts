import { alertFrameworkRouter } from "~/server/api/routers/alertFramework";
import { alertsRouter } from "~/server/api/routers/alerts";
import { authRouter } from "~/server/api/routers/auth";
import { dashboardRouter } from "~/server/api/routers/dashboard";
import { llmRouter } from "~/server/api/routers/llm";
import { pipelineRouter } from "~/server/api/routers/pipeline";
import { createCallerFactory, createTRPCRouter } from "~/server/api/trpc";

export const appRouter = createTRPCRouter({
  alertFramework: alertFrameworkRouter,
  alerts: alertsRouter,
  auth: authRouter,
  dashboard: dashboardRouter,
  llm: llmRouter,
  pipeline: pipelineRouter,
});

export type AppRouter = typeof appRouter;

export const createCaller = createCallerFactory(appRouter);
