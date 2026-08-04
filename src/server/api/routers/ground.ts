import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { graphqlFetch, cookieHeaders } from "~/server/api/graphql";
import type {
  GqlGroundMessage,
  GqlGroundSource,
  GqlGroundThread,
  GqlGroundThreadDetail,
} from "~/lib/types/graphql";

/**
 * Ground intel staging tier (detection → Ground intel tab).
 *
 * The whole tier is PRIVATE: clear-api gates every query and mutation on
 * the global admin/analyst role, and `reviewGroundThread` additionally
 * consults the source's own `reviewerRoles` policy record. This router is
 * a thin proxy — authorization lives in clear-api; the UI mirrors it only
 * to avoid showing controls that would always fail.
 *
 * Privacy: `senderName` is private-tier data. It may be rendered inside
 * the Ground-intel tab ONLY. Phone numbers are redacted at persistence by
 * clear-api and must never surface anywhere.
 */

const GROUND_SOURCE_FIELDS = `id name kind reviewerRoles privacyDefault isActive`;

const GROUND_MESSAGE_FIELDS = `
  id
  groundSourceId
  externalId
  sentAt
  senderRef
  senderName
  text
  mediaKeys
  mediaUrls
  mediaRefs
  omittedMediaCount
  classification
  uncertainty
  isEdited
  threadId
`;

const GROUND_THREAD_FIELDS = `
  id
  groundSourceId
  title
  lifecycleState
  reviewState
  reviewedBy
  reviewedAt
  reviewNote
  promotedSignalId
  createdAt
`;

const GROUND_SOURCES_QUERY = `
  query GroundSources {
    groundSources { ${GROUND_SOURCE_FIELDS} }
  }
`;

const GROUND_THREADS_QUERY = `
  query GroundThreads($groundSourceId: String, $reviewState: String, $limit: Int, $offset: Int) {
    groundThreads(groundSourceId: $groundSourceId, reviewState: $reviewState, limit: $limit, offset: $offset) {
      ${GROUND_THREAD_FIELDS}
    }
  }
`;

const GROUND_THREAD_QUERY = `
  query GroundThread($id: String!) {
    groundThread(id: $id) {
      ${GROUND_THREAD_FIELDS}
      source { ${GROUND_SOURCE_FIELDS} }
      messages { ${GROUND_MESSAGE_FIELDS} }
    }
  }
`;

const REVIEW_GROUND_THREAD_MUTATION = `
  mutation ReviewGroundThread($id: String!, $decision: String!, $note: String) {
    reviewGroundThread(id: $id, decision: $decision, note: $note) {
      ${GROUND_THREAD_FIELDS}
    }
  }
`;

const GROUND_MESSAGES_QUERY = `
  query GroundMessages($groundSourceId: String, $threadId: String, $limit: Int, $offset: Int) {
    groundMessages(groundSourceId: $groundSourceId, threadId: $threadId, limit: $limit, offset: $offset) {
      ${GROUND_MESSAGE_FIELDS}
    }
  }
`;

export const groundRouter = createTRPCRouter({
  /** Per-source policy records — drives source names + reviewerRoles gating. */
  sources: protectedProcedure.query(async ({ ctx }) => {
    const data = await graphqlFetch<{ groundSources: GqlGroundSource[] }>(
      GROUND_SOURCES_QUERY,
      {},
      cookieHeaders(ctx),
    );
    return data.groundSources;
  }),

  /** Review queue: incident threads, newest first (clear-api ordering). */
  threads: protectedProcedure
    .input(
      z
        .object({
          groundSourceId: z.string().optional(),
          reviewState: z.string().optional(),
          limit: z.number().int().min(1).max(500).optional(),
          offset: z.number().int().min(0).optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const data = await graphqlFetch<{ groundThreads: GqlGroundThread[] }>(
        GROUND_THREADS_QUERY,
        {
          groundSourceId: input?.groundSourceId,
          reviewState: input?.reviewState,
          limit: input?.limit ?? 200,
          offset: input?.offset ?? 0,
        },
        cookieHeaders(ctx),
      );
      return data.groundThreads;
    }),

  /** One thread with its source policy record and messages (oldest first). */
  thread: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const data = await graphqlFetch<{ groundThread: GqlGroundThreadDetail | null }>(
        GROUND_THREAD_QUERY,
        { id: input.id },
        cookieHeaders(ctx),
      );
      return data.groundThread;
    }),

  /**
   * Review a thread: approve_private | approve_public | reject.
   * clear-api enforces the per-source reviewerRoles policy and the V1
   * state machine (approved_public is terminal and triggers promotion
   * into the signals graph with all sender identity scrubbed).
   */
  review: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        decision: z.enum(["approve_private", "approve_public", "reject"]),
        note: z.string().max(2000).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const data = await graphqlFetch<{ reviewGroundThread: GqlGroundThread }>(
        REVIEW_GROUND_THREAD_MUTATION,
        { id: input.id, decision: input.decision, note: input.note ?? null },
        cookieHeaders(ctx),
      );
      return data.reviewGroundThread;
    }),

  /** Staged messages, oldest first (clear-api ordering). */
  messages: protectedProcedure
    .input(
      z
        .object({
          groundSourceId: z.string().optional(),
          threadId: z.string().optional(),
          limit: z.number().int().min(1).max(1000).optional(),
          offset: z.number().int().min(0).optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const data = await graphqlFetch<{ groundMessages: GqlGroundMessage[] }>(
        GROUND_MESSAGES_QUERY,
        {
          groundSourceId: input?.groundSourceId,
          threadId: input?.threadId,
          limit: input?.limit ?? 500,
          offset: input?.offset ?? 0,
        },
        cookieHeaders(ctx),
      );
      return data.groundMessages;
    }),
});
