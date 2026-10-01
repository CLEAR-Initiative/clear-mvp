/**
 * Test doubles for the CLEAR Agent's seams: an in-memory clear-api that
 * answers the Conversation GraphQL operations with clear-api's ownership
 * rules, and a scripted model from `ai/test`.
 *
 * The fake keys callers by Cookie, so tests can prove that every call carries
 * the right user's session and that one user can't reach another's Thread.
 */

import { MockLanguageModelV3, convertArrayToReadableStream } from "ai/test";

interface Row {
  id: string;
  userId: string;
  title: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

interface MessageRow {
  id: string;
  conversationId: string;
  role: string;
  type: string | null;
  content: unknown;
  createdAt: string;
  model?: string;
  inputTokens?: number;
  outputTokens?: number;
  costUsd?: number;
  latencyMs?: number;
}

export interface GraphQLCall {
  query: string;
  variables: Record<string, unknown>;
  cookie: string | null;
}

class GraphQLFailure extends Error {
  constructor(
    message: string,
    readonly code: string,
  ) {
    super(message);
  }
}

const cursorOf = (r: Row) => Buffer.from(`${r.updatedAt}|${r.id}`).toString("base64url");

export function createFakeClearApi(usersByCookie: Record<string, string>) {
  const conversations = new Map<string, Row>();
  const messages = new Map<string, MessageRow>();
  const calls: GraphQLCall[] = [];
  const workingMemory = new Map<
    string,
    { userId: string; workingMemory: string | null; metadata: unknown; createdAt: string; updatedAt: string }
  >();
  const budget = { limitUsd: 2, spentTodayUsd: 0, resetsAt: "2026-10-02T00:00:00.000Z" };
  let clock = Date.parse("2026-10-01T08:00:00.000Z");
  const now = () => new Date((clock += 1000)).toISOString();

  const withCursor = (r: Row) => ({ ...r, cursor: cursorOf(r) });
  const messagesOf = (id: string) =>
    [...messages.values()]
      .filter((m) => m.conversationId === id)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));

  function userFor(cookie: string | null): string {
    const token = cookie?.match(/session_token=([^;]+)/)?.[1];
    const user = token ? usersByCookie[token] : undefined;
    if (!user) throw new GraphQLFailure("You must be logged in", "UNAUTHENTICATED");
    return user;
  }

  function ownConversation(user: string, id: string): Row {
    const row = conversations.get(id);
    if (!row) throw new GraphQLFailure("Conversation not found", "NOT_FOUND");
    if (row.userId !== user) throw new GraphQLFailure("Only the owner", "FORBIDDEN");
    return row;
  }

  function execute(query: string, v: Record<string, unknown>, cookie: string | null) {
    const user = userFor(cookie);

    if (query.includes("upsertConversationMessages(")) {
      const id = v.conversationId as string;
      const row = ownConversation(user, id);
      for (const m of v.messages as MessageRow[]) {
        const existing = messages.get(m.id);
        if (existing && existing.conversationId !== id) {
          throw new GraphQLFailure("Message belongs to another Conversation", "FORBIDDEN");
        }
        if (existing?.costUsd !== undefined) {
          throw new GraphQLFailure("Recorded Answer can't change", "FORBIDDEN");
        }
        messages.set(m.id, {
          ...existing,
          id: m.id,
          conversationId: id,
          role: m.role,
          type: m.type ?? null,
          content: m.content,
          createdAt: m.createdAt ?? existing?.createdAt ?? now(),
        });
      }
      row.updatedAt = now();
      return { upsertConversationMessages: (v.messages as MessageRow[]).map((m) => ({ id: m.id })) };
    }
    if (query.includes("upsertConversation(")) {
      const input = v.input as Partial<Row> & { id: string };
      const existing = conversations.get(input.id);
      if (existing && existing.userId !== user) {
        throw new GraphQLFailure("Belongs to another user", "FORBIDDEN");
      }
      const row: Row = existing ?? {
        id: input.id,
        userId: user,
        title: null,
        metadata: null,
        createdAt: input.createdAt ?? now(),
        updatedAt: now(),
      };
      if (input.title !== undefined) row.title = input.title;
      if (input.metadata !== undefined) row.metadata = input.metadata;
      conversations.set(row.id, row);
      return { upsertConversation: withCursor(row) };
    }
    if (query.includes("recordConversationTurnUsage(")) {
      const message = messages.get(v.messageId as string);
      if (!message) throw new GraphQLFailure("Message not found", "NOT_FOUND");
      ownConversation(user, message.conversationId);
      if (message.costUsd !== undefined) throw new GraphQLFailure("Already recorded", "FORBIDDEN");
      Object.assign(message, v.usage);
      budget.spentTodayUsd += (v.usage as { costUsd: number }).costUsd;
      return { recordConversationTurnUsage: { id: message.id } };
    }
    if (query.includes("conversationMessagesByIds(")) {
      const ids = new Set(v.ids as string[]);
      return {
        conversationMessagesByIds: [...messages.values()].filter(
          (m) => ids.has(m.id) && conversations.get(m.conversationId)?.userId === user,
        ),
      };
    }
    if (query.includes("myConversations(")) {
      const rows = [...conversations.values()]
        .filter((r) => r.userId === user)
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt) || b.id.localeCompare(a.id));
      const after = v.after as string | undefined;
      const start = after ? rows.findIndex((r) => cursorOf(r) === after) + 1 : 0;
      const page = rows.slice(start, start + ((v.first as number | undefined) ?? 20));
      return {
        myConversations: page.map((r) =>
          query.includes("messages") ? { ...withCursor(r), messages: messagesOf(r.id) } : withCursor(r),
        ),
      };
    }
    if (query.includes("conversation(")) {
      const row = conversations.get(v.id as string);
      if (!row) return { conversation: null };
      if (row.userId !== user) throw new GraphQLFailure("Belongs to another user", "FORBIDDEN");
      return {
        conversation: query.includes("messages")
          ? { ...withCursor(row), messages: messagesOf(row.id) }
          : withCursor(row),
      };
    }
    if (query.includes("saveAgentWorkingMemory(")) {
      const input = v.input as { workingMemory?: string | null; metadata?: unknown };
      const existing = workingMemory.get(user);
      const at = now();
      const row = {
        userId: user,
        workingMemory: existing?.workingMemory ?? null,
        metadata: existing?.metadata ?? null,
        createdAt: existing?.createdAt ?? at,
        updatedAt: at,
      };
      if (input.workingMemory !== undefined) row.workingMemory = input.workingMemory;
      if (input.metadata !== undefined) row.metadata = input.metadata;
      workingMemory.set(user, row);
      return { saveAgentWorkingMemory: row };
    }
    if (query.includes("myAgentWorkingMemory")) {
      return { myAgentWorkingMemory: workingMemory.get(user) ?? null };
    }
    if (query.includes("myAgentBudget")) {
      return { myAgentBudget: { ...budget } };
    }
    throw new Error(`fake clear-api: unhandled operation ${query.slice(0, 80)}`);
  }

  return {
    conversations,
    messages,
    calls,
    workingMemory,
    /** The caller's Agent budget; mutate to simulate spend. */
    budget,
    /** Answer one GraphQL HTTP request. */
    async handle(init: RequestInit | undefined): Promise<Response> {
      const { query, variables = {} } = JSON.parse(init?.body as string) as {
        query: string;
        variables?: Record<string, unknown>;
      };
      const cookie = new Headers(init?.headers).get("cookie");
      calls.push({ query, variables, cookie });
      try {
        return Response.json({ data: execute(query, variables, cookie) });
      } catch (err) {
        if (err instanceof GraphQLFailure) {
          return Response.json({
            data: null,
            errors: [{ message: err.message, extensions: { code: err.code } }],
          });
        }
        throw err;
      }
    },
    messagesOf,
  };
}

export type FakeClearApi = ReturnType<typeof createFakeClearApi>;

/** One model step: either call tools or answer in text. */
export type ScriptedStep =
  | { toolCalls: Array<{ name: string; input: Record<string, unknown> }> }
  | { text: string };

export const SCRIPTED_USAGE = {
  inputTokens: { total: 1_000, noCache: 1_000, cacheRead: 0, cacheWrite: 0 },
  outputTokens: { total: 200, text: 200, reasoning: 0 },
};

/**
 * A model that plays `steps` in order, one per model call, and records the
 * prompt it was given each time (to assert what history it saw).
 */
export function createScriptedModel(steps: ScriptedStep[]) {
  const prompts: unknown[] = [];
  let next = 0;
  const model = new MockLanguageModelV3({
    doStream: async (options) => {
      prompts.push(options.prompt);
      const step = steps[next++] ?? { text: "(no more scripted steps)" };
      const parts: unknown[] = [{ type: "stream-start", warnings: [] }];
      if ("toolCalls" in step) {
        step.toolCalls.forEach((call, i) =>
          parts.push({
            type: "tool-call",
            toolCallId: `call-${next}-${i}`,
            toolName: call.name,
            input: JSON.stringify(call.input),
          }),
        );
        parts.push({ type: "finish", finishReason: { unified: "tool-calls", raw: "tool_use" }, usage: SCRIPTED_USAGE });
      } else {
        parts.push(
          { type: "text-start", id: `text-${next}` },
          { type: "text-delta", id: `text-${next}`, delta: step.text },
          { type: "text-end", id: `text-${next}` },
          { type: "finish", finishReason: { unified: "stop", raw: "end_turn" }, usage: SCRIPTED_USAGE },
        );
      }
      return { stream: convertArrayToReadableStream(parts as never[]) };
    },
  });
  return { model, prompts };
}

/** Parse an AI SDK UI message stream (SSE) into its chunks. */
export function parseUIMessageStream(body: string): Array<Record<string, unknown>> {
  return body
    .split("\n")
    .filter((line) => line.startsWith("data: ") && line !== "data: [DONE]")
    .map((line) => JSON.parse(line.slice(6)) as Record<string, unknown>);
}

/** An NRC Find NDJSON answer. */
export function nrcFindResponse(answer: string, documents: Array<{ title: string; content: string }>) {
  return new Response(
    [
      JSON.stringify({ user_prompt: "q", source_documents: documents.map((d, i) => ({ ...d, source_id: i + 1 })) }),
      ...answer.split(" ").map((word, i) => JSON.stringify({ type: "answer", content: (i ? " " : "") + word })),
    ].join("\n") + "\n",
    { status: 200, headers: { "Content-Type": "application/x-ndjson" } },
  );
}
