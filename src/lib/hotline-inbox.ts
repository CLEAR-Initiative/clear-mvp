import type {
  GqlGroundInboxMessage,
  GqlGroundThread,
  GqlHotlineInbox,
} from "~/lib/types/graphql";

/**
 * Hotline inbox view model (/inbox).
 *
 * Pure helpers that turn the hotline staging payload (open threads +
 * staged messages) into standalone, triageable entries. One entry = one
 * unverified thread. The hotline is free text (no guided form yet), so an
 * entry carries the reporter's narrative and attachments only; the intake
 * answers block from the design lands once something produces answers.
 *
 * PRIVACY: hotline messages carry no sender identity. `senderRef` is a
 * per-conversation HMAC pseudonym minted by clear-api; `intakeRef` below
 * is a display-only rendering of it and resolves to nothing outside CLEAR.
 */

export const INBOX_FILTERS = ["reports", "unclassified", "chatter", "all"] as const;
export type InboxFilter = (typeof INBOX_FILTERS)[number];

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

export interface InboxAttachment {
  url: string;
  /** Best-effort from the presigned URL path; unknown URLs render as photos
   * and fall back to a generic card when the image fails to load. */
  kind: "photo" | "voice";
}

export interface InboxEntry {
  /** Thread id (the review unit). */
  id: string;
  thread: GqlGroundThread;
  /** Sent-ascending. */
  messages: GqlGroundInboxMessage[];
  senderRef: string;
  intakeRef: string;
  title: string;
  /** Reporter's own words: message texts joined, empty when media-only. */
  text: string;
  classification: InboxClassification;
  /** Latest message timestamp (ISO). */
  sentAt: string;
  attachments: InboxAttachment[];
  omittedMediaCount: number;
  uncertainty: string | null;
  /** Other open entries from the same pseudonymous reporter. */
  priorEntries: number;
}

const VOICE_EXT = /\.(ogg|opus|oga|mp3|m4a|aac|amr|wav|webm)(\?|$)/i;

export function attachmentKind(url: string): InboxAttachment["kind"] {
  return VOICE_EXT.test(url) ? "voice" : "photo";
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
export function buildInboxEntries(data: GqlHotlineInbox): InboxEntry[] {
  const byThread = new Map<string, GqlGroundInboxMessage[]>();
  for (const m of data.messages) {
    if (!m.threadId) continue;
    const list = byThread.get(m.threadId);
    if (list) list.push(m);
    else byThread.set(m.threadId, [m]);
  }

  const entries: InboxEntry[] = [];
  for (const thread of data.threads) {
    const messages = byThread.get(thread.id);
    if (!messages || messages.length === 0) continue;
    messages.sort((a, b) => Date.parse(a.sentAt) - Date.parse(b.sentAt));
    const first = messages[0]!;
    const last = messages[messages.length - 1]!;
    const text = messages
      .map((m) => m.text.trim())
      .filter((t) => t.length > 0)
      .join("\n\n");
    entries.push({
      id: thread.id,
      thread,
      messages,
      senderRef: first.senderRef,
      intakeRef: intakeRef(first.senderRef),
      title: thread.title ?? text.split("\n")[0]?.trim() ?? "",
      text,
      classification: entryClassification(messages),
      sentAt: last.sentAt,
      attachments: messages.flatMap((m) =>
        m.mediaUrls.map((url) => ({ url, kind: attachmentKind(url) })),
      ),
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

export function matchesFilter(entry: InboxEntry, filter: InboxFilter): boolean {
  switch (filter) {
    case "reports":
      return entry.classification === "field_report";
    case "unclassified":
      return entry.classification === "unclassified";
    case "chatter":
      return entry.classification === "chatter";
    case "all":
      return true;
  }
}

export function matchesSearch(entry: InboxEntry, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (q.length === 0) return true;
  return (
    entry.title.toLowerCase().includes(q) ||
    entry.text.toLowerCase().includes(q) ||
    entry.intakeRef.toLowerCase().includes(q)
  );
}

export function sortEntries(entries: InboxEntry[], sort: InboxSort): InboxEntry[] {
  const byTime = (a: InboxEntry, b: InboxEntry) => Date.parse(b.sentAt) - Date.parse(a.sentAt);
  const sorted = [...entries];
  if (sort === "newest") return sorted.sort(byTime);
  return sorted.sort(
    (a, b) =>
      CLASSIFICATION_RANK[a.classification] - CLASSIFICATION_RANK[b.classification] || byTime(a, b),
  );
}

export function visibleEntries(
  entries: InboxEntry[],
  filter: InboxFilter,
  query: string,
  sort: InboxSort,
): InboxEntry[] {
  return sortEntries(
    entries.filter((e) => matchesFilter(e, filter) && matchesSearch(e, query)),
    sort,
  );
}

export function countByFilter(entries: InboxEntry[]): Record<InboxFilter, number> {
  const counts: Record<InboxFilter, number> = { reports: 0, unclassified: 0, chatter: 0, all: 0 };
  for (const e of entries) {
    for (const f of INBOX_FILTERS) if (matchesFilter(e, f)) counts[f] += 1;
  }
  return counts;
}

/**
 * Which entry to select after `actedId` leaves the visible list: the next
 * one down, else the previous, else nothing. `visible` is the list BEFORE
 * removal.
 */
export function nextSelection(visible: InboxEntry[], actedId: string): string | null {
  const i = visible.findIndex((e) => e.id === actedId);
  if (i === -1) return visible[0]?.id ?? null;
  return visible[i + 1]?.id ?? visible[i - 1]?.id ?? null;
}

/** J/K movement: clamp within the visible list; null selection starts at the top. */
export function moveSelection(
  visible: InboxEntry[],
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
