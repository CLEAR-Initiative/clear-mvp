import { alertsRouter } from "~/server/api/routers/alerts";
import { commentsRouter } from "~/server/api/routers/comments";
import { feedbackRouter } from "~/server/api/routers/feedback";
import { featureFlagsRouter } from "~/server/api/routers/featureFlags";
import { authRouter } from "~/server/api/routers/auth";
import { eventsRouter } from "~/server/api/routers/events";
import { hapiRouter } from "~/server/api/routers/hapi";
import { informRouter } from "~/server/api/routers/inform";
import { llmRouter } from "~/server/api/routers/llm";
import { pipelineRouter } from "~/server/api/routers/pipeline";
import { signalsRouter } from "~/server/api/routers/signals";
import { crisesRouter } from "~/server/api/routers/crises";
import { teamsRouter } from "~/server/api/routers/teams";
import { locationsRouter } from "~/server/api/routers/locations";
import { invitationsRouter } from "~/server/api/routers/invitations";
import { subscriptionsRouter } from "~/server/api/routers/subscriptions";
import { createCallerFactory, createTRPCRouter } from "~/server/api/trpc";

export const appRouter = createTRPCRouter({
  alerts: alertsRouter,
  auth: authRouter,
  comments: commentsRouter,
  feedback: feedbackRouter,
  events: eventsRouter,
  hapi: hapiRouter,
  inform: informRouter,
  llm: llmRouter,
  invitations: invitationsRouter,
  locations: locationsRouter,
  pipeline: pipelineRouter,
  signals: signalsRouter,
  crises: crisesRouter,
  teams: teamsRouter,
  featureFlags: featureFlagsRouter,
  subscriptions: subscriptionsRouter,
});

export type AppRouter = typeof appRouter;

export const createCaller = createCallerFactory(appRouter);
