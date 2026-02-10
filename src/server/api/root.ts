import { postRouter } from "~/server/api/routers/post";
import { crisisRouter } from "~/server/api/routers/crisis";
import { decisionRouter } from "~/server/api/routers/decision";
import { alertRouter } from "~/server/api/routers/alert";
import { dashboardRouter } from "~/server/api/routers/dashboard";
import { feedsRouter } from "~/server/api/routers/feeds";
import { createCallerFactory, createTRPCRouter } from "~/server/api/trpc";

export const appRouter = createTRPCRouter({
  post: postRouter,
  crisis: crisisRouter,
  decision: decisionRouter,
  alert: alertRouter,
  dashboard: dashboardRouter,
  feeds: feedsRouter,
});

export type AppRouter = typeof appRouter;

export const createCaller = createCallerFactory(appRouter);
