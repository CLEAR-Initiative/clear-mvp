import { describe, expect, it } from "vitest";
import {
  attachmentKey,
  attachmentKind,
  buildInboxEntries,
  combineTranslations,
  countByFilter,
  entryDescription,
  intakeRef,
  moveSelection,
  needsTranslation,
  nextSelection,
  visibleEntries,
} from "./hotline-inbox";
import type { GqlGroundInboxMessage, GqlGroundInboxThread, GqlHotlineInbox } from "./types/graphql";

function thread(id: string, title: string | null = null): GqlGroundInboxThread {
  return {
    id,
    groundSourceId: "src",
    title,
    lifecycleState: "reported",
    reviewState: "unverified",
    reviewedBy: null,
    reviewedAt: null,
    reviewNote: null,
    rejectReason: null,
    promotedSignalId: null,
    createdAt: "2026-09-15T10:00:00Z",
    draftTitle: null,
    draftSeverity: null,
    draftLocationId: null,
    draftDisasterType: null,
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
    text: `text ${id}`,
    mediaKeys: [],
    mediaUrls: [],
    mediaRefs: [],
    omittedMediaCount: 0,
    classification: null,
    uncertainty: null,
    isEdited: false,
    threadId,
    hasVoice: false,
    transcript: null,
    language: null,
    ...overrides,
  };
}

const payload: GqlHotlineInbox = {
  sources: [],
  threads: [thread("t1", "Flooding in Kassala"), thread("t2"), thread("t3"), thread("empty")],
  messages: [
    message("m2", "t1", {
      sentAt: "2026-09-15T10:05:00Z",
      classification: "field_report",
      mediaUrls: ["https://s3/x/a.jpg", "https://s3/x/b.ogg?sig=1"],
      hasVoice: true,
      transcript: "  The bridge on the market road is under water.  ",
    }),
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
  it("only finds voice notes on messages flagged hasVoice", () => {
    expect(attachmentKind("https://s3/x/b.ogg?sig=1", false)).toBe("photo");
    expect(attachmentKind("https://s3/x/b.ogg?sig=1", true)).toBe("voice");
    // No extension to go on: hasVoice decides.
    expect(attachmentKind("https://s3/x/opaque", true)).toBe("voice");
    expect(attachmentKind("https://s3/x/opaque", false)).toBe("photo");
    // A photo sent alongside a voice note stays a photo.
    expect(attachmentKind("https://s3/x/a.JPG?sig=1", true)).toBe("photo");
    // Video and PDF sent alongside a voice note don't get an audio player,
    // but audio/mp4 voice notes (.m4a) still do.
    expect(attachmentKind("https://s3/x/clip.mp4?sig=1", true)).toBe("photo");
    expect(attachmentKind("https://s3/x/doc.pdf?sig=1", true)).toBe("photo");
    expect(attachmentKind("https://s3/x/note.m4a?sig=1", true)).toBe("voice");
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
      {
        url: "https://s3/x/b.ogg?sig=1",
        kind: "voice",
        transcript: { status: "ready", text: "The bridge on the market road is under water." },
      },
    ]);
    expect(entries[0]!.transcripts).toEqual(["The bridge on the market road is under water."]);
    expect(entries[0]!.detachedTranscripts).toEqual([]);
    // t1 and t3 share a senderRef; t2 does not.
    expect(entries[0]!.priorEntries).toBe(1);
    expect(entries[1]!.priorEntries).toBe(0);
    expect(entries[2]!.priorEntries).toBe(1);
  });
});

describe("voice transcripts", () => {
  const build = (messages: GqlGroundInboxMessage[]) =>
    buildInboxEntries({ sources: [], threads: [thread("v")], messages })[0]!;

  it("marks a voice note without a transcript as pending", () => {
    const e = build([message("v1", "v", { hasVoice: true, mediaUrls: ["https://s3/v.ogg"] })]);
    expect(e.attachments).toEqual([{ url: "https://s3/v.ogg", kind: "voice", transcript: { status: "pending" } }]);
    expect(e.transcripts).toEqual([]);
  });

  it("puts one transcript per message on its last voice attachment", () => {
    const e = build([
      message("v1", "v", { hasVoice: true, transcript: "both notes", mediaUrls: ["https://s3/1.ogg", "https://s3/2.ogg"] }),
    ]);
    expect(e.attachments[0]!.transcript).toBeUndefined();
    expect(e.attachments[1]!.transcript).toEqual({ status: "ready", text: "both notes" });
  });

  it("keeps transcripts of voice messages whose audio is not stored yet", () => {
    const e = build([
      message("v1", "v", { hasVoice: true, mediaUrls: [] }),
      message("v2", "v", { hasVoice: true, transcript: "stored later", mediaUrls: [], sentAt: "2026-09-15T11:00:00Z" }),
    ]);
    expect(e.attachments).toEqual([]);
    expect(e.detachedTranscripts).toEqual([{ status: "pending" }, { status: "ready", text: "stored later" }]);
  });

  it("ignores transcripts on messages without a voice note", () => {
    const e = build([message("v1", "v", { transcript: "stray", mediaUrls: ["https://s3/x.ogg"] })]);
    expect(e.attachments).toEqual([{ url: "https://s3/x.ogg", kind: "photo" }]);
    expect(e.transcripts).toEqual([]);
  });

  it("folds labelled transcripts into the modal description, per message in order", () => {
    const e = build([
      message("v1", "v", { text: "Road blocked.", sentAt: "2026-09-15T10:00:00Z" }),
      message("v2", "v", { text: "", hasVoice: true, transcript: "People are stuck.", sentAt: "2026-09-15T10:01:00Z" }),
      message("v3", "v", { text: "", hasVoice: true, sentAt: "2026-09-15T10:02:00Z" }),
    ]);
    expect(entryDescription(e, (text) => `[MT] ${text}`)).toBe("Road blocked.\n\n[MT] People are stuck.");
  });

  it("searches transcripts", () => {
    const e = build([message("v1", "v", { text: "", hasVoice: true, transcript: "Checkpoint closed" })]);
    expect(visibleEntries([e], "all", "checkpoint", "newest")).toHaveLength(1);
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

describe("attachmentKey", () => {
  it("is stable across re-presigned URLs for the same object", () => {
    expect(attachmentKey("https://s3/x/b.ogg?X-Amz-Signature=one")).toBe("https://s3/x/b.ogg");
    expect(attachmentKey("https://s3/x/b.ogg?X-Amz-Signature=two")).toBe("https://s3/x/b.ogg");
    expect(attachmentKey("https://s3/x/c.jpg")).toBe("https://s3/x/c.jpg");
  });
});

describe("translation helpers", () => {
  const ready = (text: string) => ({ status: "ready" as const, text });
  const queued = { status: "queued" as const, text: null };
  const unavailable = { status: "unavailable" as const, text: null };

  it("combineTranslations is ready only once every message is, joined like the entry text", () => {
    expect(combineTranslations([ready(" Shelling "), ready("Where")])).toEqual(ready("Shelling\n\nWhere"));
    expect(combineTranslations([ready("Shelling"), queued])).toEqual(queued);
    expect(combineTranslations([ready("Shelling"), unavailable])).toEqual(unavailable);
    expect(combineTranslations([])).toEqual(unavailable);
  });

  it("needsTranslation skips entries already entirely in the reader's locale", () => {
    const [entry] = buildInboxEntries({
      sources: [],
      threads: [thread("t1")],
      messages: [
        message("m1", "t1", { text: "قصف", language: "ar" }),
        message("m2", "t1", { text: "", language: null }), // media-only, ignored
      ],
    });
    expect(needsTranslation(entry!, "ar")).toBe(false);
    expect(needsTranslation(entry!, "en")).toBe(true);
    // Unknown language → offer it.
    expect(needsTranslation({ ...entry!, messages: [message("m3", "t1", { text: "x" })] }, "ar")).toBe(true);
    // No text at all → nothing to translate.
    expect(needsTranslation({ ...entry!, messages: [message("m4", "t1", { text: " " })] }, "en")).toBe(false);
  });
});
