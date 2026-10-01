"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Box, Loader, Text } from "@mantine/core";
import { IconX } from "@tabler/icons-react";
import { api } from "~/trpc/react";
import { useFeatureEnabled } from "~/components/feature-flags-provider";
import { isPlatformAdmin } from "~/lib/roles";
import { canReviewSource } from "~/lib/ground-review";
import {
  INBOX_FILTERS,
  buildInboxEntries,
  countByFilter,
  loadReadIds,
  moveSelection,
  nextSelection,
  saveReadIds,
  visibleEntries,
  type InboxFailure,
  type InboxFilter,
  type InboxSort,
  type RejectReason,
} from "~/lib/hotline-inbox";
import { EntryList } from "./_components/entry-list";
import { ReadingPane } from "./_components/reading-pane";
import { AddToClearModal, type SignalDraft } from "./_components/add-to-clear-modal";
import styles from "./inbox.module.css";

/**
 * Hotline inbox: ERM triage of WhatsApp hotline submissions.
 *
 * One entry per open (unverified) ground thread from an active hotline
 * source. Actions map 1:1 onto clear-api's ground review state machine:
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
  const utils = api.useUtils();

  const enabled = useFeatureEnabled("hotline_inbox");
  const { data: authData, isLoading: authLoading } = api.auth.me.useQuery(undefined, { staleTime: 60_000 });
  const role = authData?.user?.role;
  const canSee = enabled && isPlatformAdmin(role);

  const inboxQuery = api.ground.hotlineInbox.useQuery(undefined, {
    enabled: canSee,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  const entries = useMemo(
    () => (inboxQuery.data ? buildInboxEntries(inboxQuery.data) : []),
    [inboxQuery.data],
  );
  const sourceById = useMemo(() => {
    const m = new Map<string, string[]>();
    for (const s of inboxQuery.data?.sources ?? []) m.set(s.id, s.reviewerRoles);
    return m;
  }, [inboxQuery.data]);

  const [filter, setFilter] = useState<InboxFilter>("reports");
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
  useEffect(() => setReadIds(loadReadIds()), []);

  const counts = useMemo(() => countByFilter(entries), [entries]);
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
      setReadIds((prev) => {
        if (prev.has(id)) return prev;
        const next = new Set(prev).add(id);
        saveReadIds(next);
        return next;
      });
    }
  }, []);

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
      setReadIds((prev) => {
        if (prev.has(first)) return prev;
        const next = new Set(prev).add(first);
        saveReadIds(next);
        return next;
      });
    }
  }, [visible, selectedId]);

  const canReviewSelected =
    !!selected && canReviewSource(role, sourceById.get(selected.thread.groundSourceId) ?? []);

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
  }, [selected, busy, retryMessage, utils, showToast, t]); // eslint-disable-line react-hooks/exhaustive-deps

  const archive = useCallback(() => {
    if (!selected || busy) return;
    review.mutate(
      { id: selected.id, decision: "approve_private" },
      {
        onSuccess: () => afterAction(selected.id, { message: t("toast.archived") }),
        onError: (err) => setActionError(errorMessage(err)),
      },
    );
  }, [selected, busy, review, afterAction, t]); // eslint-disable-line react-hooks/exhaustive-deps

  const reject = useCallback(
    (reason: RejectReason) => {
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
    [selected, busy, review, afterAction, t], // eslint-disable-line react-hooks/exhaustive-deps
  );

  /**
   * Promotion is one atomic mutation: approve_public creates the signal
   * with the reviewer's edits applied (clear-api#625 overrides). If it
   * fails, nothing was written — the thread stays reviewable and the
   * modal stays open with the error.
   */
  const confirmAdd = useCallback(
    (draft: SignalDraft) => {
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
    [selected, busy, review, afterAction, t], // eslint-disable-line react-hooks/exhaustive-deps
  );

  // Keyboard: Escape closes modal > popover; A/E/R act; J/K move.
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
          if (canReviewSelected && selected) { setRejectOpen(false); setAddOpen(true); }
          break;
        case "e":
          if (canReviewSelected) archive();
          break;
        case "r":
          if (canReviewSelected && selected) setRejectOpen((v) => !v);
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [addOpen, rejectOpen, visible, selectedId, selected, canReviewSelected, select, archive]);

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
          <span className={styles.awaiting}>{t("awaiting", { count: counts.all })}</span>
          {inboxQuery.isFetching && <Loader size={12} />}
          {inboxQuery.error && (
            <span className={styles.actionError}>{t("loadError")}</span>
          )}
        </div>
        <div className={styles.filters} data-testid="inbox-filters">
          {INBOX_FILTERS.map((f) => (
            <button
              type="button"
              key={f}
              className={styles.filterPill}
              data-active={filter === f}
              data-testid={`inbox-filter-${f}`}
              onClick={() => { setFilter(f); setRejectOpen(false); }}
            >
              {t(`filters.${f}`)}
              <span className={styles.filterCount}>{counts[f]}</span>
            </button>
          ))}
        </div>
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
        />
        <ReadingPane
          entry={selected}
          canReview={canReviewSelected}
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

      {addOpen && selected && (
        <AddToClearModal
          entry={selected}
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
