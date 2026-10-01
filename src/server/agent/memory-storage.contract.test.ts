// @vitest-environment node
/**
 * Memory adapter contract (ADR-0009 in clear-api).
 *
 * One suite, two stores: Mastra's in-memory reference store and
 * ClearApiMemoryStorage over a fake clear-api. Both must behave the same
 * for everything the CLEAR Agent relies on, so a Mastra upgrade that changes
 * the storage interface or its semantics fails here, not in production.
 *
 * Deletes are deliberately out of the contract: Conversations are an audit
 * record, and the adapter refuses them (tested separately below).
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { MastraDBMessage, StorageThreadType } from "@mastra/core/memory";
import { InMemoryDB, InMemoryMemory, type MemoryStorage } from "@mastra/core/storage";
import { createConversationsApi } from "~/server/agent/conversations";
import { ClearApiMemoryStorage } from "~/server/agent/memory-storage";
import { createFakeClearApi, FAKE_AGENT_KEY } from "~/server/agent/testing/fake-clear-api";

vi.mock("server-only", () => ({}));

const USER = "u-alice";
const COOKIE = "better-auth.session_token=alice";

const stores: Array<[string, () => MemoryStorage]> = [
  ["Mastra InMemoryMemory (reference)", () => new InMemoryMemory({ db: new InMemoryDB() })],
  [
    "ClearApiMemoryStorage",
    () => {
      const fake = createFakeClearApi({ alice: USER });
      vi.stubGlobal("fetch", (_url: string, init?: RequestInit) => fake.handle(init));
      vi.stubEnv("CLEAR_AGENT_API_KEY", FAKE_AGENT_KEY);
      return new ClearApiMemoryStorage(createConversationsApi(COOKIE), USER);
    },
  ],
];

const at = (minute: number) => new Date(Date.UTC(2026, 9, 1, 8, minute));

function thread(id: string, minute: number, extra: Partial<StorageThreadType> = {}): StorageThreadType {
  return { id, resourceId: USER, title: `Thread ${id}`, createdAt: at(minute), updatedAt: at(minute), ...extra };
}

function message(id: string, threadId: string, minute: number, text = id): MastraDBMessage {
  return {
    id,
    threadId,
    resourceId: USER,
    role: minute % 2 ? "assistant" : "user",
    type: "v2",
    createdAt: at(minute),
    content: { format: 2, parts: [{ type: "text", text }] },
  };
}

const ids = (rows: Array<{ id: string }>) => rows.map((r) => r.id);
const texts = (rows: MastraDBMessage[]) =>
  rows.map((m) => (m.content.parts[0] as { text: string }).text);

afterEach(() => vi.unstubAllGlobals());

describe.each(stores)("memory storage contract: %s", (_name, create) => {
  let store: MemoryStorage;

  beforeEach(() => {
    store = create();
  });

  describe("threads", () => {
    it("saves a thread and reads it back by id", async () => {
      await store.saveThread({ thread: thread("t1", 0, { metadata: { topic: "darfur" } }) });
      const read = await store.getThreadById({ threadId: "t1" });
      expect(read).toMatchObject({ id: "t1", resourceId: USER, title: "Thread t1", metadata: { topic: "darfur" } });
    });

    it("returns null for an unknown thread", async () => {
      expect(await store.getThreadById({ threadId: "nope" })).toBeNull();
    });

    it("updates title and metadata independently", async () => {
      await store.saveThread({ thread: thread("t1", 0, { metadata: { a: 1 } }) });
      await store.updateThread({ id: "t1", title: "Renamed" });
      let read = await store.getThreadById({ threadId: "t1" });
      expect(read?.title).toBe("Renamed");
      expect(read?.metadata).toEqual({ a: 1 });
      // Metadata merges into what the thread has.
      await store.updateThread({ id: "t1", metadata: { b: 2 } });
      read = await store.getThreadById({ threadId: "t1" });
      expect(read?.title).toBe("Renamed");
      expect(read?.metadata).toEqual({ a: 1, b: 2 });
    });

    it("lists the resource's threads with page metadata", async () => {
      for (const [id, minute] of [["t1", 0], ["t2", 1], ["t3", 2]] as const) {
        await store.saveThread({ thread: thread(id, minute) });
      }
      const page = await store.listThreads({ filter: { resourceId: USER }, perPage: 2, page: 0 });
      expect(page).toMatchObject({ total: 3, page: 0, perPage: 2, hasMore: true });
      expect(page.threads).toHaveLength(2);
      const all = await store.listThreads({ filter: { resourceId: USER }, perPage: false });
      expect(ids(all.threads).sort()).toEqual(["t1", "t2", "t3"]);
    });
  });

  describe("messages", () => {
    beforeEach(async () => {
      await store.saveThread({ thread: thread("t1", 0) });
      await store.saveMessages({
        messages: [0, 1, 2, 3, 4, 5].map((m) => message(`m${m}`, "t1", m)),
      });
    });

    it("lists a thread's messages oldest first by default", async () => {
      const { messages, total } = await store.listMessages({ threadId: "t1", perPage: false });
      expect(ids(messages)).toEqual(["m0", "m1", "m2", "m3", "m4", "m5"]);
      expect(total).toBe(6);
      expect(messages[0]).toMatchObject({ threadId: "t1", role: "user", type: "v2" });
      expect(messages[0]!.createdAt).toEqual(at(0));
    });

    it("loads the most recent window the way the Agent's history does", async () => {
      const recent = await store.listMessages({
        threadId: "t1",
        perPage: 3,
        page: 0,
        orderBy: { field: "createdAt", direction: "DESC" },
      });
      expect(texts(recent.messages).sort()).toEqual(["m3", "m4", "m5"]);
      expect(recent.hasMore).toBe(true);
    });

    it("pages oldest-first", async () => {
      const second = await store.listMessages({ threadId: "t1", perPage: 2, page: 1 });
      expect(ids(second.messages)).toEqual(["m2", "m3"]);
    });

    it("filters by date range", async () => {
      const ranged = await store.listMessages({
        threadId: "t1",
        perPage: false,
        filter: { dateRange: { start: at(2), end: at(4) } },
      });
      expect(ids(ranged.messages)).toEqual(["m2", "m3", "m4"]);
    });

    it("includes context around a requested message", async () => {
      const result = await store.listMessages({
        threadId: "t1",
        perPage: 0,
        include: [{ id: "m3", threadId: "t1", withPreviousMessages: 1, withNextMessages: 1 }],
      });
      expect(ids(result.messages).sort()).toEqual(["m2", "m3", "m4"]);
    });

    it("re-saving a message by id replaces it", async () => {
      await store.saveMessages({ messages: [message("m5", "t1", 5, "edited")] });
      const { messages } = await store.listMessages({ threadId: "t1", perPage: false });
      expect(messages).toHaveLength(6);
      expect(texts(messages).at(-1)).toBe("edited");
    });

    it("reads messages by id alone", async () => {
      const { messages } = await store.listMessagesById({ messageIds: ["m4", "m1"] });
      expect(ids(messages).sort()).toEqual(["m1", "m4"]);
    });

    it("updates a message's content metadata without losing its parts", async () => {
      // Mastra sends partial content here; its type demands the full shape.
      const partial = { metadata: { reviewed: true } } as unknown as MastraDBMessage["content"];
      await store.updateMessages({ messages: [{ id: "m2", content: partial }] });
      const { messages } = await store.listMessagesById({ messageIds: ["m2"] });
      expect(messages[0]!.content.metadata).toEqual({ reviewed: true });
      expect(texts(messages)).toEqual(["m2"]);
    });
  });

  describe("resource (working memory)", () => {
    it("has no resource until one is written", async () => {
      expect(await store.getResourceById({ resourceId: USER })).toBeNull();
    });

    it("creates on update, keeps working memory when omitted, and merges metadata", async () => {
      await store.updateResource({ resourceId: USER, workingMemory: "# Analyst\n- Sudan", metadata: { a: 1 } });
      await store.updateResource({ resourceId: USER, metadata: { b: 2 } });
      const resource = await store.getResourceById({ resourceId: USER });
      expect(resource).toMatchObject({
        id: USER,
        workingMemory: "# Analyst\n- Sudan",
        metadata: { a: 1, b: 2 },
      });
    });

    it("replaces the resource on save", async () => {
      await store.updateResource({ resourceId: USER, workingMemory: "old", metadata: { a: 1 } });
      await store.saveResource({
        resource: { id: USER, workingMemory: "new", metadata: { c: 3 }, createdAt: at(0), updatedAt: at(0) },
      });
      expect(await store.getResourceById({ resourceId: USER })).toMatchObject({
        workingMemory: "new",
        metadata: { c: 3 },
      });
    });
  });
});

describe("ClearApiMemoryStorage beyond the contract", () => {
  let store: ClearApiMemoryStorage;
  beforeEach(() => {
    store = stores[1]![1]() as ClearApiMemoryStorage;
  });

  it("never deletes: Conversations are an audit record", async () => {
    await expect(store.deleteThread({ threadId: "t1" })).rejects.toThrow(/never deleted/);
    await expect(store.deleteMessages(["m1"])).rejects.toThrow(/never deleted/);
  });

  it("refuses another user's Thread even when clear-api would serve it (admins)", async () => {
    const fake = createFakeClearApi({ admin: "u-admin" });
    vi.stubGlobal("fetch", (_url: string, init?: RequestInit) => fake.handle(init));
    vi.stubEnv("CLEAR_AGENT_API_KEY", FAKE_AGENT_KEY);
    fake.conversations.set("t-bob", {
      id: "t-bob",
      userId: "u-bob",
      title: null,
      metadata: null,
      createdAt: at(0).toISOString(),
      updatedAt: at(0).toISOString(),
    });
    // The fake serves the admin's own reads only by cookie user; serve Bob's
    // row as clear-api does for an admin.
    const api = createConversationsApi("better-auth.session_token=admin");
    api.get = async () => ({ ...fake.conversations.get("t-bob")!, cursor: "c" });
    const admin = new ClearApiMemoryStorage(api, "u-admin");
    await expect(admin.getThreadById({ threadId: "t-bob" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("only knows the signed-in user's resource", async () => {
    expect(await store.getResourceById({ resourceId: "u-bob" })).toBeNull();
    await expect(store.updateResource({ resourceId: "u-bob", workingMemory: "x" })).rejects.toThrow(
      /signed-in user/,
    );
    await expect(store.saveThread({ thread: { ...thread("t9", 0), resourceId: "u-bob" } })).rejects.toThrow(
      /signed-in user/,
    );
  });
});
