import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { cookieHeaders, graphqlFetch, GraphQLRequestError } from "~/server/api/graphql";
import type {
  GqlCaseProposal,
  GqlImpactPrior,
  GqlReviewCaseProposal,
  GqlReviewImpactPrior,
  GqlTask,
} from "~/lib/types/graphql";
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

/** A web case (clear-api V4): what a decider reads before deciding it, and
 * what accepting it wrote into CLEAR. */
const CASE_PROPOSAL_FIELDS = `
  id
  eventId
  taskId
  state
  sourceUrl
  quote
  occurredAt
  locationLabel
  locationId
  hazardType
  geographicScope
  figures
  matchedEventId
  methodVersion
  decidedById
  decidedAt
  decisionRationale
  resultSignalId
  resultEventId
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
    eventCaseProposals(eventId: $eventId) {
      ${CASE_PROPOSAL_FIELDS}
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

/** The Inbox's per-case Review items (V4): proposed web cases across every
 * Event, with the Event whose enrichment produced each. Deciders only, like
 * `impactPriors`. */
export const PROPOSED_CASE_PROPOSALS_QUERY = `
  query ProposedCaseProposals($limit: Int, $offset: Int) {
    caseProposals(state: proposed, limit: $limit, offset: $offset) {
      ${CASE_PROPOSAL_FIELDS}
      event { id title types }
    }
  }
`;

/** The nav badge's count: what waits for a decision — whole priors (CLEAR
 * data) and web cases, one each. Ids only, so a count on every page does
 * not pull the evidence. clear-api has no count query; each list is capped
 * at its page maximum. */
export const REVIEW_COUNT_QUERY = `
  query ReviewCount($limit: Int) {
    impactPriors(state: proposed, limit: $limit) {
      id
    }
    caseProposals(state: proposed, limit: $limit) {
      id
    }
  }
`;

/** clear-api's page maximum for `impactPriors` and `caseProposals`. */
export const PROPOSED_IMPACT_PRIORS_MAX = 200;
/** How many proposed web cases the Inbox reads at most (ten pages). */
export const CASE_PROPOSALS_READ_MAX = 2000;

export const DECIDE_IMPACT_PRIOR = `
  mutation DecideImpactPrior($id: String!, $decision: ImpactPriorDecision!, $rationale: String!) {
    decideImpactPrior(id: $id, decision: $decision, rationale: $rationale) {
      ${IMPACT_PRIOR_FIELDS}
    }
  }
`;

export const DECIDE_CASE_PROPOSAL = `
  mutation DecideCaseProposal($id: String!, $decision: CaseProposalDecision!, $rationale: String) {
    decideCaseProposal(id: $id, decision: $decision, rationale: $rationale) {
      ${CASE_PROPOSAL_FIELDS}
    }
  }
`;

/** "My requests": the caller's own Tasks, newest first (clear-api scopes it
 * to the caller; there is no way to ask for anyone else's). */
export const MY_TASKS_QUERY = `
  query MyTasks($status: TaskStatus, $limit: Int) {
    myTasks(status: $status, limit: $limit) {
      ${TASK_FIELDS}
    }
  }
`;

/** Unfiltered My requests: the newest requests, plus every open one however
 * old (so a still-pending request never drops off the list with its
 * Cancel), in one round trip. */
export const MY_TASKS_WITH_OPEN_QUERY = `
  query MyTasksWithOpen($limit: Int, $openLimit: Int) {
    recent: myTasks(limit: $limit) {
      ${TASK_FIELDS}
    }
    pending: myTasks(status: PENDING, limit: $openLimit) {
      ${TASK_FIELDS}
    }
    leased: myTasks(status: LEASED, limit: $openLimit) {
      ${TASK_FIELDS}
    }
  }
`;

/** How many of the caller's most recent requests My requests lists (clear-api
 * allows up to 200); older finished ones are history the Event pages still
 * show. Open ones are always listed, up to clear-api's maximum. */
export const MY_TASKS_MAX = 100;
export const MY_OPEN_TASKS_MAX = 200;

/** Tasks from several lists, each once, newest first. The sort is stable,
 * so ties keep clear-api's own order (the first list's first). */
export function mergeTasks(...lists: GqlTask[][]): GqlTask[] {
  const byId = new Map<string, GqlTask>();
  for (const list of lists) for (const task of list) if (!byId.has(task.id)) byId.set(task.id, task);
  return [...byId.values()].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}

/** One document reading the title of each Event the Tasks are about, aliased
 * `e0`, `e1`, … — a Task names its subject by id only. An Event the caller
 * may not see comes back null and the row says so. */
export function eventTitlesQuery(count: number): string {
  const vars = Array.from({ length: count }, (_, i) => `$e${i}: String!`).join(", ");
  const fields = Array.from({ length: count }, (_, i) => `e${i}: event(id: $e${i}) { id title }`).join("\n    ");
  return `query MyTaskEvents(${vars}) {\n    ${fields}\n  }`;
}

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

  /** The Event's enrichment Tasks, ImpactPriors and web cases, as clear-api lets this user see them. */
  forEvent: protectedProcedure
    .input(z.object({ eventId: z.string() }))
    .query(async ({ ctx, input }) => {
      try {
        const data = await graphqlFetch<{
          eventTasks: GqlTask[];
          eventImpactPriors: GqlImpactPrior[];
          eventCaseProposals: GqlCaseProposal[];
        }>(EVENT_ENRICHMENT_QUERY, { eventId: input.eventId }, cookieHeaders(ctx));
        return { tasks: data.eventTasks, impactPriors: data.eventImpactPriors, caseProposals: data.eventCaseProposals };
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

  /** Proposed web cases waiting for a decision, newest first, with their
   * Event — admins and analysts only (V4). With no `limit`, every one, read
   * page by page (one completion can propose dozens, so a single page of
   * clear-api's maximum would leave older cases unreachable), up to
   * CASE_PROPOSALS_READ_MAX. */
  proposedCaseProposals: protectedProcedure
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
        const headers = cookieHeaders(ctx);
        const page = async (limit: number | undefined, offset: number | undefined) =>
          (
            await graphqlFetch<{ caseProposals: GqlReviewCaseProposal[] }>(
              PROPOSED_CASE_PROPOSALS_QUERY,
              { limit, offset },
              headers,
            )
          ).caseProposals;
        if (input?.limit !== undefined) return await page(input.limit, input.offset);
        const all: GqlReviewCaseProposal[] = [];
        const seen = new Set<string>();
        let offset = input?.offset ?? 0;
        while (all.length < CASE_PROPOSALS_READ_MAX) {
          const rows = await page(PROPOSED_IMPACT_PRIORS_MAX, offset);
          // A case decided between two pages shifts the next one; never list it twice.
          for (const row of rows) if (!seen.has(row.id)) (seen.add(row.id), all.push(row));
          if (rows.length < PROPOSED_IMPACT_PRIORS_MAX) break;
          offset += rows.length;
        }
        return all;
      } catch (err) {
        toTrpcError(err);
      }
    }),

  /** How many decisions wait: proposed ImpactPriors plus proposed web cases,
   * each list up to clear-api's page maximum (`capped` when either may hold
   * more) — admins and analysts only. */
  reviewCount: protectedProcedure.query(async ({ ctx }) => {
    try {
      const data = await graphqlFetch<{ impactPriors: { id: string }[]; caseProposals: { id: string }[] }>(
        REVIEW_COUNT_QUERY,
        { limit: PROPOSED_IMPACT_PRIORS_MAX },
        cookieHeaders(ctx),
      );
      const priors = data.impactPriors.length;
      const cases = data.caseProposals.length;
      return { count: priors + cases, capped: priors >= PROPOSED_IMPACT_PRIORS_MAX || cases >= PROPOSED_IMPACT_PRIORS_MAX };
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

  /** Accept or reject one web case (V4) — admins and analysts only. The
   * rationale is required to reject and optional to accept. CONFLICT when
   * another decider got there first. */
  decideCaseProposal: protectedProcedure
    .input(
      z
        .object({
          id: z.string(),
          decision: z.enum(["accepted", "rejected"]),
          rationale: z.string().trim().max(MAX_RATIONALE_LENGTH).optional(),
        })
        .refine((v) => v.decision !== "rejected" || (v.rationale ?? "").length > 0, {
          message: "A rationale is required to reject a case",
          path: ["rationale"],
        }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const data = await graphqlFetch<{ decideCaseProposal: GqlCaseProposal }>(
          DECIDE_CASE_PROPOSAL,
          { id: input.id, decision: input.decision, rationale: input.rationale || undefined },
          cookieHeaders(ctx),
        );
        return data.decideCaseProposal;
      } catch (err) {
        toTrpcError(err);
      }
    }),

  /** "My requests": the caller's own Tasks, newest first, with the title of
   * each Event they are about. Unfiltered, every open request is listed
   * however old; finished ones only among the newest MY_TASKS_MAX. */
  myTasks: protectedProcedure
    .input(
      z
        .object({
          status: z.enum(["PENDING", "LEASED", "COMPLETED", "FAILED", "CANCELLED"]).optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      try {
        const headers = cookieHeaders(ctx);
        let myTasks: GqlTask[];
        if (input?.status) {
          ({ myTasks } = await graphqlFetch<{ myTasks: GqlTask[] }>(
            MY_TASKS_QUERY,
            { status: input.status, limit: MY_TASKS_MAX },
            headers,
          ));
        } else {
          const lists = await graphqlFetch<{ recent: GqlTask[]; pending: GqlTask[]; leased: GqlTask[] }>(
            MY_TASKS_WITH_OPEN_QUERY,
            { limit: MY_TASKS_MAX, openLimit: MY_OPEN_TASKS_MAX },
            headers,
          );
          myTasks = mergeTasks(lists.recent, lists.pending, lists.leased);
        }
        const eventIds = [...new Set(myTasks.filter((task) => task.subjectType === "event").map((task) => task.subjectId))];
        const eventTitles: Record<string, string | null> = {};
        if (eventIds.length > 0) {
          // Titles are decoration: if their read fails, the requests still
          // list (each reads as an untitled Event) rather than the whole
          // Inbox failing on a transient error in the second round trip.
          try {
            const vars = Object.fromEntries(eventIds.map((id, i) => [`e${i}`, id]));
            const events = await graphqlFetch<Record<string, { id: string; title: string | null } | null>>(
              eventTitlesQuery(eventIds.length),
              vars,
              headers,
            );
            eventIds.forEach((id, i) => {
              eventTitles[id] = events[`e${i}`]?.title ?? null;
            });
          } catch (err) {
            console.error(`[tasks.myTasks] could not read the titles of ${eventIds.length} Event(s):`, err);
          }
        }
        return { tasks: myTasks, eventTitles };
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
