import { describe, expect, it } from "vitest";
import {
  attachmentKey,
  attachmentKind,
  buildCaseGroupEntries,
  buildImpactPriorEntries,
  buildInboxEntries,
  buildTaskEntries,
  combineTranslations,
  countByFilter,
  entryDescription,
  filtersFor,
  intakeRef,
  isReviewItem,
  matchesFilter,
  messageFailures,
  moveSelection,
  needsTranslation,
  shownTranslation,
  TRANSLATION_POLL_LIMIT_MS,
  nextSelection,
  visibleEntries,
  withDecision,
} from "./hotline-inbox";
import type {
  GqlGroundInboxMessage,
  GqlGroundInboxThread,
  GqlHotlineInbox,
  GqlReviewCaseProposal,
  GqlReviewImpactPrior,
  GqlTask,
} from "./types/graphql";

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
    enrichFailedAt: null,
    enrichError: null,
    transcribeFailedAt: null,
    transcribeError: null,
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

describe("pipeline processing state", () => {
  const build = (messages: GqlGroundInboxMessage[]) =>
    buildInboxEntries({ sources: [], threads: [thread("p")], messages })[0]!;
  const FAILED_AT = "2026-09-15T12:00:00Z";

  it("is pending while an unlabeled message is still queued", () => {
    const e = build([message("p1", "p")]);
    expect(e.classification).toBe("unclassified");
    expect(e.processing).toBe("pending");
    expect(e.failures).toEqual([]);
  });

  it("is classified once a message is labeled", () => {
    const e = build([message("p1", "p", { classification: "chatter" })]);
    expect(e.processing).toBe("classified");
    expect(e.failures).toEqual([]);
  });

  it("is failed when the enrichment drain gave up, and carries the error", () => {
    const e = build([
      message("p1", "p", { enrichFailedAt: FAILED_AT, enrichError: "Claude API timeout" }),
    ]);
    expect(e.classification).toBe("unclassified");
    expect(e.processing).toBe("failed");
    expect(e.failures).toEqual([
      { messageId: "p1", stage: "ENRICH", error: "Claude API timeout", failedAt: FAILED_AT },
    ]);
  });

  it("is failed when transcription gave up, and marks the voice transcript failed", () => {
    const e = build([
      message("p1", "p", {
        hasVoice: true,
        mediaUrls: ["https://s3/v.ogg"],
        transcribeFailedAt: FAILED_AT,
        transcribeError: "unsupported codec",
      }),
    ]);
    expect(e.processing).toBe("failed");
    expect(e.failures.map((f) => f.stage)).toEqual(["TRANSCRIBE"]);
    expect(e.attachments).toEqual([
      { url: "https://s3/v.ogg", kind: "voice", transcript: { status: "failed", error: "unsupported codec" } },
    ]);
    expect(e.transcripts).toEqual([]);
  });

  it("keeps a failed transcript on a voice note whose audio is not stored", () => {
    const e = build([message("p1", "p", { hasVoice: true, transcribeFailedAt: FAILED_AT })]);
    expect(e.detachedTranscripts).toEqual([{ status: "failed", error: null }]);
  });

  it("a ready transcript wins over a stale transcription marker", () => {
    const e = build([
      message("p1", "p", { hasVoice: true, transcript: "Road closed", transcribeFailedAt: FAILED_AT }),
    ]);
    expect(e.detachedTranscripts).toEqual([{ status: "ready", text: "Road closed" }]);
  });

  it("keeps a transcription marker retryable beside a late transcript: it still holds enrichment", () => {
    const e = build([
      message("p1", "p", { hasVoice: true, transcript: "Road closed", transcribeFailedAt: FAILED_AT }),
    ]);
    expect(e.failures.map((f) => f.stage)).toEqual(["TRANSCRIBE"]);
    expect(e.processing).toBe("failed");
  });

  it("a classification wins over stale failure markers", () => {
    const e = build([
      message("p1", "p", {
        hasVoice: true,
        transcript: "Road closed",
        classification: "field_report",
        enrichFailedAt: FAILED_AT,
        transcribeFailedAt: FAILED_AT,
      }),
    ]);
    expect(e.failures).toEqual([]);
    expect(e.processing).toBe("classified");
  });

  it("lists transcription before enrichment, oldest message first", () => {
    const e = build([
      message("p2", "p", { sentAt: "2026-09-15T11:00:00Z", enrichFailedAt: FAILED_AT }),
      message("p1", "p", {
        sentAt: "2026-09-15T10:00:00Z",
        hasVoice: true,
        enrichFailedAt: FAILED_AT,
        transcribeFailedAt: FAILED_AT,
      }),
    ]);
    expect(e.failures.map((f) => `${f.messageId}:${f.stage}`)).toEqual(["p1:TRANSCRIBE", "p1:ENRICH", "p2:ENRICH"]);
  });

  it("flags a failure on a thread that is already labeled, keeping the label", () => {
    const e = build([
      message("p1", "p", { sentAt: "2026-09-15T10:00:00Z", classification: "field_report" }),
      message("p2", "p", { sentAt: "2026-09-15T11:00:00Z", enrichFailedAt: FAILED_AT }),
    ]);
    expect(e.classification).toBe("field_report");
    expect(e.processing).toBe("failed");
    expect(matchesFilter(e, "reports")).toBe(true);
    expect(matchesFilter(e, "unclassified")).toBe(false);
  });

  it("keeps pending and failed entries together under the unclassified filter", () => {
    const entries = buildInboxEntries({
      sources: [],
      threads: [thread("pending"), thread("failed")],
      messages: [
        message("a", "pending"),
        message("b", "failed", { enrichFailedAt: FAILED_AT }),
      ],
    });
    expect(entries.map((e) => e.processing)).toEqual(["pending", "failed"]);
    expect(entries.every((e) => matchesFilter(e, "unclassified"))).toBe(true);
    expect(countByFilter(entries).unclassified).toBe(2);
  });

  it("reports no failures for an unmarked message", () => {
    expect(messageFailures(message("x", "p"))).toEqual([]);
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
    expect(countByFilter(entries)).toEqual({ reports: 1, unclassified: 1, chatter: 1, priors: 0, requests: 0, all: 3 });
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

  it("shownTranslation prefers the request's own answer, then this request's poll", () => {
    const base = { requested: queued, requestFailed: false, polled: undefined, pollFailed: false, pollingForMs: 0 };
    expect(shownTranslation({ ...base, requested: undefined })).toEqual(queued);
    expect(shownTranslation({ ...base, requested: ready("Shelling") })).toEqual(ready("Shelling"));
    // A stale poll answer never overrides a request that isn't queued.
    expect(shownTranslation({ ...base, requested: ready("Shelling"), polled: queued })).toEqual(ready("Shelling"));
    expect(shownTranslation({ ...base, polled: ready("Where") })).toEqual(ready("Where"));
    expect(shownTranslation({ ...base, polled: queued })).toEqual(queued);
  });

  it("shownTranslation turns failures and an endless queue into unavailable (retryable)", () => {
    const base = { requested: queued, requestFailed: false, polled: queued, pollFailed: false, pollingForMs: 0 };
    expect(shownTranslation({ ...base, requestFailed: true })).toEqual(unavailable);
    expect(shownTranslation({ ...base, pollFailed: true })).toEqual(unavailable);
    expect(shownTranslation({ ...base, pollingForMs: TRANSLATION_POLL_LIMIT_MS - 1 })).toEqual(queued);
    expect(shownTranslation({ ...base, pollingForMs: TRANSLATION_POLL_LIMIT_MS })).toEqual(unavailable);
  });
});

describe("impact prior Review items", () => {
  function prior(id: string, overrides: Partial<GqlReviewImpactPrior> = {}): GqlReviewImpactPrior {
    return {
      id,
      eventId: "evt-1",
      event: { id: "evt-1", title: "Floods in Kassala", types: ["FL"] },
      taskId: "task-1",
      sourceKind: "event.impact_prior.clear",
      state: "proposed",
      hazardType: "FL",
      countryLocationId: "sdn",
      geographicScope: "district",
      horizonYears: 10,
      populationGroup: null,
      metric: null,
      lowerBound: null,
      upperBound: null,
      numberOfCases: 2,
      basis: [],
      methodVersion: "clear-impact-prior@0.1.0",
      supersedesId: null,
      decidedById: null,
      decidedAt: null,
      decisionRationale: null,
      createdAt: "2026-09-16T10:00:00Z",
      ...overrides,
    };
  }

  it("builds one entry per proposed ImpactPrior, titled after its Event", () => {
    const entries = buildImpactPriorEntries([prior("ip-1"), prior("ip-2", { event: { id: "evt-2", title: null, types: [] } })]);
    expect(entries.map((e) => [e.id, e.kind, e.eventId, e.eventTitle, e.title, e.sentAt])).toEqual([
      ["ip-1", "impact_prior", "evt-1", "Floods in Kassala", "Floods in Kassala", "2026-09-16T10:00:00Z"],
      ["ip-2", "impact_prior", "evt-1", null, "", "2026-09-16T10:00:00Z"],
    ]);
    expect(entries[0]!.prior).toBe(entries[0]!.prior);
  });

  it("offers each reader the filters of the kinds they see", () => {
    expect(filtersFor({ hotline: true, priors: true })).toEqual(["reports", "unclassified", "chatter", "priors", "all"]);
    expect(filtersFor({ hotline: true, priors: false })).toEqual(["reports", "unclassified", "chatter", "all"]);
    expect(filtersFor({ hotline: false, priors: true })).toEqual(["priors", "all"]);
    expect(filtersFor({ hotline: false, priors: false })).toEqual(["all"]);
  });

  it("matches the priors and Everything filters, counts there, and is searchable by Event title and hazard", () => {
    const hotline = buildInboxEntries({
      sources: [],
      threads: [thread("t1", "Fire in Port Sudan")],
      messages: [message("m1", "t1", { classification: "field_report", sentAt: "2026-09-15T10:00:00Z" })],
    });
    const entries = [...hotline, ...buildImpactPriorEntries([prior("ip-1")])];
    expect(matchesFilter(entries[1]!, "reports")).toBe(false);
    expect(matchesFilter(entries[1]!, "unclassified")).toBe(false);
    expect(matchesFilter(entries[1]!, "all")).toBe(true);
    expect(countByFilter(entries)).toEqual({ reports: 1, unclassified: 0, chatter: 0, priors: 1, requests: 0, all: 2 });
    expect(matchesFilter(entries[1]!, "priors")).toBe(true);
    expect(matchesFilter(entries[0]!, "priors")).toBe(false);
    expect(visibleEntries(entries, "priors", "", "newest").map((e) => e.id)).toEqual(["ip-1"]);
    expect(visibleEntries(entries, "all", "kassala", "newest").map((e) => e.id)).toEqual(["ip-1"]);
    expect(visibleEntries(entries, "all", "FL", "newest").map((e) => e.id)).toEqual(["ip-1"]);
    // The source word is searchable; the family prefix every prior shares is not indexed.
    expect(entries[1]!.text).toMatch(/ clear$/);
    expect(entries[1]!.text).not.toContain("event.impact_prior");
    expect(visibleEntries(entries, "all", "HL-", "newest").map((e) => e.id)).toEqual(["t1"]);
  });

  it("ranks a waiting prior with the field reports under reports-first, newest within the rank", () => {
    const hotline = buildInboxEntries({
      sources: [],
      threads: [thread("report"), thread("noise")],
      messages: [
        message("m1", "report", { classification: "field_report", sentAt: "2026-09-17T10:00:00Z" }),
        message("m2", "noise", { classification: "chatter", sentAt: "2026-09-18T10:00:00Z" }),
      ],
    });
    const entries = [...hotline, ...buildImpactPriorEntries([prior("ip-1")])];
    expect(visibleEntries(entries, "all", "", "reportsFirst").map((e) => e.id)).toEqual(["report", "ip-1", "noise"]);
    expect(visibleEntries(entries, "all", "", "newest").map((e) => e.id)).toEqual(["noise", "report", "ip-1"]);
    expect(nextSelection(entries, "ip-1")).toBe("noise");
    expect(moveSelection(entries, "ip-1", -1)).toBe("noise");
  });
});

describe("My requests (task entries)", () => {
  function task(id: string, overrides: Partial<GqlTask> = {}): GqlTask {
    return {
      id, kind: "event.impact_prior.web", requestId: "req-1", subjectType: "event", subjectId: "evt-1",
      status: "FAILED", origin: "user", requesterId: "u", requester: null, leaseOwner: null, teamId: null,
      attempts: 3, maxAttempts: 3, lastError: "model timed out", cancelRequestedAt: null, outcome: null,
      model: null, costUsd: null, completedAt: null,
      createdAt: "2026-10-07T09:00:00Z", updatedAt: "2026-10-07T09:00:00Z", ...overrides,
    };
  }

  it("builds one entry per Task, titled after its Event, searchable by source and status", () => {
    const entries = buildTaskEntries(
      [task("t-1"), task("t-2", { subjectId: "evt-hidden", status: "COMPLETED", outcome: "produced", kind: "event.impact_prior.clear" })],
      { "evt-1": "Floods in Kassala", "evt-hidden": null },
    );
    expect(entries.map((e) => [e.id, e.kind, e.eventId, e.eventTitle, e.title, e.sentAt])).toEqual([
      ["t-1", "task", "evt-1", "Floods in Kassala", "Floods in Kassala", "2026-10-07T09:00:00Z"],
      ["t-2", "task", "evt-hidden", null, "", "2026-10-07T09:00:00Z"],
    ]);
    expect(visibleEntries(entries, "requests", "failed", "newest").map((e) => e.id)).toEqual(["t-1"]);
    expect(visibleEntries(entries, "requests", "web", "newest").map((e) => e.id)).toEqual(["t-1"]);
    expect(visibleEntries(entries, "requests", "produced", "newest").map((e) => e.id)).toEqual(["t-2"]);
  });

  it("lists only Tasks about an Event (a row links to its Event page)", () => {
    expect(buildTaskEntries([task("t-1"), task("t-x", { subjectType: "crisis" })], {}).map((e) => e.id)).toEqual(["t-1"]);
  });

  it("are not Review items: only under My requests, never in Everything or its count", () => {
    const entries = buildTaskEntries([task("t-1")], { "evt-1": "Floods" });
    expect(isReviewItem(entries[0]!)).toBe(false);
    expect(matchesFilter(entries[0]!, "requests")).toBe(true);
    expect(matchesFilter(entries[0]!, "all")).toBe(false);
    expect(matchesFilter(entries[0]!, "priors")).toBe(false);
    expect(countByFilter(entries)).toEqual({ reports: 0, unclassified: 0, chatter: 0, priors: 0, requests: 1, all: 0 });
  });

  it("offers the My requests filter only to a reader who may see their requests", () => {
    expect(filtersFor({ hotline: false, priors: false, requests: true })).toEqual(["requests", "all"]);
    expect(filtersFor({ hotline: false, priors: true, requests: true })).toEqual(["priors", "requests", "all"]);
    expect(filtersFor({ hotline: true, priors: true, requests: false })).toEqual(["reports", "unclassified", "chatter", "priors", "all"]);
  });
});


describe("web case groups (V4)", () => {
  const webCase = (id: string, eventId: string, createdAt: string, extra: Partial<GqlReviewCaseProposal> = {}): GqlReviewCaseProposal => ({
    id,
    eventId,
    event: { id: eventId, title: `Event ${eventId}`, types: ["fl"] },
    taskId: "t",
    state: "proposed",
    sourceUrl: `https://example.test/${id}`,
    quote: `Quote ${id}`,
    occurredAt: "2019-08-10T00:00:00Z",
    locationLabel: "Khartoum",
    locationId: null,
    hazardType: "fl",
    geographicScope: "country",
    figures: [],
    matchedEventId: null,
    methodVersion: "m",
    decidedById: null,
    decidedAt: null,
    decisionRationale: null,
    resultSignalId: null,
    resultEventId: null,
    createdAt,
    ...extra,
  });

  it("groups cases under their Event, newest first, and finds them by place, quote and source word", () => {
    const entries = buildCaseGroupEntries([
      webCase("c3", "e2", "2026-10-03T00:00:00Z"),
      webCase("c2", "e1", "2026-10-02T00:00:00Z"),
      webCase("c1", "e1", "2026-10-01T00:00:00Z"),
    ]);
    expect(entries.map((e) => [e.id, e.cases.map((c) => c.id), e.undecided, e.sentAt])).toEqual([
      ["cases:e2", ["c3"], 1, "2026-10-03T00:00:00Z"],
      ["cases:e1", ["c2", "c1"], 2, "2026-10-02T00:00:00Z"],
    ]);
    expect(entries[1]!.title).toBe("Event e1");
    expect(matchesFilter(entries[0]!, "priors")).toBe(true);
    expect(visibleEntries(entries, "all", "quote c1", "newest").map((e) => e.id)).toEqual(["cases:e1"]);
    expect(visibleEntries(entries, "all", "web", "newest")).toHaveLength(2);
  });

  it("keeps a case decided this session in its group, decided, and counts only the undecided", () => {
    const c1 = webCase("c1", "e1", "2026-10-01T00:00:00Z");
    const c2 = webCase("c2", "e1", "2026-10-02T00:00:00Z");
    const decided = { c1: withDecision(c1, { ...c1, state: "accepted", resultEventId: "h", event: undefined } as never) };
    // The list still returns c1 (not refetched yet), then stops returning it.
    for (const proposed of [[c2, c1], [c2]]) {
      const [group] = buildCaseGroupEntries(proposed, decided);
      expect(group!.cases.map((c) => [c.id, c.state])).toEqual([
        ["c2", "proposed"],
        ["c1", "accepted"],
      ]);
      expect(group!.cases[1]!.event.title).toBe("Event e1");
      expect(countByFilter([group!]).all).toBe(1);
    }
  });
});
