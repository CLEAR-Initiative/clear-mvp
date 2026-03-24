import { alertsRouter } from "~/server/api/routers/alerts";
import { featureFlagsRouter } from "~/server/api/routers/featureFlags";
import { authRouter } from "~/server/api/routers/auth";
import { detectionsRouter } from "~/server/api/routers/detections";
import { eventsRouter } from "~/server/api/routers/events";
import { hapiRouter } from "~/server/api/routers/hapi";
import { informRouter } from "~/server/api/routers/inform";
import { llmRouter } from "~/server/api/routers/llm";
import { pipelineRouter } from "~/server/api/routers/pipeline";
import { signalsRouter } from "~/server/api/routers/signals";
import { teamsRouter } from "~/server/api/routers/teams";
import { locationsRouter } from "~/server/api/routers/locations";
import { invitationsRouter } from "~/server/api/routers/invitations";
import { createCallerFactory, createTRPCRouter } from "~/server/api/trpc";

export const appRouter = createTRPCRouter({
  alerts: alertsRouter,
  auth: authRouter,
  detections: detectionsRouter,
  events: eventsRouter,
  hapi: hapiRouter,
  inform: informRouter,
  llm: llmRouter,
  invitations: invitationsRouter,
  locations: locationsRouter,
  pipeline: pipelineRouter,
  signals: signalsRouter,
  teams: teamsRouter,
  featureFlags: featureFlagsRouter,
});

export type AppRouter = typeof appRouter;

export const createCaller = createCallerFactory(appRouter);
