/**
 * Mastra memory storage backed by clear-api Conversations (ADR-0009 in
 * clear-api, ADR-0006 here).
 *
 * One instance per request, bound to the signed-in user's Cookie: every read
 * and write goes through clear-api GraphQL as that user, so clear-api decides
 * what the Agent may see or change. Never `@mastra/pg`, never the database.
 *
 * Reads that need Mastra's paging/windowing semantics fetch the Thread's rows
 * and let Mastra's own in-memory reference store answer the query, so the
 * behaviour matches the reference by construction instead of by
 * re-implementation. Threads are short; if they grow, push `first`/`before`
 * windows down to clear-api instead.
 *
 * Conversations are an audit record: nothing here deletes.
 *
 * Interface verified against @mastra/core 1.73. Mastra changes it between
 * minors — the contract tests catch drift on upgrade.
 */

import "server-only";
import type { MastraDBMessage, StorageThreadType } from "@mastra/core/memory";
import {
  InMemoryDB,
  InMemoryMemory,
  MemoryStorage,
  type StorageListMessagesInput,
  type StorageListMessagesOutput,
  type StorageListThreadsInput,
  type StorageListThreadsOutput,
} from "@mastra/core/storage";
import type {
  ConversationMessageRow,
  ConversationRow,
  ConversationsApi,
} from "~/server/agent/conversations";

/** myConversations returns at most 100 per page. */
const THREADS_PAGE = 100;

type UpdateMessagesArgs = Parameters<MemoryStorage["updateMessages"]>[0];

export class ClearApiMemoryStorage extends MemoryStorage {
  readonly supportsPartialThreadUpdate = true;

  constructor(
    private readonly api: ConversationsApi,
    /** The signed-in user: Mastra's "resource" is always this id. */
    private readonly userId: string,
  ) {
    super();
  }

  // ── Threads ───────────────────────────────────────────────────────────

  async getThreadById({ threadId }: { threadId: string }): Promise<StorageThreadType | null> {
    const row = await this.api.get(threadId);
    return row ? toThread(row) : null;
  }

  async saveThread({ thread }: { thread: StorageThreadType }): Promise<StorageThreadType> {
    this.assertOwnResource(thread.resourceId);
    const row = await this.api.upsert({
      id: thread.id,
      title: thread.title ?? null,
      metadata: thread.metadata ?? null,
      createdAt: toIso(thread.createdAt),
    });
    return toThread(row);
  }

  async updateThread({
    id,
    title,
    metadata,
  }: {
    id: string;
    title?: string;
    metadata?: Record<string, unknown>;
  }): Promise<StorageThreadType> {
    const row = await this.api.upsert({
      id,
      ...(title !== undefined ? { title } : {}),
      ...(metadata !== undefined ? { metadata } : {}),
    });
    return toThread(row);
  }

  async deleteThread(): Promise<void> {
    throw new Error("Conversations are an audit record and are never deleted");
  }

  async listThreads(args: StorageListThreadsInput): Promise<StorageListThreadsOutput> {
    const { resourceId } = args.filter ?? {};
    // Only the caller's own Threads exist from here; asking for anyone
    // else's is an empty list, not an error.
    const rows = resourceId && resourceId !== this.userId ? [] : await this.allThreadRows();
    const reference = this.reference();
    for (const row of rows) await reference.saveThread({ thread: toThread(row) });
    return reference.listThreads({ ...args, filter: { ...args.filter, resourceId: this.userId } });
  }

  // ── Messages ──────────────────────────────────────────────────────────

  async listMessages(args: StorageListMessagesInput): Promise<StorageListMessagesOutput> {
    const threadIds = Array.isArray(args.threadId) ? args.threadId : [args.threadId];
    const reference = this.reference();
    for (const threadId of threadIds) {
      const loaded = await this.api.getWithMessages(threadId);
      if (!loaded) continue;
      await reference.saveThread({ thread: toThread(loaded.conversation) });
      if (loaded.messages.length) {
        await reference.saveMessages({
          messages: loaded.messages.map((m) => toMessage(m, this.userId)),
        });
      }
    }
    return reference.listMessages(args);
  }

  async listMessagesById({
    messageIds,
  }: {
    messageIds: string[];
  }): Promise<{ messages: MastraDBMessage[] }> {
    if (!messageIds.length) return { messages: [] };
    const rows = await this.api.messagesByIds(messageIds);
    return { messages: rows.map((m) => toMessage(m, this.userId)) };
  }

  async saveMessages({
    messages,
  }: {
    messages: MastraDBMessage[];
  }): Promise<{ messages: MastraDBMessage[] }> {
    const byThread = new Map<string, MastraDBMessage[]>();
    for (const message of messages) {
      if (!message.threadId) throw new Error(`Message ${message.id} has no thread`);
      this.assertOwnResource(message.resourceId);
      byThread.set(message.threadId, [...(byThread.get(message.threadId) ?? []), message]);
    }
    for (const [threadId, batch] of byThread) {
      await this.api.upsertMessages(threadId, batch.map(toMessageInput));
    }
    return { messages };
  }

  async updateMessages(args: UpdateMessagesArgs): Promise<MastraDBMessage[]> {
    // Apply Mastra's partial-update rules (metadata merge, thread moves) on
    // the reference store over the current rows, then write back the result.
    const current = await this.api.messagesByIds(args.messages.map((m) => m.id));
    const reference = this.reference();
    for (const threadId of new Set(current.map((m) => m.conversationId))) {
      await reference.saveThread({
        thread: { id: threadId, resourceId: this.userId, createdAt: new Date(), updatedAt: new Date() },
      });
    }
    await reference.saveMessages({ messages: current.map((m) => toMessage(m, this.userId)) });
    const updated = await reference.updateMessages(args);
    await this.saveMessages({ messages: updated });
    return updated;
  }

  async deleteMessages(): Promise<void> {
    throw new Error("Conversations are an audit record and are never deleted");
  }

  async dangerouslyClearAll(): Promise<void> {
    throw new Error("Conversations are an audit record and are never deleted");
  }

  // ── Helpers ───────────────────────────────────────────────────────────

  /** A fresh, empty Mastra reference store for one query. */
  private reference(): InMemoryMemory {
    return new InMemoryMemory({ db: new InMemoryDB() });
  }

  private async allThreadRows(): Promise<ConversationRow[]> {
    const rows: ConversationRow[] = [];
    let after: string | undefined;
    for (;;) {
      const page = await this.api.list(THREADS_PAGE, after);
      rows.push(...page);
      if (page.length < THREADS_PAGE) return rows;
      after = page[page.length - 1]!.cursor;
    }
  }

  /** Mastra's resource is always the session user; anything else is a bug. */
  private assertOwnResource(resourceId: string | undefined): void {
    if (resourceId && resourceId !== this.userId) {
      throw new Error("The CLEAR Agent only stores Threads for the signed-in user");
    }
  }
}

function toIso(value: Date | string | undefined): string | undefined {
  if (!value) return undefined;
  return (value instanceof Date ? value : new Date(value)).toISOString();
}

function toThread(row: ConversationRow): StorageThreadType {
  return {
    id: row.id,
    resourceId: row.userId,
    title: row.title ?? undefined,
    metadata: row.metadata ?? undefined,
    createdAt: new Date(row.createdAt),
    updatedAt: new Date(row.updatedAt),
  };
}

function toMessage(row: ConversationMessageRow, userId: string): MastraDBMessage {
  return {
    id: row.id,
    threadId: row.conversationId,
    resourceId: userId,
    role: row.role as MastraDBMessage["role"],
    ...(row.type ? { type: row.type } : {}),
    content: row.content as MastraDBMessage["content"],
    createdAt: new Date(row.createdAt),
  };
}

function toMessageInput(message: MastraDBMessage) {
  return {
    id: message.id,
    role: message.role,
    type: message.type ?? null,
    content: message.content,
    createdAt: toIso(message.createdAt),
  };
}
