/**
 * clear-api's Conversation operations, as the CLEAR Agent's memory uses them.
 *
 * Every call carries two credentials (ADR-0009 in clear-api): the signed-in
 * user's Cookie, so clear-api enforces ownership, and the CLEAR Agent's own
 * key in `X-Clear-Agent-Key`, so clear-api knows the write comes from the
 * Agent and not from the user calling it directly. clear-api only accepts
 * Conversation writes that carry both.
 */

import "server-only";
import { graphqlFetch } from "~/server/api/graphql";

export interface ConversationRow {
  id: string;
  userId: string;
  title: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
  cursor: string;
}

export interface ConversationMessageRow {
  id: string;
  conversationId: string;
  role: string;
  type: string | null;
  content: unknown;
  createdAt: string;
}

export interface AgentBudget {
  limitUsd: number;
  spentTodayUsd: number;
  /** ISO time of the next reset (UTC midnight). */
  resetsAt: string;
}

export interface TurnUsage {
  model: string;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  latencyMs: number;
}

export interface WorkingMemoryRow {
  userId: string;
  workingMemory: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface ConversationMessageInput {
  id: string;
  role: string;
  type?: string | null;
  content: unknown;
  currentView?: unknown;
  createdAt?: string;
}

const CONVERSATION_FIELDS = `id userId title metadata createdAt updatedAt cursor`;
const MESSAGE_FIELDS = `id conversationId role type content createdAt`;

/** clear-api caps one upsertConversationMessages call at 200 messages. */
const MESSAGES_PER_CALL = 200;

/**
 * The CLEAR Agent's clear-api key (the `agent` service user's, minted by
 * clear-api's scripts/create-agent-user.ts). Server-only configuration.
 */
export function clearAgentApiKey(): string {
  const key = process.env.CLEAR_AGENT_API_KEY?.trim();
  if (!key) throw new Error("CLEAR_AGENT_API_KEY is not configured on the server.");
  return key;
}

export type ConversationsApi = ReturnType<typeof createConversationsApi>;

export function createConversationsApi(cookie: string) {
  const headers = { Cookie: cookie, "X-Clear-Agent-Key": clearAgentApiKey() };
  const gql = <T>(query: string, variables?: Record<string, unknown>) =>
    graphqlFetch<T>(query, variables, headers);

  return {
    async get(id: string): Promise<ConversationRow | null> {
      const data = await gql<{ conversation: ConversationRow | null }>(
        `query($id: String!) { conversation(id: $id) { ${CONVERSATION_FIELDS} } }`,
        { id },
      );
      return data.conversation;
    },

    /** The Conversation with every message, oldest first; null if none. */
    async getWithMessages(
      id: string,
    ): Promise<{ conversation: ConversationRow; messages: ConversationMessageRow[] } | null> {
      const data = await gql<{
        conversation: (ConversationRow & { messages: ConversationMessageRow[] }) | null;
      }>(
        `query($id: String!) {
          conversation(id: $id) { ${CONVERSATION_FIELDS} messages { ${MESSAGE_FIELDS} } }
        }`,
        { id },
      );
      if (!data.conversation) return null;
      const { messages, ...conversation } = data.conversation;
      return { conversation, messages };
    },

    async list(first: number, after?: string): Promise<ConversationRow[]> {
      const data = await gql<{ myConversations: ConversationRow[] }>(
        `query($first: Int, $after: String) {
          myConversations(first: $first, after: $after) { ${CONVERSATION_FIELDS} }
        }`,
        { first, after },
      );
      return data.myConversations;
    },

    async upsert(input: {
      id: string;
      title?: string | null;
      metadata?: Record<string, unknown> | null;
      createdAt?: string;
    }): Promise<ConversationRow> {
      const data = await gql<{ upsertConversation: ConversationRow }>(
        `mutation($input: UpsertConversationInput!) {
          upsertConversation(input: $input) { ${CONVERSATION_FIELDS} }
        }`,
        { input },
      );
      return data.upsertConversation;
    },

    async upsertMessages(
      conversationId: string,
      messages: ConversationMessageInput[],
    ): Promise<void> {
      for (let i = 0; i < messages.length; i += MESSAGES_PER_CALL) {
        await gql(
          `mutation($conversationId: String!, $messages: [ConversationMessageInput!]!) {
            upsertConversationMessages(conversationId: $conversationId, messages: $messages) { id }
          }`,
          { conversationId, messages: messages.slice(i, i + MESSAGES_PER_CALL) },
        );
      }
    },

    async workingMemory(): Promise<WorkingMemoryRow | null> {
      const data = await gql<{ myAgentWorkingMemory: WorkingMemoryRow | null }>(
        `query { myAgentWorkingMemory { userId workingMemory metadata createdAt updatedAt } }`,
      );
      return data.myAgentWorkingMemory;
    },

    async saveWorkingMemory(input: {
      workingMemory?: string | null;
      metadata?: Record<string, unknown> | null;
    }): Promise<WorkingMemoryRow> {
      const data = await gql<{ saveAgentWorkingMemory: WorkingMemoryRow }>(
        `mutation($input: SaveAgentWorkingMemoryInput!) {
          saveAgentWorkingMemory(input: $input) { userId workingMemory metadata createdAt updatedAt }
        }`,
        { input },
      );
      return data.saveAgentWorkingMemory;
    },

    async budget(): Promise<AgentBudget> {
      const data = await gql<{ myAgentBudget: AgentBudget }>(
        `query { myAgentBudget { limitUsd spentTodayUsd resetsAt } }`,
      );
      return data.myAgentBudget;
    },

    async recordTurnUsage(messageId: string, usage: TurnUsage): Promise<void> {
      await gql(
        `mutation($messageId: String!, $usage: ConversationTurnUsageInput!) {
          recordConversationTurnUsage(messageId: $messageId, usage: $usage) { id }
        }`,
        { messageId, usage },
      );
    },

    async messagesByIds(ids: string[]): Promise<ConversationMessageRow[]> {
      const rows: ConversationMessageRow[] = [];
      for (let i = 0; i < ids.length; i += MESSAGES_PER_CALL) {
        const data = await gql<{ conversationMessagesByIds: ConversationMessageRow[] }>(
          `query($ids: [String!]!) { conversationMessagesByIds(ids: $ids) { ${MESSAGE_FIELDS} } }`,
          { ids: ids.slice(i, i + MESSAGES_PER_CALL) },
        );
        rows.push(...data.conversationMessagesByIds);
      }
      return rows;
    },
  };
}
