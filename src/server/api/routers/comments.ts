import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { graphqlFetch, cookieHeaders } from "~/server/api/graphql";
import type { GqlUserComment } from "~/lib/types/graphql";

const COMMENT_FIELDS = `
  id
  comment
  createdAt
  isCommentReply
  repliedToCommentId
  user { id name image }
  tags { user { id name image } }
`;

const EVENT_COMMENTS_QUERY = `
  query EventComments($id: String!) {
    event(id: $id) {
      comments { ${COMMENT_FIELDS} }
    }
  }
`;

const SIGNAL_COMMENTS_QUERY = `
  query SignalComments($id: String!) {
    signal(id: $id) {
      comments { ${COMMENT_FIELDS} }
    }
  }
`;

export const commentsRouter = createTRPCRouter({
  list: protectedProcedure
    .input(z.object({
      entityId: z.string(),
      entityType: z.enum(["event", "signal"]),
    }))
    .query(async ({ ctx, input }) => {
      if (input.entityType === "event") {
        const data = await graphqlFetch<{ event: { comments: GqlUserComment[] } | null }>(
          EVENT_COMMENTS_QUERY,
          { id: input.entityId },
          cookieHeaders(ctx),
        );
        return data.event?.comments ?? [];
      } else {
        const data = await graphqlFetch<{ signal: { comments: GqlUserComment[] } | null }>(
          SIGNAL_COMMENTS_QUERY,
          { id: input.entityId },
          cookieHeaders(ctx),
        );
        return data.signal?.comments ?? [];
      }
    }),
});
