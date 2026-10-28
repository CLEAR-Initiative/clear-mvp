"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Box, Loader, Text } from "@mantine/core";
import { IconX } from "@tabler/icons-react";
import { api } from "~/trpc/react";
import { useFeatureEnabled } from "~/components/feature-flags-provider";
import { inboxAccess } from "~/lib/inbox-access";
import { isEmergencyResponseManager, isTeamAdmin } from "~/lib/roles";
import { canReviewSource } from "~/lib/ground-review";
import {
  buildCaseGroupEntries,
  buildInboxEntries,
  countByFilter,
  countUnreadByFilter,
  filtersFor,
  isHotlineEntry,
  loadReadIds,
  moveSelection,
  nextSelection,
  readMarks,
  saveReadIds,
  tabsFor,
  visibleEntries,
  withDecision,
  type InboxEntry,
  type InboxFailure,
  type InboxFilter,
  type InboxSort,
  type InboxTab,
  type RejectReason,
} from "~/lib/hotline-inbox";
import type { GqlCaseProposal, GqlCaseProposalDecision, GqlReviewCaseProposal } from "~/lib/types/graphql";
import { proposalQueueMatchesServer, publishInboxUnread } from "~/lib/inbox-badge";
import { EntryList } from "./_components/entry-list";
import { ReadingPane } from "./_components/reading-pane";
import { AddToClearModal, type SignalDraft } from "./_components/add-to-clear-modal";
import styles from "./inbox.module.css";

/** Opening a row records its id, and for a case group each undecided case,
 * so a proposal that arrives later on that Event counts as unread. */
function rememberOpened(prev: Set<string>, id: string, entries: readonly InboxEntry[]): Set<string> {
  const entry = entries.find((e) => e.id === id);
  const marks = entry ? readMarks(entry) : [id];
  if (marks.every((mark) => prev.has(mark))) return prev;
  const next = new Set(prev);
  for (const mark of marks) next.add(mark);
  saveReadIds(next);
  return next;
}

/**
 * Inbox: Review items of two kinds, each under its own tab (see
 * InboxEntry.kind), shown only to readers who may see that kind
 * (src/lib/inbox-access.ts).
 *
 * Community signals (hotline threads): ERM and admin triage of WhatsApp hotline submissions. One entry
 * per open (unverified) ground thread from an active hotline source.
 * Actions map 1:1 onto clear-api's ground review state machine:
 *   Add to CLEAR -> approve_public, carrying the reviewer's edits (title,
 *                   description, severity, location) as promotion overrides
 *   Archive      -> approve_private
 *   Reject       -> rejected, with the structured rejectReason
 *
 * Retry (entries the pipeline gave up on) -> retryGroundMessage per failed
 *                   stage, then refetch; the entry goes back to "pending"
 *
 * Acted-on entries leave the queue (they are no longer unverified). There
 * is no Undo: approved_public is terminal and nothing transitions back to
 * unverified, so the toast only confirms.
 *
 * PRIVACY: hotline entries carry no sender identity. Only the per-
 * conversation pseudonym is shown (as an intake ref).
 *
 * Proposed signals (clear-api V4 web cases, CaseProposal): the proposed
 * cases grouped under the Event whose enrichment produced them, one Review
 * item per Event, for the deciders (admins and analysts),
 * each case with its own Accept / Reject (the same row the Event page
 * mounts). A decided case turns to its decision in place and stays in its
 * group until the Inbox is reloaded; the awaiting line is the undecided
 * cases. The small number on each tab and filter is how many of those rows
 * are still unopened, so it drops as soon as a row is opened or reviewed.
 */

const TOAST_MS = 6000;

interface Toast {
  message: string;
  signalId?: string | null;
}

interface RetryState {
  pending: boolean;
  error: string | null;
}

/** Drop settled retries (their errors belong to the entry the reader is
 * leaving) but keep the ones still running. */
function pendingOnly(prev: Record<string, RetryState>): Record<string, RetryState> {
  const entries = Object.entries(prev).filter(([, r]) => r.pending);
  return entries.length === Object.keys(prev).length ? prev : Object.fromEntries(entries);
}

export default function InboxPage() {
  const t = useTranslations("inbox");
  const tCases = useTranslations("caseReview");
  const utils = api.useUtils();

  const hotlineInbox = useFeatureEnabled("hotline_inbox");
  const translation = useFeatureEnabled("hotline_translation");
  const impactPriorReview = useFeatureEnabled("impact_prior_review");
  const { data: authData, isLoading: authLoading } = api.auth.me.useQuery(undefined, { staleTime: 60_000 });
  const role = authData?.user?.role;
  // An emergency_response_manager (global viewer + ERM team membership) reaches
  // the hotline inbox even though their global role is only viewer.
  const teamMemberships = authData?.user?.teamMemberships;
  const isErm = isEmergencyResponseManager(teamMemberships);
  // One rule with the nav entry (src/lib/inbox-access.ts): the page shows
  // for whichever kinds the reader may see, and lists only those.
  const access = inboxAccess({ role, teamMemberships, isErm, hotlineInbox, impactPriorReview });
  const canSee = access.any;
  /** Deciders see the proposed signals beside the hotline threads. */
  const canDecide = access.proposals;

  const inboxQuery = api.ground.hotlineInbox.useQuery(undefined, {
    enabled: access.hotline,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
  // Every proposed case, page by page (the router reads clear-api's pages
  // until they run out): one enrichment can propose dozens, so one page of
  // 200 would leave older cases with no row to decide them from.
  const casesQuery = api.tasks.proposedCaseProposals.useQuery(undefined, {
    enabled: access.proposals,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
  // Same query the nav badge polls. Publishing the unread count against
  // this total lets the badge follow proposals that arrive after the
  // reader leaves the Inbox.
  const reviewCount = api.tasks.reviewCount.useQuery(undefined, {
    enabled: access.proposals,
    staleTime: 60_000,
  });
  /** Cases decided in this session, as their decision (or, after a
   * CONFLICT, the Event's own copy) returned them: they keep their row,
   * now showing the decision, after the proposed list stops returning
   * them. */
  const [decidedCases, setDecidedCases] = useState<Record<string, GqlReviewCaseProposal>>({});

  /** Hotline threads reviewed this visit. They leave the queue before the
   * refetch returns, so the counts do not sit on the old total. */
  const [dismissedIds, setDismissedIds] = useState<ReadonlySet<string>>(() => new Set());

  const entries = useMemo<InboxEntry[]>(() => {
    const built: InboxEntry[] = [
      ...(inboxQuery.data ? buildInboxEntries(inboxQuery.data) : []),
      ...(casesQuery.data ? buildCaseGroupEntries(casesQuery.data, decidedCases) : []),
    ];
    return dismissedIds.size === 0 ? built : built.filter((entry) => !dismissedIds.has(entry.id));
  }, [inboxQuery.data, casesQuery.data, decidedCases, dismissedIds]);
  const sourceById = useMemo(() => {
    const m = new Map<string, string[]>();
    for (const s of inboxQuery.data?.sources ?? []) m.set(s.id, s.reviewerRoles);
    return m;
  }, [inboxQuery.data]);

  const tabs = useMemo(() => tabsFor(access), [access.hotline, access.proposals]); // eslint-disable-line react-hooks/exhaustive-deps
  const [chosenTab, setTab] = useState<InboxTab>("community");
  const [chosenFilter, setFilter] = useState<InboxFilter>("reports");
  // The tab and filter in force are derived, never synced: the session and
  // the feature flags land at different times, and a fallback stored while
  // nothing applied yet would stick. A reader without the hotline starts on
  // the first tab they have (proposals); a choice that stops applying (flag
  // flipped) falls back the same way. Each tab keeps the filter last chosen
  // in it only while that filter belongs to the tab.
  const tab: InboxTab = tabs.includes(chosenTab) ? chosenTab : (tabs[0] ?? "community");
  const filters = useMemo(() => filtersFor(tab), [tab]);
  const filter: InboxFilter = filters.includes(chosenFilter) ? chosenFilter : filters[0]!;
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<InboxSort>("reportsFirst");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mobilePane, setMobilePane] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  /** Retries by entry id. Keyed so a retry that outlives its selection
   * (J/K mid-retry) never shows its spinner, error or toast on another entry. */
  const [retries, setRetries] = useState<Record<string, RetryState>>({});
  const selectedIdRef = useRef(selectedId);
  useEffect(() => { selectedIdRef.current = selectedId; }, [selectedId]);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [readIds, setReadIds] = useState<Set<string>>(() => new Set());
  const [readReady, setReadReady] = useState(false);
  useEffect(() => {
    setReadIds(loadReadIds());
    setReadReady(true);
  }, []);

  const counts = useMemo(() => countByFilter(entries), [entries]);
  const unreadCounts = useMemo(() => countUnreadByFilter(entries, readIds), [entries, readIds]);
  // Wait until the stored read set and the proposal list have landed.
  // Publishing earlier would flash the full queue, then hide a badge the
  // server still has while the list is in flight.
  const serverProposals = reviewCount.data?.count;
  const serverCapped = reviewCount.data?.capped === true;
  useEffect(() => {
    if (!readReady || !access.proposals || casesQuery.isLoading || casesQuery.isError) return;
    if (casesQuery.isFetching || reviewCount.isFetching || reviewCount.isError) return;
    if (serverProposals == null) return;
    if (!proposalQueueMatchesServer(counts.proposals, serverProposals, serverCapped)) return;
    publishInboxUnread(unreadCounts.proposals, serverProposals);
  }, [
    readReady,
    access.proposals,
    casesQuery.isLoading,
    casesQuery.isError,
    casesQuery.isFetching,
    reviewCount.isFetching,
    reviewCount.isError,
    counts.proposals,
    unreadCounts.proposals,
    serverProposals,
    serverCapped,
  ]);
  const visible = useMemo(() => visibleEntries(entries, filter, search, sort), [entries, filter, search, sort]);
  const selected = useMemo(() => entries.find((e) => e.id === selectedId) ?? null, [entries, selectedId]);

  const showToast = useCallback((next: Toast) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast(next);
    toastTimer.current = setTimeout(() => setToast(null), TOAST_MS);
  }, []);
  useEffect(() => () => { if (toastTimer.current) clearTimeout(toastTimer.current); }, []);

  const select = useCallback((id: string | null) => {
    setSelectedId(id);
    setRejectOpen(false);
    setAddOpen(false);
    setActionError(null);
    setRetries(pendingOnly);
    setToast(null);
    if (id) {
      setMobilePane(true);
      setReadIds((prev) => rememberOpened(prev, id, entries));
    }
  }, [entries]);

  // Selection follows the visible list: nothing selected picks the top,
  // a selection that scrolled out of the filter is dropped.
  useEffect(() => {
    if (visible.length === 0) {
      if (selectedId !== null) setSelectedId(null);
      return;
    }
    if (!selectedId || !visible.some((e) => e.id === selectedId)) {
      const first = visible[0]!.id;
      setSelectedId(first);
      setReadIds((prev) => rememberOpened(prev, first, visible));
    }
  }, [visible, selectedId]);

  /** Hotline review rights follow the selected thread's source; a Review
   * item of another kind has its own gate (canDecide). */
  const selectedThread = selected && isHotlineEntry(selected) ? selected : null;
  const canReviewSelected =
    !!selectedThread &&
    canReviewSource(role, sourceById.get(selectedThread.thread.groundSourceId) ?? [], isErm || isTeamAdmin(teamMemberships));

  const review = api.ground.review.useMutation();
  const selectedRetry = selectedId ? retries[selectedId] : undefined;
  // Review actions and Retry on the same entry exclude each other: archiving
  // a thread while its messages go back on the queue would re-enrich (and
  // pay for) a thread that is already reviewed.
  const busy = review.isPending || !!selectedRetry?.pending;

  const afterAction = useCallback(
    (actedId: string, next: Toast) => {
      const nextId = nextSelection(visible, actedId);
      setSelectedId(nextId);
      setRejectOpen(false);
      setAddOpen(false);
      setActionError(null);
      setRetries(pendingOnly);
      showToast(next);
      setDismissedIds((prev) => {
        if (prev.has(actedId)) return prev;
        const nextIds = new Set(prev);
        nextIds.add(actedId);
        return nextIds;
      });
      void utils.ground.hotlineInbox.invalidate();
      void utils.ground.threads.invalidate();
      void utils.ground.messages.invalidate();
    },
    [visible, showToast, utils],
  );

  const errorMessage = (err: unknown) => (err instanceof Error ? err.message : t("loadError"));

  const retryMessage = api.ground.retryMessage.useMutation();

  /**
   * Clear every failure marker on the selected entry so the drains pick the
   * messages up again, then refetch. Each message's stages run in order
   * (transcription before enrichment, see InboxEntry.failures), but messages
   * settle independently: one that keeps failing does not hold the others
   * out of the queue. The refetch runs even after a partial failure, since
   * cleared stages are back in the queue either way. Not gated on the
   * source's reviewerRoles: retry is not a review decision, and clear-api
   * allows it to every admin/analyst.
   */
  const retry = useCallback(async () => {
    const selected = selectedThread;
    if (!selected || busy || selected.failures.length === 0) return;
    const entryId = selected.id;
    const setRetry = (state: RetryState | null) =>
      setRetries((prev) => {
        const next = { ...prev };
        if (state) next[entryId] = state;
        else delete next[entryId];
        return next;
      });
    setRetry({ pending: true, error: null });

    const byMessage = new Map<string, InboxFailure[]>();
    for (const f of selected.failures) byMessage.set(f.messageId, [...(byMessage.get(f.messageId) ?? []), f]);
    const results = await Promise.allSettled(
      [...byMessage.values()].map(async (stages) => {
        for (const f of stages) await retryMessage.mutateAsync({ messageId: f.messageId, stage: f.stage });
      }),
    );
    await utils.ground.hotlineInbox.invalidate().catch(() => undefined);

    const rejected = results.filter((r): r is PromiseRejectedResult => r.status === "rejected");
    if (rejected.length === 0) {
      setRetry(null);
      if (selectedIdRef.current === entryId) showToast({ message: t("toast.retried") });
      return;
    }
    const reason = errorMessage(rejected[0]!.reason);
    setRetry({
      pending: false,
      error:
        results.length > 1
          ? t("failure.partial", { done: results.length - rejected.length, total: results.length, error: reason })
          : reason,
    });
  }, [selectedThread, busy, retryMessage, utils, showToast, t]); // eslint-disable-line react-hooks/exhaustive-deps

  const archive = useCallback(() => {
    const selected = selectedThread;
    if (!selected || busy) return;
    review.mutate(
      { id: selected.id, decision: "approve_private" },
      {
        onSuccess: () => afterAction(selected.id, { message: t("toast.archived") }),
        onError: (err) => setActionError(errorMessage(err)),
      },
    );
  }, [selectedThread, busy, review, afterAction, t]); // eslint-disable-line react-hooks/exhaustive-deps

  const reject = useCallback(
    (reason: RejectReason) => {
      const selected = selectedThread;
      if (!selected || busy) return;
      const label = t(`rejectReasons.${reason}.label`);
      review.mutate(
        { id: selected.id, decision: "reject", rejectReason: reason },
        {
          onSuccess: () => afterAction(selected.id, { message: t("toast.rejected", { reason: label }) }),
          onError: (err) => setActionError(errorMessage(err)),
        },
      );
    },
    [selectedThread, busy, review, afterAction, t], // eslint-disable-line react-hooks/exhaustive-deps
  );

  /** A case was decided from its row: it keeps its place, now decided, and
   * the selection stays on its Event (its siblings may still wait). */
  const caseDecided = useCallback(
    (proposal: GqlReviewCaseProposal, decided: GqlCaseProposal, decision: GqlCaseProposalDecision) => {
      setDecidedCases((prev) => ({ ...prev, [proposal.id]: withDecision(proposal, decided) }));
      showToast({ message: tCases(`toast.${decision}`) });
    },
    [showToast, tCases],
  );

  /** Another decider got to a case first (CONFLICT): read the Event's copy
   * so the row shows what was decided, rather than stay decidable. */
  const caseStale = useCallback(
    (proposal: GqlReviewCaseProposal) => {
      void utils.tasks.forEvent
        .fetch({ eventId: proposal.eventId }, { staleTime: 0 })
        .then((data) => {
          const current = data?.caseProposals.find((c) => c.id === proposal.id);
          if (current) setDecidedCases((prev) => ({ ...prev, [proposal.id]: withDecision(proposal, current) }));
        })
        .catch(() => undefined);
    },
    [utils],
  );

  /**
   * Promotion is one atomic mutation: approve_public creates the signal
   * with the reviewer's edits applied (clear-api#625 overrides). If it
   * fails, nothing was written — the thread stays reviewable and the
   * modal stays open with the error.
   */
  const confirmAdd = useCallback(
    (draft: SignalDraft) => {
      const selected = selectedThread;
      if (!selected || busy) return;
      setActionError(null);
      review.mutate(
        {
          id: selected.id,
          decision: "approve_public",
          overrides: {
            title: draft.title,
            description: draft.description,
            severity: draft.severity,
            locationId: draft.locationId,
          },
        },
        {
          onSuccess: (thread) => {
            const signalId = thread.promotedSignalId;
            afterAction(
              selected.id,
              signalId ? { message: t("toast.added"), signalId } : { message: t("toast.addedNoSignal") },
            );
          },
          onError: (err) => setActionError(errorMessage(err)),
        },
      );
    },
    [selectedThread, busy, review, afterAction, t], // eslint-disable-line react-hooks/exhaustive-deps
  );

  // Keyboard: Escape closes modal > popover; A/E/R act (hotline threads
  // only: a case is decided on its own row); J/K move.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        // The Add to CLEAR modal handles its own Escape (Mantine Modal);
        // only the popover is ours.
        if (!addOpen && rejectOpen) setRejectOpen(false);
        return;
      }
      const target = e.target as HTMLElement | null;
      const typing = target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable);
      if (typing || addOpen || e.metaKey || e.ctrlKey || e.altKey) return;
      switch (e.key.toLowerCase()) {
        case "j":
          select(moveSelection(visible, selectedId, 1));
          break;
        case "k":
          select(moveSelection(visible, selectedId, -1));
          break;
        case "a":
          if (canReviewSelected && selectedThread) { setRejectOpen(false); setAddOpen(true); }
          break;
        case "e":
          if (canReviewSelected) archive();
          break;
        case "r":
          if (canReviewSelected && selectedThread) setRejectOpen((v) => !v);
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [addOpen, rejectOpen, visible, selectedId, selectedThread, canReviewSelected, select, archive]);

  if (authLoading) {
    return (
      <Box p={32} style={{ textAlign: "center" }}>
        <Loader size="sm" />
      </Box>
    );
  }
  if (!canSee) {
    return (
      <Box p={32}>
        <Text c="var(--color-text-muted)" style={{ fontSize: 13 }} data-testid="inbox-no-access">
          {t("noAccess")}
        </Text>
      </Box>
    );
  }

  return (
    <div className={styles.page} data-testid="inbox-page">
      <header className={styles.header}>
        <div className={styles.headerRow}>
          <span className={styles.title}>{t("title")}</span>
          <span className={styles.awaiting}>{t("awaiting", { count: counts.community + counts.proposals })}</span>
          {(inboxQuery.isFetching || casesQuery.isFetching) && <Loader size={12} />}
          {(inboxQuery.error || casesQuery.error) && (
            <span className={styles.actionError}>{t("loadError")}</span>
          )}
        </div>
        <div className={styles.tabs} role="tablist" data-testid="inbox-tabs">
          {tabs.map((tb) => (
            <button
              type="button"
              role="tab"
              key={tb}
              className={styles.tab}
              aria-selected={tab === tb}
              data-active={tab === tb}
              data-testid={`inbox-tab-${tb}`}
              onClick={() => { setTab(tb); setRejectOpen(false); }}
            >
              {t(`tabs.${tb}`)}
              <span className={styles.filterCount}>{unreadCounts[tb]}</span>
            </button>
          ))}
        </div>
        {filters.length > 1 && (
          <div className={styles.filters} data-testid="inbox-filters">
            {filters.map((f) => (
              <button
                type="button"
                key={f}
                className={styles.filterPill}
                data-active={filter === f}
                data-testid={`inbox-filter-${f}`}
                onClick={() => { setFilter(f); setRejectOpen(false); }}
              >
                {t(`filters.${f}`)}
                <span className={styles.filterCount}>{unreadCounts[f]}</span>
              </button>
            ))}
          </div>
        )}
      </header>

      <div className={styles.row} data-mobile-pane={mobilePane && selected !== null}>
        <EntryList
          entries={visible}
          selectedId={selectedId}
          readIds={readIds}
          search={search}
          sort={sort}
          onSearchChange={setSearch}
          onSortToggle={() => setSort((s) => (s === "reportsFirst" ? "newest" : "reportsFirst"))}
          onSelect={select}
          loading={
            (access.hotline && inboxQuery.isLoading) ||
            (access.proposals && casesQuery.isLoading)
          }
        />
        <ReadingPane
          entry={selected}
          translation={translation}
          canReview={canReviewSelected}
          canDecide={canDecide}
          onCaseDecided={caseDecided}
          onCaseStale={caseStale}
          busy={busy}
          error={actionError}
          rejectOpen={rejectOpen}
          onRejectOpenChange={setRejectOpen}
          onAdd={() => { setRejectOpen(false); setAddOpen(true); }}
          onArchive={archive}
          onReject={reject}
          onRetry={() => void retry()}
          retrying={!!selectedRetry?.pending}
          retryError={selectedRetry?.error ?? null}
          onBack={() => setMobilePane(false)}
        />
      </div>

      {addOpen && selectedThread && (
        <AddToClearModal
          entry={selectedThread}
          busy={busy}
          error={actionError}
          onCancel={() => {
            if (!busy) setAddOpen(false);
          }}
          onConfirm={confirmAdd}
        />
      )}

      {toast && (
        <div className={styles.toast} role="status" data-testid="inbox-toast">
          <span>{toast.message}</span>
          {toast.signalId && (
            <Link href={`/signal/${toast.signalId}`} className={styles.toastLink}>
              {t("toast.viewSignal")}
            </Link>
          )}
          <button type="button" className={styles.toastClose} onClick={() => setToast(null)} aria-label={t("toast.close")}>
            <IconX size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
