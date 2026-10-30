"use client";

import { useCallback, useRef, useState } from "react";
import type { TrackSave } from "./use-brief-items";

export type SaveStatus = "idle" | "saving" | "saved" | "error";

/**
 * One "Saving… / Saved" state for every write the composer makes: saving
 * while any tracked write runs, then saved, or error when one of them failed.
 * `settled()` resolves once nothing is running, so a send can wait for the
 * last edit to land.
 */
export function useSaveTracker(): { status: SaveStatus; track: TrackSave; settled: () => Promise<void> } {
  const [status, setStatus] = useState<SaveStatus>("idle");
  const running = useRef(0);
  const failed = useRef(false);
  const waiters = useRef<(() => void)[]>([]);

  const track = useCallback<TrackSave>((work) => {
    running.current += 1;
    setStatus("saving");
    const settle = (ok: boolean) => {
      running.current -= 1;
      if (!ok) failed.current = true;
      if (running.current === 0) {
        setStatus(failed.current ? "error" : "saved");
        failed.current = false;
        for (const resolve of waiters.current.splice(0)) resolve();
      }
    };
    work.then(
      () => settle(true),
      () => settle(false),
    );
    return work;
  }, []);

  const settled = useCallback(
    () => (running.current === 0 ? Promise.resolve() : new Promise<void>((resolve) => waiters.current.push(resolve))),
    [],
  );

  return { status, track, settled };
}
