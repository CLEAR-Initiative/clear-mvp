"use client";

import { useEffect, useRef, useState } from "react";
import { isTypingTarget, stepListId } from "~/lib/detail-list-nav";

/** Idle debounce after key-repeat before committing the scrubbed id. */
export const DETAIL_SCRUB_SETTLE_MS = 200;

interface UseDetailKeyboardScrubOptions {
  enabled?: boolean;
  /** Ordered list ids (Detection or map feed). */
  ids: readonly string[];
  /** Route / query committed id (drives detail fetch). */
  committedId: string;
  /** Commit URL + active entity (single-tap and settle). */
  onCommit: (id: string) => void;
  settleMs?: number;
}

/**
 * Settle-to-commit ←/→ scrubbing for event/signal detail pages.
 *
 * - Single keydown (`!repeat`): advance chrome + commit immediately.
 * - Key-repeat: advance chrome only; commit once on keyup or idle debounce.
 * - Chevron clicks should call `onCommit` directly (bypass this hook).
 *
 * Map panel keyboard stays on {@link useDetailKeyboardNav} (immediate).
 */
export function useDetailKeyboardScrub({
  enabled = true,
  ids,
  committedId,
  onCommit,
  settleMs = DETAIL_SCRUB_SETTLE_MS,
}: UseDetailKeyboardScrubOptions): { scrubId: string } {
  const [scrubId, setScrubId] = useState(committedId);
  const scrubIdRef = useRef(scrubId);
  const idsRef = useRef(ids);
  const committedIdRef = useRef(committedId);
  const onCommitRef = useRef(onCommit);
  const settleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  scrubIdRef.current = scrubId;
  idsRef.current = ids;
  committedIdRef.current = committedId;
  onCommitRef.current = onCommit;

  // Browser back/forward or chevron commit → keep chrome in sync.
  useEffect(() => {
    setScrubId(committedId);
    scrubIdRef.current = committedId;
  }, [committedId]);

  useEffect(() => {
    if (!enabled) return;

    const clearSettle = () => {
      if (settleTimerRef.current != null) {
        clearTimeout(settleTimerRef.current);
        settleTimerRef.current = null;
      }
    };

    const commitIfNeeded = () => {
      clearSettle();
      const target = scrubIdRef.current;
      if (target && target !== committedIdRef.current) {
        onCommitRef.current(target);
      }
    };

    const scheduleSettle = () => {
      clearSettle();
      settleTimerRef.current = setTimeout(commitIfNeeded, settleMs);
    };

    const step = (delta: -1 | 1, repeat: boolean) => {
      const next = stepListId(idsRef.current, scrubIdRef.current, delta);
      if (!next) return;
      scrubIdRef.current = next;
      setScrubId(next);
      if (!repeat) {
        clearSettle();
        onCommitRef.current(next);
        return;
      }
      scheduleSettle();
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (isTypingTarget(e.target)) return;

      if (e.key === "ArrowLeft") {
        e.preventDefault();
        step(-1, e.repeat);
        return;
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        step(1, e.repeat);
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      commitIfNeeded();
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      clearSettle();
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [enabled, settleMs]);

  return { scrubId };
}
