"use client";

import { useEffect, useRef, useState } from "react";
import { isTypingTarget, stepListId } from "~/lib/detail-list-nav";

/** Idle debounce after key-repeat before committing the scrubbed id. */
export const DETAIL_SCRUB_SETTLE_MS = 200;

/**
 * If a second keydown (repeat) arrives within this window, treat the first
 * keydown as the start of a hold — do not commit the intermediate id.
 * Longer than typical OS key-repeat delay (~30–50ms); short enough that a
 * true single tap still commits on keyup almost immediately.
 */
export const DETAIL_SCRUB_HOLD_DETECT_MS = 50;

interface UseDetailKeyboardScrubOptions {
  enabled?: boolean;
  /** Ordered list ids (Detection or map feed). */
  ids: readonly string[];
  /** Route / query committed id (drives detail fetch). */
  committedId: string;
  /** Commit URL + active entity (single-tap and settle). */
  onCommit: (id: string) => void;
  settleMs?: number;
  holdDetectMs?: number;
}

/**
 * Settle-to-commit ←/→ scrubbing for event/signal detail pages.
 *
 * - Single tap: advance chrome; commit on keyup (instant) — never loads a trail.
 * - Hold / key-repeat: chrome only until keyup or idle debounce; first keydown
 *   of a hold does **not** commit (avoids fetching event N+1 when jumping far).
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
  holdDetectMs = DETAIL_SCRUB_HOLD_DETECT_MS,
}: UseDetailKeyboardScrubOptions): { scrubId: string } {
  const [scrubId, setScrubId] = useState(committedId);
  const scrubIdRef = useRef(scrubId);
  const idsRef = useRef(ids);
  const committedIdRef = useRef(committedId);
  const onCommitRef = useRef(onCommit);
  const settleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const holdDetectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** True once we've seen `repeat` for this key press — suppress mid-hold commits. */
  const holdingRef = useRef(false);

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

    const clearHoldDetect = () => {
      if (holdDetectTimerRef.current != null) {
        clearTimeout(holdDetectTimerRef.current);
        holdDetectTimerRef.current = null;
      }
    };

    const commitIfNeeded = () => {
      clearSettle();
      clearHoldDetect();
      holdingRef.current = false;
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

      if (repeat) {
        // Confirmed hold — never commit intermediates.
        holdingRef.current = true;
        clearHoldDetect();
        scheduleSettle();
        return;
      }

      // First keydown: wait briefly to see if OS starts repeating (hold).
      holdingRef.current = false;
      clearHoldDetect();
      clearSettle();
      holdDetectTimerRef.current = setTimeout(() => {
        holdDetectTimerRef.current = null;
        // No repeat arrived → treat as single tap; commit now if keyup hasn't.
        if (!holdingRef.current) {
          commitIfNeeded();
        }
      }, holdDetectMs);
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
      clearHoldDetect();
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [enabled, settleMs, holdDetectMs]);

  return { scrubId };
}
