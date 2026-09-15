import { describe, expect, it } from "vitest";
import {
  attachmentKind,
  buildInboxEntries,
  countByFilter,
  intakeRef,
  moveSelection,
  nextSelection,
  visibleEntries,
} from "./hotline-inbox";
import type { GqlGroundInboxMessage, GqlGroundThread, GqlHotlineInbox } from "./types/graphql";

function thread(id: string, title: string | null = null): GqlGroundThread {
  return {
    id,
    groundSourceId: "src",
    title,
    lifecycleState: "reported",
    reviewState: "unverified",
    reviewedBy: null,
    reviewedAt: null,
    reviewNote: null,
    promotedSignalId: null,
    createdAt: "2026-09-15T10:00:00Z",
  };
}

function message(
  id: string,
  threadId: string,
  overrides: Partial<GqlGroundInboxMessage> = {},
): GqlGroundInboxMessage {
  return {
    id,
    groundSourceId: "src",
    externalId: `whatsapp:+1:${id}`,
    sentAt: "2026-09-15T10:00:00Z",
    senderRef: "h_3f9a2c7b1d0e",
    senderName: null,
    text: `text ${id}`,
    mediaKeys: [],
    mediaUrls: [],
    mediaRefs: [],
    omittedMediaCount: 0,
    classification: null,
    uncertainty: null,
    isEdited: false,
    threadId,
    ...overrides,
  };
}

const payload: GqlHotlineInbox = {
  sources: [],
  threads: [thread("t1", "Flooding in Kassala"), thread("t2"), thread("t3"), thread("empty")],
  messages: [
    message("m2", "t1", { sentAt: "2026-09-15T10:05:00Z", classification: "field_report", mediaUrls: ["https://s3/x/a.jpg", "https://s3/x/b.ogg?sig=1"] }),
    message("m1", "t1", { sentAt: "2026-09-15T10:00:00Z", text: "first\nline two" }),
    message("m3", "t2", { sentAt: "2026-09-15T11:00:00Z", senderRef: "h_ffffffffffff", classification: "chatter" }),
    message("m4", "t3", { sentAt: "2026-09-15T12:00:00Z", text: "  " }),
  ],
};

describe("intakeRef", () => {
  it("renders the pseudonym as HL-XXXXXX", () => {
    expect(intakeRef("h_3f9a2c7b1d0e")).toBe("HL-3F9A2C");
    expect(intakeRef("")).toBe("HL-?");
    expect(intakeRef(null)).toBe("HL-?");
  });
});

describe("attachmentKind", () => {
  it("detects voice notes by extension, ignoring the query string", () => {
    expect(attachmentKind("https://s3/x/b.ogg?sig=1")).toBe("voice");
    expect(attachmentKind("https://s3/x/a.jpg")).toBe("photo");
    expect(attachmentKind("https://s3/x/opaque")).toBe("photo");
  });
});

describe("buildInboxEntries", () => {
  const entries = buildInboxEntries(payload);

  it("makes one entry per thread with messages, sorted sent-ascending", () => {
    expect(entries.map((e) => e.id)).toEqual(["t1", "t2", "t3"]);
    expect(entries[0]!.messages.map((m) => m.id)).toEqual(["m1", "m2"]);
    expect(entries[0]!.sentAt).toBe("2026-09-15T10:05:00Z");
  });

  it("uses the latest labeled message as the entry classification", () => {
    expect(entries[0]!.classification).toBe("field_report");
    expect(entries[1]!.classification).toBe("chatter");
    expect(entries[2]!.classification).toBe("unclassified");
  });

  it("joins message texts into the narrative and falls back to the first line as title", () => {
    expect(entries[0]!.title).toBe("Flooding in Kassala");
    expect(entries[0]!.text).toBe("first\nline two\n\ntext m2");
    expect(entries[1]!.title).toBe("text m3");
    expect(entries[2]!.text).toBe("");
  });

  it("flattens attachments and counts prior entries per pseudonym", () => {
    expect(entries[0]!.attachments).toEqual([
      { url: "https://s3/x/a.jpg", kind: "photo" },
      { url: "https://s3/x/b.ogg?sig=1", kind: "voice" },
    ]);
    // t1 and t3 share a senderRef; t2 does not.
    expect(entries[0]!.priorEntries).toBe(1);
    expect(entries[1]!.priorEntries).toBe(0);
    expect(entries[2]!.priorEntries).toBe(1);
  });
});

describe("visibleEntries / countByFilter", () => {
  const entries = buildInboxEntries(payload);

  it("filters by class and searches title, text and intake ref", () => {
    expect(visibleEntries(entries, "reports", "", "reportsFirst").map((e) => e.id)).toEqual(["t1"]);
    expect(visibleEntries(entries, "all", "hl-ffff", "newest").map((e) => e.id)).toEqual(["t2"]);
    expect(visibleEntries(entries, "all", "kassala", "newest").map((e) => e.id)).toEqual(["t1"]);
  });

  it("sorts reports first, then unclassified, then chatter; newest within a class", () => {
    expect(visibleEntries(entries, "all", "", "reportsFirst").map((e) => e.id)).toEqual(["t1", "t3", "t2"]);
    expect(visibleEntries(entries, "all", "", "newest").map((e) => e.id)).toEqual(["t3", "t2", "t1"]);
  });

  it("counts per filter", () => {
    expect(countByFilter(entries)).toEqual({ reports: 1, unclassified: 1, chatter: 1, all: 3 });
  });
});

describe("selection helpers", () => {
  const visible = buildInboxEntries(payload);

  it("advances to the next entry, else the previous, else null", () => {
    expect(nextSelection(visible, "t1")).toBe("t2");
    expect(nextSelection(visible, "t3")).toBe("t2");
    expect(nextSelection(visible.slice(0, 1), "t1")).toBeNull();
  });

  it("moves J/K within bounds and starts at the top when nothing is selected", () => {
    expect(moveSelection(visible, null, 1)).toBe("t1");
    expect(moveSelection(visible, "t1", -1)).toBe("t1");
    expect(moveSelection(visible, "t1", 1)).toBe("t2");
    expect(moveSelection(visible, "t3", 1)).toBe("t3");
    expect(moveSelection([], "t1", 1)).toBeNull();
  });
});
