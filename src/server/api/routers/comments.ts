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

const SITUATION_COMMENTS_QUERY = `
  query SituationComments($id: String!) {
    situation(id: $id) {
      comments { ${COMMENT_FIELDS} }
    }
  }
`;

const ADD_COMMENT_MUTATION = `
  mutation AddComment($input: AddCommentInput!) {
    addComment(input: $input) { ${COMMENT_FIELDS} }
  }
`;

const REPLY_TO_COMMENT_MUTATION = `
  mutation ReplyToComment($input: ReplyToCommentInput!) {
    replyToComment(input: $input) { ${COMMENT_FIELDS} }
  }
`;

const DELETE_COMMENT_MUTATION = `
  mutation DeleteComment($id: String!) {
    deleteComment(id: $id)
  }
`;

export const commentsRouter = createTRPCRouter({
  list: protectedProcedure
    .input(z.object({
      entityId: z.string(),
      entityType: z.enum(["event", "signal", "situation"]),
    }))
    .query(async ({ ctx, input }) => {
      if (input.entityType === "event") {
        const data = await graphqlFetch<{ event: { comments: GqlUserComment[] } | null }>(
          EVENT_COMMENTS_QUERY,
          { id: input.entityId },
          cookieHeaders(ctx),
        );
        return data.event?.comments ?? [];
      }
      if (input.entityType === "situation") {
        const data = await graphqlFetch<{ situation: { comments: GqlUserComment[] } | null }>(
          SITUATION_COMMENTS_QUERY,
          { id: input.entityId },
          cookieHeaders(ctx),
        );
        return data.situation?.comments ?? [];
      }
      const data = await graphqlFetch<{ signal: { comments: GqlUserComment[] } | null }>(
        SIGNAL_COMMENTS_QUERY,
        { id: input.entityId },
        cookieHeaders(ctx),
      );
      return data.signal?.comments ?? [];
    }),

  add: protectedProcedure
    .input(z.object({
      entityId: z.string(),
      entityType: z.enum(["event", "signal", "situation"]),
      comment: z.string().min(1),
      tagUserIds: z.array(z.string()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const idField =
        input.entityType === "event"
          ? { eventId: input.entityId }
          : input.entityType === "signal"
            ? { signalId: input.entityId }
            : { situationId: input.entityId };
      const gqlInput = {
        comment: input.comment,
        tagUserIds: input.tagUserIds,
        ...idField,
      };
      const data = await graphqlFetch<{ addComment: GqlUserComment }>(
        ADD_COMMENT_MUTATION,
        { input: gqlInput },
        cookieHeaders(ctx),
      );
      return data.addComment;
    }),

  reply: protectedProcedure
    .input(z.object({
      repliedToCommentId: z.string(),
      comment: z.string().min(1),
      tagUserIds: z.array(z.string()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const data = await graphqlFetch<{ replyToComment: GqlUserComment }>(
        REPLY_TO_COMMENT_MUTATION,
        { input },
        cookieHeaders(ctx),
      );
      return data.replyToComment;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await graphqlFetch<{ deleteComment: boolean }>(
        DELETE_COMMENT_MUTATION,
        { id: input.id },
        cookieHeaders(ctx),
      );
    }),
});
