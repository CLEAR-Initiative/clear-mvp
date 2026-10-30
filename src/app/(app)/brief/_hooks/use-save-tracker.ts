"use client";

import { useCallback, useRef, useState } from "react";
import type { TrackSave } from "./use-brief-items";

export type SaveStatus = "idle" | "saving" | "saved" | "error";

/**
 * One "Saving… / Saved" state for every write the composer makes: saving
 * while any tracked write runs, then saved, or error when the last one to
 * finish failed.
 */
export function useSaveTracker(): { status: SaveStatus; track: TrackSave } {
  const [status, setStatus] = useState<SaveStatus>("idle");
  const running = useRef(0);
  const failed = useRef(false);

  const track = useCallback<TrackSave>((work) => {
    running.current += 1;
    setStatus("saving");
    const settle = (ok: boolean) => {
      running.current -= 1;
      if (!ok) failed.current = true;
      if (running.current === 0) {
        setStatus(failed.current ? "error" : "saved");
        failed.current = false;
      }
    };
    work.then(
      () => settle(true),
      () => settle(false),
    );
    return work;
  }, []);

  return { status, track };
}
