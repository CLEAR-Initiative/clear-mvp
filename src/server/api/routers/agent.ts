import { z } from "zod";
import { toAISdkMessages } from "@mastra/ai-sdk/ui";
import type { MastraDBMessage } from "@mastra/core/memory";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { graphqlFetch, cookieHeaders } from "~/server/api/graphql";

/**
 * The Agent page's history: the signed-in user's Conversations with the
 * CLEAR Agent, read from clear-api as that user. Turns themselves are
 * written by /api/agent, never here.
 */

const PAGE_SIZE = 30;

interface GqlConversationSummary {
  id: string;
  title: string | null;
  createdAt: string;
  updatedAt: string;
  cursor: string;
}

interface GqlConversationMessage {
  id: string;
  conversationId: string;
  role: string;
  type: string | null;
  content: unknown;
  createdAt: string;
}

export const agentRouter = createTRPCRouter({
  /** Your Conversations, most recently active first, a page at a time. */
  listConversations: protectedProcedure
    .input(z.object({ cursor: z.string().max(512).nullish() }).optional())
    .query(async ({ ctx, input }) => {
      const data = await graphqlFetch<{ myConversations: GqlConversationSummary[] }>(
        `query($first: Int, $after: String) {
          myConversations(first: $first, after: $after) { id title createdAt updatedAt cursor }
        }`,
        { first: PAGE_SIZE, after: input?.cursor ?? undefined },
        cookieHeaders(ctx),
      );
      const items = data.myConversations;
      return {
        items,
        nextCursor: items.length === PAGE_SIZE ? items[items.length - 1]!.cursor : null,
      };
    }),

  /** One of your Conversations as `useChat` messages, or null if none. */
  getConversation: protectedProcedure
    .input(z.object({ id: z.string().min(1).max(128) }))
    .query(async ({ ctx, input }) => {
      const data = await graphqlFetch<{
        conversation: { id: string; title: string | null; messages: GqlConversationMessage[] } | null;
      }>(
        `query($id: String!) {
          conversation(id: $id) {
            id title messages { id conversationId role type content createdAt }
          }
        }`,
        { id: input.id },
        cookieHeaders(ctx),
      );
      const conversation = data.conversation;
      if (!conversation) return null;
      const stored: MastraDBMessage[] = conversation.messages.map((m) => ({
        id: m.id,
        threadId: m.conversationId,
        role: m.role as MastraDBMessage["role"],
        ...(m.type ? { type: m.type } : {}),
        content: m.content as MastraDBMessage["content"],
        createdAt: new Date(m.createdAt),
      }));
      return {
        id: conversation.id,
        title: conversation.title,
        messages: toAISdkMessages(stored, { version: "v7" }),
      };
    }),
});
