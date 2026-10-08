import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { cookieHeaders, graphqlFetch, GraphQLRequestError } from "~/server/api/graphql";
import type { GqlCaseProposal, GqlComputedImpactPrior, GqlReviewCaseProposal, GqlTask } from "~/lib/types/graphql";
import { MAX_RATIONALE_LENGTH } from "~/lib/case-proposals";

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

/** A web case (clear-api V4, a "proposed signal" in the UI): what a decider
 * reads before deciding it, and what accepting it wrote into CLEAR. */
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
    eventCaseProposals(eventId: $eventId) {
      ${CASE_PROPOSAL_FIELDS}
    }
  }
`;

/** The Event's ImpactPriors computed from CLEAR's accepted history (V4).
 * Its own document, so a failure here never hides the rest of the
 * Enrichment section. */
export const COMPUTED_IMPACT_PRIORS_QUERY = `
  query ComputedImpactPriors($eventId: String!, $horizonYears: Int) {
    event(id: $eventId) {
      id
      computedImpactPriors(horizonYears: $horizonYears) {
        hazardType
        countryLocationId
        horizonYears
        metric
        populationGroup
        unit
        centralValue
        lowerBound
        upperBound
        numberOfCases
        lowConfidence
        eventIds
        estimateIds
        methodVersion
      }
    }
  }
`;

/** The Inbox's Review items (V4): proposed web cases across every Event,
 * with the Event whose enrichment produced each. clear-api admits deciders
 * only, so the list is exactly what the signed-in user may decide. */
export const PROPOSED_CASE_PROPOSALS_QUERY = `
  query ProposedCaseProposals($limit: Int, $offset: Int) {
    caseProposals(state: proposed, limit: $limit, offset: $offset) {
      ${CASE_PROPOSAL_FIELDS}
      event { id title types }
    }
  }
`;

/** The nav badge's count: the proposed web cases waiting for a decision.
 * Ids only, so a count on every page does not pull the evidence. clear-api
 * has no count query; the list is capped at its page maximum. */
export const REVIEW_COUNT_QUERY = `
  query ReviewCount($limit: Int) {
    caseProposals(state: proposed, limit: $limit) {
      id
    }
  }
`;

/** clear-api's page maximum for `caseProposals`. */
export const CASE_PROPOSALS_PAGE_MAX = 200;
/** How many proposed web cases the Inbox reads at most. */
export const CASE_PROPOSALS_READ_MAX = 2000;
/** How far each page read advances: a page less an overlap of 50, so up to
 * 50 decisions taken elsewhere mid-read never skip a waiting case. */
export const CASE_PAGE_STRIDE = CASE_PROPOSALS_PAGE_MAX - 50;
/** A safety bound on page reads, well past what CASE_PROPOSALS_READ_MAX needs. */
const CASE_PAGE_READS_MAX = 2 * Math.ceil(CASE_PROPOSALS_READ_MAX / CASE_PAGE_STRIDE);

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

  /** The Event's enrichment Tasks and web cases, as clear-api lets this user see them. */
  forEvent: protectedProcedure
    .input(z.object({ eventId: z.string() }))
    .query(async ({ ctx, input }) => {
      try {
        const data = await graphqlFetch<{
          eventTasks: GqlTask[];
          eventCaseProposals: GqlCaseProposal[];
        }>(EVENT_ENRICHMENT_QUERY, { eventId: input.eventId }, cookieHeaders(ctx));
        return { tasks: data.eventTasks, caseProposals: data.eventCaseProposals };
      } catch (err) {
        toTrpcError(err);
      }
    }),

  /** The Event's computed ImpactPriors (V4), read-only, most evidence
   * first; empty when the reader cannot see the Event. */
  computedPriors: protectedProcedure
    .input(z.object({ eventId: z.string(), horizonYears: z.number().int().min(1).max(50).optional() }))
    .query(async ({ ctx, input }) => {
      try {
        const data = await graphqlFetch<{ event: { id: string; computedImpactPriors: GqlComputedImpactPrior[] } | null }>(
          COMPUTED_IMPACT_PRIORS_QUERY,
          { eventId: input.eventId, horizonYears: input.horizonYears },
          cookieHeaders(ctx),
        );
        return data.event?.computedImpactPriors ?? [];
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
          limit: z.number().int().positive().max(CASE_PROPOSALS_PAGE_MAX).optional(),
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
        // Stop at the cap of unique cases, not at a count of reads: cases
        // proposed mid-read make pages repeat, and must not cut the list
        // short. The read count only bounds a list that never settles.
        for (let read = 0; read < CASE_PAGE_READS_MAX && all.length < CASE_PROPOSALS_READ_MAX; read++) {
          const rows = await page(CASE_PROPOSALS_PAGE_MAX, offset);
          for (const row of rows) if (!seen.has(row.id)) (seen.add(row.id), all.push(row));
          if (rows.length < CASE_PROPOSALS_PAGE_MAX) break;
          // Pages overlap: a case decided elsewhere between two reads shifts
          // the list up, and a full-stride step would skip the case that
          // moved into its place. The overlap re-reads it; `seen` lists
          // each case once.
          offset += CASE_PAGE_STRIDE;
        }
        return all;
      } catch (err) {
        toTrpcError(err);
      }
    }),

  /** How many decisions wait: the proposed web cases, up to clear-api's
   * page maximum (`capped` when there may be more) — admins and analysts
   * only. */
  reviewCount: protectedProcedure.query(async ({ ctx }) => {
    try {
      const data = await graphqlFetch<{ caseProposals: { id: string }[] }>(
        REVIEW_COUNT_QUERY,
        { limit: CASE_PROPOSALS_PAGE_MAX },
        cookieHeaders(ctx),
      );
      const cases = data.caseProposals.length;
      return { count: cases, capped: cases >= CASE_PROPOSALS_PAGE_MAX };
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
