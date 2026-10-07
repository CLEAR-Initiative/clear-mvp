import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { cookieHeaders, graphqlFetch, GraphQLRequestError } from "~/server/api/graphql";
import type { GqlImpactPrior, GqlReviewImpactPrior, GqlTask } from "~/lib/types/graphql";
import { MAX_RATIONALE_LENGTH } from "~/lib/impact-prior-review";

/**
 * Event enrichment (clear-api ADR-0010): thin proxies over the Task queue's
 * user-facing operations. clear-api's guards are the authorisation; the UI
 * only mirrors them. A Worker (never clear-mvp) does the work.
 */

const TASK_FIELDS = `
  id
  kind
  requestId
  subjectType
  subjectId
  status
  origin
  requesterId
  requester { id name }
  leaseOwner { id name }
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
  sourceKind
  task { leaseOwner { id name } }
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

/** The Inbox's Review items: proposed ImpactPriors across every Event, with
 * the Event they are about. clear-api admits deciders only, so the list is
 * exactly what the signed-in user may decide. */
export const PROPOSED_IMPACT_PRIORS_QUERY = `
  query ProposedImpactPriors($limit: Int, $offset: Int) {
    impactPriors(state: proposed, limit: $limit, offset: $offset) {
      ${IMPACT_PRIOR_FIELDS}
      event { id title types }
    }
  }
`;

/** The nav badge's count: ids only, so a count on every page does not pull
 * each prior's evidence and its Event. clear-api has no count query; this
 * is capped at its page maximum. */
export const PROPOSED_IMPACT_PRIOR_IDS_QUERY = `
  query ProposedImpactPriorIds($limit: Int) {
    impactPriors(state: proposed, limit: $limit) {
      id
    }
  }
`;

/** clear-api's page maximum for `impactPriors`. */
export const PROPOSED_IMPACT_PRIORS_MAX = 200;

export const DECIDE_IMPACT_PRIOR = `
  mutation DecideImpactPrior($id: String!, $decision: ImpactPriorDecision!, $rationale: String!) {
    decideImpactPrior(id: $id, decision: $decision, rationale: $rationale) {
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
  /** Request enrichment on an Event: one Task per source kind (clear-api fans
   * out; a kind with an open Task hands that one back), in configured order. */
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
        const data = await graphqlFetch<{ requestEventEnrichment: GqlTask[] }>(
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

  /** Proposed ImpactPriors waiting for a decision, newest first — admins and analysts only. */
  proposedImpactPriors: protectedProcedure
    .input(
      z
        .object({
          limit: z.number().int().positive().max(PROPOSED_IMPACT_PRIORS_MAX).optional(),
          offset: z.number().int().nonnegative().optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      try {
        const data = await graphqlFetch<{ impactPriors: GqlReviewImpactPrior[] }>(
          PROPOSED_IMPACT_PRIORS_QUERY,
          { limit: input?.limit, offset: input?.offset },
          cookieHeaders(ctx),
        );
        return data.impactPriors;
      } catch (err) {
        toTrpcError(err);
      }
    }),

  /** How many proposed ImpactPriors wait for a decision, up to clear-api's
   * page maximum (`capped` when there may be more) — admins and analysts only. */
  proposedImpactPriorCount: protectedProcedure.query(async ({ ctx }) => {
    try {
      const data = await graphqlFetch<{ impactPriors: { id: string }[] }>(
        PROPOSED_IMPACT_PRIOR_IDS_QUERY,
        { limit: PROPOSED_IMPACT_PRIORS_MAX },
        cookieHeaders(ctx),
      );
      const count = data.impactPriors.length;
      return { count, capped: count >= PROPOSED_IMPACT_PRIORS_MAX };
    } catch (err) {
      toTrpcError(err);
    }
  }),

  /** Accept or reject a proposed ImpactPrior with a rationale — admins and analysts only. */
  decideImpactPrior: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        decision: z.enum(["accepted", "rejected"]),
        rationale: z.string().trim().min(1).max(MAX_RATIONALE_LENGTH),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const data = await graphqlFetch<{ decideImpactPrior: GqlImpactPrior }>(
          DECIDE_IMPACT_PRIOR,
          { id: input.id, decision: input.decision, rationale: input.rationale },
          cookieHeaders(ctx),
        );
        return data.decideImpactPrior;
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
