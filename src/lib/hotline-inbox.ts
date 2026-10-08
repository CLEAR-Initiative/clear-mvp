import { getHazardName } from "./disaster-types";
import { sourceSearchTerm } from "./impact-prior-source";
import type {
  GqlCaseProposal,
  GqlGroundInboxMessage,
  GqlGroundInboxThread,
  GqlHotlineInbox,
  GqlReviewCaseProposal,
  GqlReviewImpactPrior,
  GqlTask,
} from "~/lib/types/graphql";

/**
 * Inbox view model (/inbox).
 *
 * Pure helpers that turn what the Inbox lists into standalone, reviewable
 * entries of two kinds (`InboxEntry.kind`):
 *
 *   hotline_thread — one unverified thread from the hotline staging payload
 *                    (open threads + staged messages). The hotline is free
 *                    text (no guided form yet), so an entry carries the
 *                    reporter's narrative and attachments only; the intake
 *                    answers block from the design lands once something
 *                    produces answers.
 *   impact_prior   — one proposed ImpactPrior (clear-api ADR-0010) waiting
 *                    for an admin or analyst to accept or reject it. Only
 *                    the CLEAR-data source's: the web's is decided case by
 *                    case (below).
 *   cases          — the proposed web cases (clear-api V4, CaseProposal)
 *                    of one Event, grouped under it; each case has its own
 *                    Accept / Reject. It counts as one Review item per
 *                    undecided case, not one per group.
 *   task           — one enrichment Task the reader requested ("My
 *                    requests"): its status, never a decision. Not a Review
 *                    item, so it is listed only under its own filter and
 *                    never counts toward "awaiting" or the nav badge.
 *
 * PRIVACY: hotline messages carry no sender identity. `senderRef` is a
 * per-conversation HMAC pseudonym minted by clear-api; `intakeRef` below
 * is a display-only rendering of it and resolves to nothing outside CLEAR.
 */

/** An entry's on-demand translation into one locale (clear-api#627).
 * `queued` means the pipeline drain has not written it yet; poll. */
export interface GroundTranslationState {
  status: "queued" | "ready" | "unavailable";
  text: string | null;
}

/** The three hotline classifications, the ImpactPrior kind, the reader's
 * own requests, and everything (every Review item — not the requests).
 * The page shows only the filters whose kind the reader may see. */
export const INBOX_FILTERS = ["reports", "unclassified", "chatter", "priors", "requests", "all"] as const;
export type InboxFilter = (typeof INBOX_FILTERS)[number];

/** Which filters apply to a reader who sees these kinds; "all" always. */
export function filtersFor(access: { hotline: boolean; priors: boolean; requests?: boolean }): InboxFilter[] {
  return INBOX_FILTERS.filter((f) =>
    f === "all" ? true : f === "priors" ? access.priors : f === "requests" ? !!access.requests : access.hotline,
  );
}

export const INBOX_SORTS = ["reportsFirst", "newest"] as const;
export type InboxSort = (typeof INBOX_SORTS)[number];

/** Pipeline classifications plus the "not labeled yet" bucket. */
export const INBOX_CLASSIFICATIONS = [
  "field_report",
  "unclassified",
  "chatter",
  "news_digest",
  "operational",
] as const;
export type InboxClassification = (typeof INBOX_CLASSIFICATIONS)[number];

/** Triage order: reports first, unlabeled next, then noise. */
const CLASSIFICATION_RANK: Record<InboxClassification, number> = {
  field_report: 0,
  unclassified: 1,
  news_digest: 2,
  operational: 2,
  chatter: 3,
};

export const REJECT_REASONS = ["spam", "not_report", "unusable", "duplicate"] as const;
export type RejectReason = (typeof REJECT_REASONS)[number];

/** clear-pipeline ground drains that can give up on a message (clear-api
 * GroundPipelineStage): ENRICH = classification + thread draft,
 * TRANSCRIBE = voice-note transcription. */
export const GROUND_PIPELINE_STAGES = ["ENRICH", "TRANSCRIBE"] as const;
export type GroundPipelineStage = (typeof GROUND_PIPELINE_STAGES)[number];

/** One stage the pipeline gave up on for one message. The message stays
 * out of that stage's queue until retryGroundMessage clears the marker. */
export interface InboxFailure {
  messageId: string;
  stage: GroundPipelineStage;
  /** Last error from the drain; null when none was recorded. */
  error: string | null;
  failedAt: string;
}

/**
 * Where the pipeline is with an entry:
 *   classified — a message is labeled and nothing failed
 *   pending    — nothing labeled yet, still waiting in the pipeline queue
 *   failed     — a drain gave up on at least one message, which left the
 *                queue for good; only a reviewer retry brings it back
 */
export type InboxProcessing = "classified" | "pending" | "failed";

/** A message's voice-note transcript: machine text, not written yet, or
 * given up on by the transcription drain. */
export type VoiceTranscript =
  | { status: "ready"; text: string }
  | { status: "pending" }
  | { status: "failed"; error: string | null };

export interface InboxAttachment {
  url: string;
  /** "voice" only on messages flagged hasVoice (see attachmentKind);
   * everything else renders as a photo and falls back to a generic card
   * when the image fails to load. */
  kind: "photo" | "voice";
  /** On the message's last voice attachment only: the transcript covers
   * all of the message's voice notes, so it is shown once. */
  transcript?: VoiceTranscript;
}

/** What an Inbox entry is about; each kind has its own row and pane. */
export type InboxEntryKind = "hotline_thread" | "impact_prior" | "cases" | "task";

/** What every kind of entry carries: enough to list, select, search and
 * sort it. */
interface InboxEntryBase {
  id: string;
  kind: InboxEntryKind;
  title: string;
  /** Searchable plain text; the row's preview is its first paragraph. */
  text: string;
  /** When the entry happened (ISO): sorting and the row's timestamp. */
  sentAt: string;
}

export interface HotlineEntry extends InboxEntryBase {
  kind: "hotline_thread";
  /** Thread id (the review unit). */
  id: string;
  /** Carries the enrichment drafts the Add to CLEAR modal pre-fills from. */
  thread: GqlGroundInboxThread;
  /** Sent-ascending. */
  messages: GqlGroundInboxMessage[];
  senderRef: string;
  intakeRef: string;
  title: string;
  /** Reporter's own words: message texts joined, empty when media-only. */
  text: string;
  classification: InboxClassification;
  /** Pipeline state: tells "still queued" from "given up on" (both show
   * as classification "unclassified" when nothing is labeled). */
  processing: InboxProcessing;
  /** Failed pipeline stages across the entry's messages, oldest message
   * first, transcription before enrichment (enrichment needs the
   * transcript). Empty unless processing is "failed". */
  failures: InboxFailure[];
  /** Latest message timestamp (ISO). */
  sentAt: string;
  attachments: InboxAttachment[];
  /** Transcripts of voice messages with no stored voice attachment yet
   * (hasVoice is set at ingest, before the media is stored). */
  detachedTranscripts: VoiceTranscript[];
  /** All ready transcripts, oldest first (search + modal seed). */
  transcripts: string[];
  omittedMediaCount: number;
  uncertainty: string | null;
  /** Other open entries from the same pseudonymous reporter. */
  priorEntries: number;
}

/** A proposed ImpactPrior as a Review item. The id is the ImpactPrior's. */
export interface ImpactPriorEntry extends InboxEntryBase {
  kind: "impact_prior";
  prior: GqlReviewImpactPrior;
  eventId: string;
  /** The Event's title; null when the Event has none (the row says so). */
  eventTitle: string | null;
}

/** The web cases one Event's enrichment produced, as one Review item per
 * undecided case under the Event. The id is `cases:<eventId>`. */
export interface CaseGroupEntry extends InboxEntryBase {
  kind: "cases";
  eventId: string;
  /** The Event's title; null when it has none (the row says so). */
  eventTitle: string | null;
  /** Newest first: the proposed ones, and any decided in this session
   * (they stay, showing their decision, until the Inbox is reloaded). */
  cases: GqlReviewCaseProposal[];
  /** How many are still undecided: what the group counts for. */
  undecided: number;
}

/** One enrichment Task the reader requested. The id is the Task's. */
export interface TaskEntry extends InboxEntryBase {
  kind: "task";
  task: GqlTask;
  eventId: string;
  /** The Event's title; null when it has none or the reader cannot see it. */
  eventTitle: string | null;
}

export type InboxEntry = HotlineEntry | ImpactPriorEntry | CaseGroupEntry | TaskEntry;

export function isHotlineEntry(entry: InboxEntry): entry is HotlineEntry {
  return entry.kind === "hotline_thread";
}

export function isImpactPriorEntry(entry: InboxEntry): entry is ImpactPriorEntry {
  return entry.kind === "impact_prior";
}

export function isCaseGroupEntry(entry: InboxEntry): entry is CaseGroupEntry {
  return entry.kind === "cases";
}

export function isTaskEntry(entry: InboxEntry): entry is TaskEntry {
  return entry.kind === "task";
}

/** A Review item: something waiting for this reader's decision. The
 * reader's own requests are not — they are status, not work. */
export function isReviewItem(entry: InboxEntry): boolean {
  return !isTaskEntry(entry);
}

/**
 * One entry per Task the reader requested (clear-api `myTasks`, newest
 * first). `eventTitles` maps an Event id to its title as the reader may
 * see it; the row titles itself after the Event. `text` carries the
 * source word, the status and the outcome so search finds "failed" or
 * "web".
 */
export function buildTaskEntries(tasks: GqlTask[], eventTitles: Record<string, string | null>): TaskEntry[] {
  // Every kind today is about an Event; a Task about anything else has no
  // Event page to link to, so it is not listed here.
  return tasks.filter((task) => task.subjectType === "event").map((task) => {
    const eventTitle = eventTitles[task.subjectId] ?? null;
    return {
      id: task.id,
      kind: "task",
      task,
      eventId: task.subjectId,
      eventTitle,
      title: eventTitle ?? "",
      text: [sourceSearchTerm(task.kind), task.status, task.outcome ?? ""].join(" "),
      sentAt: task.createdAt,
    };
  });
}

/**
 * One Review item per proposed ImpactPrior, as clear-api returned them
 * (newest first; the sort below re-orders). `title` is the Event's title so
 * the row reads as "what is this about"; `text` carries the hazard, the
 * scope and the case count so search finds it.
 */
export function buildImpactPriorEntries(priors: GqlReviewImpactPrior[]): ImpactPriorEntry[] {
  return priors.map((prior) => ({
    id: prior.id,
    kind: "impact_prior",
    prior,
    eventId: prior.eventId,
    eventTitle: prior.event?.title ?? null,
    title: prior.event?.title ?? "",
    text: [prior.hazardType, getHazardName(prior.hazardType), prior.geographicScope, `${prior.numberOfCases}`, prior.methodVersion, sourceSearchTerm(prior.sourceKind)].join(" "),
    sentAt: prior.createdAt,
  }));
}

/** The id of an Event's case group. */
export function caseGroupId(eventId: string): string {
  return `cases:${eventId}`;
}

/**
 * Web cases grouped under the Event whose enrichment produced them, one
 * Review item per Event. `proposed` is clear-api's list (newest first);
 * `decided` holds the cases decided in this session, by id, as their
 * decision returned them: they replace their proposed copy, and stay in
 * their group after the list stops returning them, so a row turns to its
 * decision in place instead of vanishing. `text` carries the source word,
 * hazard, places and quotes so search finds a case.
 */
export function buildCaseGroupEntries(
  proposed: GqlReviewCaseProposal[],
  decided: Record<string, GqlReviewCaseProposal> = {},
): CaseGroupEntry[] {
  const seen = new Set<string>();
  const all: GqlReviewCaseProposal[] = [];
  for (const c of proposed) {
    seen.add(c.id);
    all.push(decided[c.id] ?? c);
  }
  for (const c of Object.values(decided)) if (!seen.has(c.id)) all.push(c);
  all.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt) || (a.id < b.id ? 1 : a.id > b.id ? -1 : 0));

  const byEvent = new Map<string, GqlReviewCaseProposal[]>();
  for (const c of all) {
    const list = byEvent.get(c.eventId);
    if (list) list.push(c);
    else byEvent.set(c.eventId, [c]);
  }
  return [...byEvent.entries()].map(([eventId, cases]) => {
    const eventTitle = cases.find((c) => c.event?.title)?.event.title ?? null;
    return {
      id: caseGroupId(eventId),
      kind: "cases",
      eventId,
      eventTitle,
      cases,
      undecided: cases.filter((c) => c.state === "proposed").length,
      title: eventTitle ?? "",
      text: [
        "web",
        ...new Set(cases.flatMap((c) => [c.hazardType, getHazardName(c.hazardType)])),
        ...new Set(cases.map((c) => c.locationLabel)),
        ...cases.map((c) => c.quote),
      ].join(" "),
      sentAt: cases[0]!.createdAt,
    };
  });
}

/** A decided case as the group keeps it: the decision's answer over the
 * proposed copy (which carries the Event the answer does not). */
export function withDecision(proposal: GqlReviewCaseProposal, decided: GqlCaseProposal): GqlReviewCaseProposal {
  return { ...proposal, ...decided, event: proposal.event };
}

/** Attachments that are recognisably not audio: images, plus the video and
 * PDF types the hotline also stores (clear-api EXTENSION_BY_CONTENT_TYPE).
 * `.m4a` (audio/mp4) deliberately doesn't match `mp4`. */
const NON_VOICE_EXT = /\.(jpe?g|png|gif|webp|heic|heif|bmp|tiff?|mp4|mov|3gp|pdf)(\?|$)/i;

/**
 * Voice detection is message-level: clear-api's hasVoice (from the ingest's
 * per-attachment refs) says whether the message carries a voice note at
 * all. Without it every attachment is a photo; with it, anything that is
 * not recognisably an image, video or PDF is the voice note (a hotline
 * message is almost always a single attachment).
 */
export function attachmentKind(url: string, hasVoice: boolean): InboxAttachment["kind"] {
  return hasVoice && !NON_VOICE_EXT.test(url) ? "voice" : "photo";
}

function voiceTranscript(m: GqlGroundInboxMessage): VoiceTranscript | null {
  if (!m.hasVoice) return null;
  const text = m.transcript?.trim() ?? "";
  if (text.length > 0) return { status: "ready", text };
  return m.transcribeFailedAt ? { status: "failed", error: m.transcribeError } : { status: "pending" };
}

/** A message's failure markers, transcription first: a failed
 * transcription also holds the message out of enrichment, so it is the
 * one to retry first. A classified message has none: clear-api does not
 * clear a marker when a late classification lands after the drain gave
 * up. Short of that, any marker still holds the message out of the
 * enrichment queue (even beside a late transcript), so it stays
 * retryable. */
export function messageFailures(m: GqlGroundInboxMessage): InboxFailure[] {
  if (m.classification) return [];
  const failures: InboxFailure[] = [];
  if (m.transcribeFailedAt) {
    failures.push({ messageId: m.id, stage: "TRANSCRIBE", error: m.transcribeError, failedAt: m.transcribeFailedAt });
  }
  if (m.enrichFailedAt) {
    failures.push({ messageId: m.id, stage: "ENRICH", error: m.enrichError, failedAt: m.enrichFailedAt });
  }
  return failures;
}

export function entryProcessing(
  classification: InboxClassification,
  failures: readonly InboxFailure[],
): InboxProcessing {
  if (failures.length > 0) return "failed";
  return classification === "unclassified" ? "pending" : "classified";
}

/** One message's attachments, with its transcript on the last voice one. */
function messageAttachments(m: GqlGroundInboxMessage): InboxAttachment[] {
  const attachments: InboxAttachment[] = m.mediaUrls.map((url) => ({ url, kind: attachmentKind(url, m.hasVoice) }));
  const transcript = voiceTranscript(m);
  const lastVoice = attachments.map((a) => a.kind).lastIndexOf("voice");
  if (transcript && lastVoice !== -1) attachments[lastVoice] = { ...attachments[lastVoice]!, transcript };
  return attachments;
}

/**
 * Display form of the per-conversation pseudonym: "HL-" plus the first six
 * hex characters, upper-cased ("h_3f9a2c7b1d0e" -> "HL-3F9A2C"). Purely
 * cosmetic; the pseudonym itself is what identifies the conversation.
 */
export function intakeRef(senderRef: string | null | undefined): string {
  const body = (senderRef ?? "").replace(/^[a-z]_/, "");
  return body.length === 0 ? "HL-?" : `HL-${body.slice(0, 6).toUpperCase()}`;
}

/**
 * Stable React key for an attachment: the URL path without the presign
 * query string. Presigned URLs change on every inbox fetch (1 h expiry);
 * keying on the path keeps the element (and a voice player's state)
 * across a refresh instead of remounting it.
 */
export function attachmentKey(url: string): string {
  return url.split("?")[0] ?? url;
}

export function toInboxClassification(value: string | null | undefined): InboxClassification {
  return (INBOX_CLASSIFICATIONS as readonly string[]).includes(value ?? "")
    ? (value as InboxClassification)
    : "unclassified";
}

/** Entry classification = the latest labeled message wins; none = unclassified. */
function entryClassification(messages: GqlGroundInboxMessage[]): InboxClassification {
  for (let i = messages.length - 1; i >= 0; i--) {
    const c = messages[i]?.classification;
    if (c) return toInboxClassification(c);
  }
  return "unclassified";
}

/** Join open threads with their messages into standalone entries. Threads
 * without messages (should not happen) are dropped rather than rendered empty. */
export function buildInboxEntries(data: GqlHotlineInbox): HotlineEntry[] {
  const byThread = new Map<string, GqlGroundInboxMessage[]>();
  for (const m of data.messages) {
    if (!m.threadId) continue;
    const list = byThread.get(m.threadId);
    if (list) list.push(m);
    else byThread.set(m.threadId, [m]);
  }

  const entries: HotlineEntry[] = [];
  for (const thread of data.threads) {
    const messages = byThread.get(thread.id);
    if (!messages || messages.length === 0) continue;
    messages.sort((a, b) => Date.parse(a.sentAt) - Date.parse(b.sentAt));
    const first = messages[0]!;
    const last = messages[messages.length - 1]!;
    const text = textMessages(messages)
      .map((m) => m.text.trim())
      .join("\n\n");
    const media = messages.map((m) => ({ attachments: messageAttachments(m), transcript: voiceTranscript(m) }));
    const classification = entryClassification(messages);
    const failures = messages.flatMap(messageFailures);
    entries.push({
      id: thread.id,
      kind: "hotline_thread",
      thread,
      messages,
      senderRef: first.senderRef,
      intakeRef: intakeRef(first.senderRef),
      title: thread.title ?? text.split("\n")[0]?.trim() ?? "",
      text,
      classification,
      processing: entryProcessing(classification, failures),
      failures,
      sentAt: last.sentAt,
      attachments: media.flatMap((p) => p.attachments),
      detachedTranscripts: media.flatMap((p) =>
        p.transcript && !p.attachments.some((a) => a.kind === "voice") ? [p.transcript] : [],
      ),
      transcripts: media.flatMap((p) => (p.transcript?.status === "ready" ? [p.transcript.text] : [])),
      omittedMediaCount: messages.reduce((n, m) => n + m.omittedMediaCount, 0),
      uncertainty: messages.find((m) => m.uncertainty)?.uncertainty ?? null,
      priorEntries: 0,
    });
  }

  const bySender = new Map<string, number>();
  for (const e of entries) bySender.set(e.senderRef, (bySender.get(e.senderRef) ?? 0) + 1);
  for (const e of entries) e.priorEntries = (bySender.get(e.senderRef) ?? 1) - 1;

  return entries;
}

/**
 * Default description for the Add to CLEAR modal: per message (oldest
 * first) the reporter's text, then its machine transcript prefixed by the
 * caller's localized `transcriptLabel` (e.g. "[Machine transcript] …"), so
 * voice-only reports are not promoted with an empty description.
 */
export function entryDescription(entry: HotlineEntry, transcriptLabel: (text: string) => string): string {
  return entry.messages
    .flatMap((m) => {
      const parts = [m.text.trim()];
      const tr = voiceTranscript(m);
      if (tr?.status === "ready") parts.push(transcriptLabel(tr.text));
      return parts;
    })
    .filter((p) => p.length > 0)
    .join("\n\n");
}

/** The classification filters are the hotline's, "priors" is the
 * ImpactPrior kind's, "requests" the reader's own Tasks, "all" every
 * Review item (so the reader's requests never inflate "awaiting").
 * "unclassified" covers both pending and failed entries: neither has a
 * label yet. The row pill tells them apart. */
export function matchesFilter(entry: InboxEntry, filter: InboxFilter): boolean {
  switch (filter) {
    case "reports":
      return isHotlineEntry(entry) && entry.classification === "field_report";
    case "unclassified":
      return isHotlineEntry(entry) && entry.classification === "unclassified";
    case "chatter":
      return isHotlineEntry(entry) && entry.classification === "chatter";
    case "priors":
      return isImpactPriorEntry(entry) || isCaseGroupEntry(entry);
    case "requests":
      return isTaskEntry(entry);
    case "all":
      return isReviewItem(entry);
  }
}

export function matchesSearch(entry: InboxEntry, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (q.length === 0) return true;
  if (entry.title.toLowerCase().includes(q) || entry.text.toLowerCase().includes(q)) return true;
  if (!isHotlineEntry(entry)) return false;
  return (
    entry.transcripts.some((tr) => tr.toLowerCase().includes(q)) ||
    entry.intakeRef.toLowerCase().includes(q)
  );
}

/** Triage order for "reports first": a Review item waiting for a decision
 * ranks with the field reports; the hotline's own order follows. */
function entryRank(entry: InboxEntry): number {
  return isHotlineEntry(entry) ? CLASSIFICATION_RANK[entry.classification] : 0;
}

export function sortEntries<T extends InboxEntry>(entries: T[], sort: InboxSort): T[] {
  const byTime = (a: InboxEntry, b: InboxEntry) => Date.parse(b.sentAt) - Date.parse(a.sentAt);
  const sorted = [...entries];
  if (sort === "newest") return sorted.sort(byTime);
  return sorted.sort((a, b) => entryRank(a) - entryRank(b) || byTime(a, b));
}

export function visibleEntries<T extends InboxEntry>(
  entries: T[],
  filter: InboxFilter,
  query: string,
  sort: InboxSort,
): T[] {
  return sortEntries(
    entries.filter((e) => matchesFilter(e, filter) && matchesSearch(e, query)),
    sort,
  );
}

/** What an entry adds to a count: a case group, its undecided cases (so the
 * Inbox counts decisions waiting, not Events); anything else, one. */
export function entryWeight(entry: InboxEntry): number {
  return isCaseGroupEntry(entry) ? entry.undecided : 1;
}

export function countByFilter(entries: InboxEntry[]): Record<InboxFilter, number> {
  const counts: Record<InboxFilter, number> = { reports: 0, unclassified: 0, chatter: 0, priors: 0, requests: 0, all: 0 };
  for (const e of entries) {
    for (const f of INBOX_FILTERS) if (matchesFilter(e, f)) counts[f] += entryWeight(e);
  }
  return counts;
}

/**
 * Which entry to select after `actedId` leaves the visible list: the next
 * one down, else the previous, else nothing. `visible` is the list BEFORE
 * removal.
 */
export function nextSelection(visible: readonly Pick<InboxEntry, "id">[], actedId: string): string | null {
  const i = visible.findIndex((e) => e.id === actedId);
  if (i === -1) return visible[0]?.id ?? null;
  return visible[i + 1]?.id ?? visible[i - 1]?.id ?? null;
}

/** J/K movement: clamp within the visible list; null selection starts at the top. */
export function moveSelection(
  visible: readonly Pick<InboxEntry, "id">[],
  selectedId: string | null,
  delta: 1 | -1,
): string | null {
  if (visible.length === 0) return null;
  const i = selectedId ? visible.findIndex((e) => e.id === selectedId) : -1;
  if (i === -1) return visible[0]!.id;
  const next = Math.min(visible.length - 1, Math.max(0, i + delta));
  return visible[next]!.id;
}

/* ─── Read state (per-browser convenience; nothing server-side yet) ─── */

const READ_KEY = "clear.hotline-inbox.read";
/** Newest-first cap so the per-browser read set cannot grow unbounded. */
const READ_MAX = 500;

export function loadReadIds(): Set<string> {
  try {
    const raw = window.localStorage.getItem(READ_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(parsed) ? parsed.filter((v) => typeof v === "string") : []);
  } catch {
    return new Set();
  }
}

export function saveReadIds(ids: Set<string>): void {
  try {
    window.localStorage.setItem(READ_KEY, JSON.stringify([...ids].slice(-READ_MAX)));
  } catch {
    // Storage unavailable (private mode, quota): read state is a nicety.
  }
}

/** Messages whose text an entry's narrative (and its translation) is built
 * from — `buildInboxEntries` joins these into `text`. */
export function textMessages<T extends { text: string }>(messages: T[]): T[] {
  return messages.filter((m) => m.text.trim().length > 0);
}

/**
 * Whether to offer translating an entry into `locale`: it has text, and at
 * least one text message isn't already in `locale` by clear-api's intake
 * detection (an unknown language counts as not).
 */
export function needsTranslation(entry: HotlineEntry, locale: string): boolean {
  return textMessages(entry.messages).some((m) => m.language !== locale);
}

/** How often the reading pane polls a queued translation, and for how long
 * before it gives up and offers a retry (the drain may be paused). */
export const TRANSLATION_POLL_MS = 5_000;
export const TRANSLATION_POLL_LIMIT_MS = 2 * 60_000;

/**
 * What the reading pane shows for one translation request: the request's
 * own answer unless it is `queued`, then this request's polled answer.
 * Errors, and a translation still queued past the poll limit, show as
 * unavailable (which offers a retry); no answer yet is queued.
 */
export function shownTranslation(r: {
  requested: GroundTranslationState | undefined;
  requestFailed: boolean;
  /** The poll's answer for this request (never an earlier request's). */
  polled: GroundTranslationState | undefined;
  pollFailed: boolean;
  /** Since the request, as of the poll's latest answer. */
  pollingForMs: number;
}): GroundTranslationState {
  const queued: GroundTranslationState = { status: "queued", text: null };
  const unavailable: GroundTranslationState = { status: "unavailable", text: null };
  if (r.requestFailed) return unavailable;
  if (!r.requested) return queued;
  if (r.requested.status !== "queued") return r.requested;
  if (r.pollFailed) return unavailable;
  if (r.polled && r.polled.status !== "queued") return r.polled;
  return r.pollingForMs >= TRANSLATION_POLL_LIMIT_MS ? unavailable : queued;
}

/**
 * Fold per-message translation states into the entry's: ready (texts joined
 * by a blank line, like `InboxEntry.text`) only once every text message is,
 * queued while any still is, otherwise unavailable — a translation missing
 * part of the report is not shown as the report's translation.
 */
export function combineTranslations(states: GroundTranslationState[]): GroundTranslationState {
  if (states.length === 0) return { status: "unavailable", text: null };
  if (states.some((s) => s.status === "queued")) return { status: "queued", text: null };
  if (states.every((s) => s.status === "ready" && s.text)) {
    return { status: "ready", text: states.map((s) => s.text!.trim()).join("\n\n") };
  }
  return { status: "unavailable", text: null };
}
