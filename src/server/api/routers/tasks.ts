import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { cookieHeaders, graphqlFetch, GraphQLRequestError } from "~/server/api/graphql";
import type { GqlImpactPrior, GqlTask } from "~/lib/types/graphql";

/**
 * Event enrichment (clear-api ADR-0010): thin proxies over the Task queue's
 * user-facing operations. clear-api's guards are the authorisation; the UI
 * only mirrors them. A Worker (never clear-mvp) does the work.
 */

const TASK_FIELDS = `
  id
  kind
  subjectType
  subjectId
  status
  origin
  requesterId
  requester { id name }
  teamId
  attempts
  maxAttempts
  lastError
  cancelRequestedAt
  outcome
  model
  costUsd
  completedAt
  createdAt
  updatedAt
`;

const IMPACT_PRIOR_FIELDS = `
  id
  eventId
  taskId
  state
  hazardType
  countryLocationId
  geographicScope
  horizonYears
  populationGroup
  metric
  lowerBound
  upperBound
  numberOfCases
  basis
  methodVersion
  supersedesId
  decidedById
  decidedAt
  decisionRationale
  createdAt
`;

export const REQUEST_EVENT_ENRICHMENT = `
  mutation RequestEventEnrichment($eventId: String!, $teamId: String, $horizonYears: Int) {
    requestEventEnrichment(eventId: $eventId, teamId: $teamId, horizonYears: $horizonYears) {
      ${TASK_FIELDS}
    }
  }
`;

export const EVENT_ENRICHMENT_QUERY = `
  query EventEnrichment($eventId: String!) {
    eventTasks(eventId: $eventId) {
      ${TASK_FIELDS}
    }
    eventImpactPriors(eventId: $eventId) {
      ${IMPACT_PRIOR_FIELDS}
    }
  }
`;

export const CANCEL_TASK = `
  mutation CancelTask($id: String!) {
    cancelTask(id: $id) {
      ${TASK_FIELDS}
    }
  }
`;

/**
 * Surface clear-api's error as a tRPC error the client can branch on:
 * `data.code` carries the GraphQL code mapped onto tRPC's vocabulary and
 * the message is clear-api's own (it names the cap, the missing right, …).
 * `DAILY_CAP` becomes TOO_MANY_REQUESTS so the UI can tell it from a plain
 * FORBIDDEN without parsing text.
 */
export function toTrpcError(err: unknown): never {
  if (err instanceof GraphQLRequestError) {
    const code =
      err.subCode === "DAILY_CAP"
        ? "TOO_MANY_REQUESTS"
        : err.code === "FORBIDDEN"
          ? "FORBIDDEN"
          : err.code === "NOT_FOUND"
            ? "NOT_FOUND"
            : err.code === "CONFLICT"
              ? "CONFLICT"
              : err.code === "BAD_USER_INPUT"
                ? "BAD_REQUEST"
                : "INTERNAL_SERVER_ERROR";
    throw new TRPCError({ code, message: err.message, cause: err });
  }
  throw err;
}

export const tasksRouter = createTRPCRouter({
  /** Request enrichment on an Event, or get back the Task already open for it. */
  requestEnrichment: protectedProcedure
    .input(
      z.object({
        eventId: z.string(),
        /** The active team — an authorisation hint for team coordinators, as events.create passes it. */
        teamId: z.string().nullish(),
        horizonYears: z.number().int().positive().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const data = await graphqlFetch<{ requestEventEnrichment: GqlTask }>(
          REQUEST_EVENT_ENRICHMENT,
          {
            eventId: input.eventId,
            teamId: input.teamId ?? undefined,
            horizonYears: input.horizonYears,
          },
          cookieHeaders(ctx),
        );
        return data.requestEventEnrichment;
      } catch (err) {
        toTrpcError(err);
      }
    }),

  /** The Event's enrichment Tasks and ImpactPriors, as clear-api lets this user see them. */
  forEvent: protectedProcedure
    .input(z.object({ eventId: z.string() }))
    .query(async ({ ctx, input }) => {
      try {
        const data = await graphqlFetch<{ eventTasks: GqlTask[]; eventImpactPriors: GqlImpactPrior[] }>(
          EVENT_ENRICHMENT_QUERY,
          { eventId: input.eventId },
          cookieHeaders(ctx),
        );
        return { tasks: data.eventTasks, impactPriors: data.eventImpactPriors };
      } catch (err) {
        toTrpcError(err);
      }
    }),

  /** Cancel a Task — the requester or a platform admin. */
  cancel: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      try {
        const data = await graphqlFetch<{ cancelTask: GqlTask }>(CANCEL_TASK, { id: input.id }, cookieHeaders(ctx));
        return data.cancelTask;
      } catch (err) {
        toTrpcError(err);
      }
    }),
});
