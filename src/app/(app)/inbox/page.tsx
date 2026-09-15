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
  type InboxFilter,
  type InboxSort,
  type RejectReason,
} from "~/lib/hotline-inbox";
import { EntryList } from "./_components/entry-list";
import { ReadingPane } from "./_components/reading-pane";
import { AddToClearModal } from "./_components/add-to-clear-modal";
import styles from "./inbox.module.css";

/**
 * Hotline inbox: ERM triage of WhatsApp hotline submissions.
 *
 * One entry per open (unverified) ground thread from an active hotline
 * source. Actions map 1:1 onto clear-api's ground review state machine:
 *   Add to CLEAR -> approve_public (promotion; then severity is applied)
 *   Archive      -> approve_private
 *   Reject       -> rejected, with the reason recorded in the review note
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
  const setSeverity = api.signals.updateSeverity.useMutation();
  const busy = review.isPending || setSeverity.isPending;

  const afterAction = useCallback(
    (actedId: string, next: Toast) => {
      const nextId = nextSelection(visible, actedId);
      setSelectedId(nextId);
      setRejectOpen(false);
      setAddOpen(false);
      setActionError(null);
      showToast(next);
      void utils.ground.hotlineInbox.invalidate();
      void utils.ground.threads.invalidate();
      void utils.ground.messages.invalidate();
    },
    [visible, showToast, utils],
  );

  const errorMessage = (err: unknown) => (err instanceof Error ? err.message : t("loadError"));

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
        { id: selected.id, decision: "reject", note: `${reason}: ${label}` },
        {
          onSuccess: () => afterAction(selected.id, { message: t("toast.rejected", { reason: label }) }),
          onError: (err) => setActionError(errorMessage(err)),
        },
      );
    },
    [selected, busy, review, afterAction, t], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const confirmAdd = useCallback(
    (severity: number | null) => {
      if (!selected || busy) return;
      review.mutate(
        { id: selected.id, decision: "approve_public" },
        {
          onSuccess: (thread) => {
            const signalId = thread.promotedSignalId;
            const done = () => afterAction(selected.id, { message: t("toast.added"), signalId });
            if (severity && signalId) {
              setSeverity.mutate(
                { id: signalId, severity },
                // Promotion already happened: a severity failure must not
                // leave the entry looking un-actioned.
                { onSuccess: done, onError: done },
              );
            } else {
              done();
            }
          },
          onError: (err) => setActionError(errorMessage(err)),
        },
      );
    },
    [selected, busy, review, setSeverity, afterAction, t], // eslint-disable-line react-hooks/exhaustive-deps
  );

  // Keyboard: Escape closes modal > popover; A/E/R act; J/K move.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (addOpen) setAddOpen(false);
        else if (rejectOpen) setRejectOpen(false);
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
          onBack={() => setMobilePane(false)}
        />
      </div>

      {addOpen && selected && (
        <AddToClearModal
          entry={selected}
          busy={busy}
          error={actionError}
          onCancel={() => { if (!busy) setAddOpen(false); }}
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
