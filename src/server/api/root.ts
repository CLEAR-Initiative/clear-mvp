import { postRouter } from "~/server/api/routers/post";
import { crisisRouter } from "~/server/api/routers/crisis";
import { decisionRouter } from "~/server/api/routers/decision";
import { alertRouter } from "~/server/api/routers/alert";
import { dashboardRouter } from "~/server/api/routers/dashboard";
import { feedsRouter } from "~/server/api/routers/feeds";
import { surveyRouter } from "~/server/api/routers/survey";
import { auditRouter } from "~/server/api/routers/audit";
import { feedbackRouter } from "~/server/api/routers/feedback";
import { referralRouter } from "~/server/api/routers/referral";
import { koboRouter } from "~/server/api/routers/kobo";
import { assessmentRouter } from "~/server/api/routers/assessment";
import { dataSourceRouter } from "~/server/api/routers/data-source";
import { createCallerFactory, createTRPCRouter } from "~/server/api/trpc";

export const appRouter = createTRPCRouter({
  post: postRouter,
  crisis: crisisRouter,
  decision: decisionRouter,
  alert: alertRouter,
  dashboard: dashboardRouter,
  feeds: feedsRouter,
  survey: surveyRouter,
  audit: auditRouter,
  feedback: feedbackRouter,
  referral: referralRouter,
  kobo: koboRouter,
  assessment: assessmentRouter,
  dataSource: dataSourceRouter,
});

export type AppRouter = typeof appRouter;

export const createCaller = createCallerFactory(appRouter);
