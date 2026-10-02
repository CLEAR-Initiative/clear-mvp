import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { graphqlFetch, cookieHeaders } from "~/server/api/graphql";
import {
  GROUND_PIPELINE_STAGES,
  REJECT_REASONS,
  combineTranslations,
  textMessages,
  type GroundTranslationState,
} from "~/lib/hotline-inbox";
import { locales } from "~/i18n/config";
import { readFeatureFlag } from "~/server/feature-flags";
import type {
  GqlGroundInboxMessage,
  GqlGroundInboxThread,
  GqlGroundMessage,
  GqlGroundSource,
  GqlGroundThread,
  GqlGroundThreadDetail,
  GqlHotlineInbox,
} from "~/lib/types/graphql";

/**
 * Ground intel staging tier (detection → Ground intel tab).
 *
 * The whole tier is PRIVATE: clear-api gates every query and mutation on
 * the global admin/analyst role, and `reviewGroundThread` additionally
 * consults the source's own `reviewerRoles` policy record. This router is
 * a thin proxy — authorization lives in clear-api; the UI mirrors it only
 * to avoid showing controls that would always fail.
 *
 * Privacy: `senderName` is private-tier data. It may be rendered inside
 * the Ground-intel tab ONLY. Phone numbers are redacted at persistence by
 * clear-api and must never surface anywhere.
 */

const GROUND_SOURCE_FIELDS = `id name kind reviewerRoles privacyDefault isActive`;

const GROUND_MESSAGE_FIELDS = `
  id
  groundSourceId
  externalId
  sentAt
  senderRef
  senderName
  text
  mediaKeys
  mediaRefs
  omittedMediaCount
  classification
  uncertainty
  isEdited
  threadId
`;

const GROUND_THREAD_FIELDS = `
  id
  groundSourceId
  title
  lifecycleState
  reviewState
  reviewedBy
  reviewedAt
  reviewNote
  rejectReason
  promotedSignalId
  createdAt
`;

const GROUND_SOURCES_QUERY = `
  query GroundSources {
    groundSources { ${GROUND_SOURCE_FIELDS} }
  }
`;

const GROUND_THREADS_QUERY = `
  query GroundThreads($groundSourceId: String, $reviewState: String, $limit: Int, $offset: Int) {
    groundThreads(groundSourceId: $groundSourceId, reviewState: $reviewState, limit: $limit, offset: $offset) {
      ${GROUND_THREAD_FIELDS}
    }
  }
`;

const GROUND_THREAD_QUERY = `
  query GroundThread($id: String!) {
    groundThread(id: $id) {
      ${GROUND_THREAD_FIELDS}
      source { ${GROUND_SOURCE_FIELDS} }
      messages { ${GROUND_MESSAGE_FIELDS} }
    }
  }
`;

const REVIEW_GROUND_THREAD_MUTATION = `
  mutation ReviewGroundThread(
    $id: String!
    $decision: String!
    $note: String
    $rejectReason: String
    $overrides: GroundPromotionOverridesInput
  ) {
    reviewGroundThread(
      id: $id
      decision: $decision
      note: $note
      rejectReason: $rejectReason
      overrides: $overrides
    ) {
      ${GROUND_THREAD_FIELDS}
    }
  }
`;

const GROUND_MESSAGES_QUERY = `
  query GroundMessages($groundSourceId: String, $threadId: String, $limit: Int, $offset: Int) {
    groundMessages(groundSourceId: $groundSourceId, threadId: $threadId, limit: $limit, offset: $offset) {
      ${GROUND_MESSAGE_FIELDS}
    }
  }
`;

/** Inbox message fields: GROUND_MESSAGE_FIELDS minus senderName (private
 * tier, must not reach the inbox client) plus presigned mediaUrls (cost:
 * one presign per stored attachment per fetch, so kept off the generic
 * messages query), the voice-note fields hasVoice / transcript
 * (clear-api#661) and the pipeline failure markers, which tell a message
 * still queued for classification from one the pipeline gave up on
 * (inbox-only so the detection tab does not depend on them). */
const HOTLINE_INBOX_MESSAGE_FIELDS = `
  id
  groundSourceId
  externalId
  sentAt
  senderRef
  text
  mediaKeys
  mediaUrls
  mediaRefs
  omittedMediaCount
  hasVoice
  transcript
  classification
  uncertainty
  isEdited
  threadId
  enrichFailedAt
  enrichError
  transcribeFailedAt
  transcribeError
`;

/** Inbox thread fields: GROUND_THREAD_FIELDS plus the hotline-enrichment
 * drafts (LLM suggestions the Add to CLEAR modal pre-fills from). Kept
 * inbox-only so the detection Ground intel tab's queries do not depend on
 * the draft columns. */
const HOTLINE_INBOX_THREAD_FIELDS = `
  ${GROUND_THREAD_FIELDS}
  draftTitle
  draftSeverity
  draftLocationId
  draftDisasterType
`;

/** The per-source inbox query. `language` (clear-api#627) is selected only
 * while `hotline_translation` is on: a field clear-api doesn't have fails
 * the whole document, so the flag stays off until the API is live on that
 * environment, and turning it off contains a rollback without a deploy. */
function hotlineInboxSourceQuery(withLanguage: boolean): string {
  return `
  query HotlineInboxSource($groundSourceId: String, $limit: Int) {
    groundThreads(groundSourceId: $groundSourceId, reviewState: "unverified", limit: $limit) {
      ${HOTLINE_INBOX_THREAD_FIELDS}
    }
    groundMessages(groundSourceId: $groundSourceId, limit: $limit) {
      ${HOTLINE_INBOX_MESSAGE_FIELDS}
      ${withLanguage ? "language" : ""}
    }
  }
`;
}

const HOTLINE_INBOX_LIMIT = 500;

const RETRY_GROUND_MESSAGE_MUTATION = `
  mutation RetryGroundMessage($messageId: String!, $stage: GroundPipelineStage!) {
    retryGroundMessage(messageId: $messageId, stage: $stage) {
      id
      enrichFailedAt
      transcribeFailedAt
    }
  }
`;

/** A thread's message ids, texts and detected languages — what a
 * translation request fans out over (clear-api translates per message; the
 * inbox shows per thread). */
const THREAD_MESSAGE_TEXTS_QUERY = `
  query GroundThreadMessageTexts($id: String!) {
    groundThread(id: $id) {
      messages { id text language }
    }
  }
`;

const REQUEST_GROUND_MESSAGE_TRANSLATION_MUTATION = `
  mutation RequestGroundMessageTranslation($messageId: String!, $locale: String!) {
    requestGroundMessageTranslation(messageId: $messageId, locale: $locale) {
      status
      text
    }
  }
`;

const THREAD_TRANSLATION_QUERY = `
  query GroundThreadTranslation($id: String!, $locale: String!) {
    groundThread(id: $id) {
      messages {
        id
        text
        language
        translation(locale: $locale) { status text }
      }
    }
  }
`;

/** Translation procedures' input: the entry (thread) and the reader's UI
 * locale, which is also the target (`en` included — hotline text is
 * usually Arabic). */
const translationInput = z.object({ threadId: z.string(), locale: z.enum(locales) });

const TRANSLATION_FLAG = "hotline_translation";
const UNAVAILABLE: GroundTranslationState = { status: "unavailable", text: null };
/** At most this many translation requests to clear-api at once per entry. */
const TRANSLATION_CONCURRENCY = 4;

interface ThreadMessageText {
  id: string;
  text: string;
  language: string | null;
}

/** A message already in the target locale needs no translation: its own
 * words stand in for it (and no LLM call paraphrases them). */
function alreadyIn(locale: string, m: ThreadMessageText): GroundTranslationState | null {
  return m.language === locale ? { status: "ready", text: m.text } : null;
}

/** `fn` over `items`, at most `limit` at a time, results in input order. */
async function mapWithConcurrency<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  async function worker(): Promise<void> {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i]!);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

export const groundRouter = createTRPCRouter({
  /** Per-source policy records — drives source names + reviewerRoles gating. */
  sources: protectedProcedure.query(async ({ ctx }) => {
    const data = await graphqlFetch<{ groundSources: GqlGroundSource[] }>(
      GROUND_SOURCES_QUERY,
      {},
      cookieHeaders(ctx),
    );
    return data.groundSources;
  }),

  /** Review queue: threads (clusters of staged Signals), newest first
   *  (clear-api ordering). */
  threads: protectedProcedure
    .input(
      z
        .object({
          groundSourceId: z.string().optional(),
          reviewState: z.string().optional(),
          limit: z.number().int().min(1).max(500).optional(),
          offset: z.number().int().min(0).optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const data = await graphqlFetch<{ groundThreads: GqlGroundThread[] }>(
        GROUND_THREADS_QUERY,
        {
          groundSourceId: input?.groundSourceId,
          reviewState: input?.reviewState,
          limit: input?.limit ?? 200,
          offset: input?.offset ?? 0,
        },
        cookieHeaders(ctx),
      );
      return data.groundThreads;
    }),

  /** One thread with its source policy record and messages (oldest first). */
  thread: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const data = await graphqlFetch<{ groundThread: GqlGroundThreadDetail | null }>(
        GROUND_THREAD_QUERY,
        { id: input.id },
        cookieHeaders(ctx),
      );
      return data.groundThread;
    }),

  /**
   * Review a thread: approve_private | approve_public | reject.
   * clear-api enforces the per-source reviewerRoles policy and the V1
   * state machine (approved_public is terminal and triggers promotion
   * into the signals graph with all sender identity scrubbed).
   */
  review: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        decision: z.enum(["approve_private", "approve_public", "reject"]),
        note: z.string().max(2000).optional(),
        /** reject only (clear-api#625). */
        rejectReason: z.enum(REJECT_REASONS).optional(),
        /** approve_public only (clear-api#625): the reviewer's edits, carried
         * into the promoted signal. Blank title/description = thread default. */
        overrides: z
          .object({
            title: z.string().max(1000).optional(),
            description: z.string().max(20000).optional(),
            severity: z.number().int().min(1).max(5).nullable().optional(),
            locationId: z.string().min(1).optional(),
          })
          .optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const data = await graphqlFetch<{ reviewGroundThread: GqlGroundThread }>(
        REVIEW_GROUND_THREAD_MUTATION,
        {
          id: input.id,
          decision: input.decision,
          note: input.note ?? null,
          rejectReason: input.rejectReason ?? null,
          overrides: input.overrides ?? null,
        },
        cookieHeaders(ctx),
      );
      return data.reviewGroundThread;
    }),

  /**
   * Hotline inbox (/inbox): every active hotline source with its open
   * (unverified) threads and staged messages incl. presigned media URLs.
   * Group sources are excluded — the inbox is the hotline review surface;
   * group capture stays in the detection Ground intel tab.
   */
  hotlineInbox: protectedProcedure.query(async ({ ctx }): Promise<GqlHotlineInbox> => {
    const [{ groundSources }, withLanguage] = await Promise.all([
      graphqlFetch<{ groundSources: GqlGroundSource[] }>(GROUND_SOURCES_QUERY, {}, cookieHeaders(ctx)),
      readFeatureFlag(TRANSLATION_FLAG, cookieHeaders(ctx)),
    ]);
    const sources = groundSources.filter((s) => s.kind === "hotline" && s.isActive);
    const query = hotlineInboxSourceQuery(withLanguage);
    const perSource = await Promise.all(
      sources.map((s) =>
        graphqlFetch<{ groundThreads: GqlGroundInboxThread[]; groundMessages: GqlGroundInboxMessage[] }>(
          query,
          { groundSourceId: s.id, limit: HOTLINE_INBOX_LIMIT },
          cookieHeaders(ctx),
        ),
      ),
    );
    return {
      sources,
      threads: perSource.flatMap((r) => r.groundThreads),
      // Unselected while translation is off: unknown. (The button is hidden
      // then anyway; with it on, unknown offers translation, and the router
      // keeps any message already in the locale as written.)
      messages: perSource.flatMap((r) => r.groundMessages.map((m) => ({ ...m, language: m.language ?? null }))),
    };
  }),

  /**
   * Clear one pipeline stage's failure marker on a message so the drain
   * picks it up again on its next run (clear-api retryGroundMessage,
   * admin/analyst). Idempotent: an unmarked stage is a no-op.
   */
  retryMessage: protectedProcedure
    .input(z.object({ messageId: z.string().min(1), stage: z.enum(GROUND_PIPELINE_STAGES) }))
    .mutation(async ({ ctx, input }) => {
      const data = await graphqlFetch<{
        retryGroundMessage: { id: string; enrichFailedAt: string | null; transcribeFailedAt: string | null };
      }>(RETRY_GROUND_MESSAGE_MUTATION, { messageId: input.messageId, stage: input.stage }, cookieHeaders(ctx));
      return data.retryGroundMessage;
    }),

  /**
   * On-demand translation of an inbox entry into the reader's locale
   * (clear-api#627, drained by clear-pipeline#626), while `hotline_translation`
   * is on. The entry is a thread; clear-api translates per message, so this
   * requests every message that has text and isn't already in the locale,
   * and folds their states into one (combineTranslations):
   *   request -> queued (poll `translation`) -> ready | unavailable
   * Idempotent server-side: re-requesting a ready or queued message costs
   * nothing, and an unavailable one is queued again (the inbox's retry). One
   * message failing doesn't fail the rest. The original text is never changed.
   */
  requestTranslation: protectedProcedure
    .input(translationInput)
    .mutation(async ({ ctx, input }): Promise<GroundTranslationState> => {
      if (!(await readFeatureFlag(TRANSLATION_FLAG, cookieHeaders(ctx)))) return UNAVAILABLE;
      const { groundThread } = await graphqlFetch<{
        groundThread: { messages: ThreadMessageText[] } | null;
      }>(THREAD_MESSAGE_TEXTS_QUERY, { id: input.threadId }, cookieHeaders(ctx));
      const states = await mapWithConcurrency(
        textMessages(groundThread?.messages ?? []),
        TRANSLATION_CONCURRENCY,
        async (m) => {
          const same = alreadyIn(input.locale, m);
          if (same) return same;
          try {
            const data = await graphqlFetch<{ requestGroundMessageTranslation: GroundTranslationState }>(
              REQUEST_GROUND_MESSAGE_TRANSLATION_MUTATION,
              { messageId: m.id, locale: input.locale },
              cookieHeaders(ctx),
            );
            return data.requestGroundMessageTranslation;
          } catch (err) {
            // Ids only: hotline text never goes to the logs.
            console.error(`requestGroundMessageTranslation failed for message ${m.id}:`, err);
            return UNAVAILABLE;
          }
        },
      );
      return combineTranslations(states);
    }),

  /** Current translation state of an entry — polled while `queued`. */
  translation: protectedProcedure
    .input(translationInput)
    .query(async ({ ctx, input }): Promise<GroundTranslationState> => {
      if (!(await readFeatureFlag(TRANSLATION_FLAG, cookieHeaders(ctx)))) return UNAVAILABLE;
      const { groundThread } = await graphqlFetch<{
        groundThread: {
          messages: Array<ThreadMessageText & { translation: GroundTranslationState }>;
        } | null;
      }>(THREAD_TRANSLATION_QUERY, { id: input.threadId, locale: input.locale }, cookieHeaders(ctx));
      return combineTranslations(
        textMessages(groundThread?.messages ?? []).map((m) => alreadyIn(input.locale, m) ?? m.translation),
      );
    }),

  /** Staged messages, oldest first (clear-api ordering). */
  messages: protectedProcedure
    .input(
      z
        .object({
          groundSourceId: z.string().optional(),
          threadId: z.string().optional(),
          limit: z.number().int().min(1).max(1000).optional(),
          offset: z.number().int().min(0).optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const data = await graphqlFetch<{ groundMessages: GqlGroundMessage[] }>(
        GROUND_MESSAGES_QUERY,
        {
          groundSourceId: input?.groundSourceId,
          threadId: input?.threadId,
          limit: input?.limit ?? 500,
          offset: input?.offset ?? 0,
        },
        cookieHeaders(ctx),
      );
      return data.groundMessages;
    }),
});
