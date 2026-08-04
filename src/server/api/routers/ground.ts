import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { graphqlFetch, cookieHeaders } from "~/server/api/graphql";
import type {
  GqlGroundMessage,
  GqlGroundSource,
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

const GROUND_SOURCES_QUERY = `
  query GroundSources {
    groundSources { ${GROUND_SOURCE_FIELDS} }
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
