"use client";

import { useEffect } from "react";
import { isTypingTarget } from "~/lib/detail-list-nav";

interface UseDetailKeyboardNavOptions {
  enabled?: boolean;
  hasPrev: boolean;
  hasNext: boolean;
  onPrev: () => void;
  onNext: () => void;
}

/**
 * ← / → detail navigation when focus is not in an editable field.
 */
export function useDetailKeyboardNav({
  enabled = true,
  hasPrev,
  hasNext,
  onPrev,
  onNext,
}: UseDetailKeyboardNavOptions): void {
  useEffect(() => {
    if (!enabled) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (isTypingTarget(e.target)) return;

      if (e.key === "ArrowLeft" && hasPrev) {
        e.preventDefault();
        onPrev();
        return;
      }
      if (e.key === "ArrowRight" && hasNext) {
        e.preventDefault();
        onNext();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [enabled, hasPrev, hasNext, onPrev, onNext]);
}
