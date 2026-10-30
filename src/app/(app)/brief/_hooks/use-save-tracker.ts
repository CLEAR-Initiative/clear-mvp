"use client";

import { useCallback, useRef, useState } from "react";
import type { TrackSave } from "./use-brief-items";

export type SaveStatus = "idle" | "saving" | "saved" | "error";

/** Marks one piece of the composer as typed-but-not-yet-sent (or not). */
export type SetDirty = (key: string, dirty: boolean) => void;

export interface SaveTracker {
  /** "saving" while anything is typed-but-unsent or in flight, then "saved", or "error" if a write failed. */
  status: SaveStatus;
  track: TrackSave;
  setDirty: SetDirty;
  /** Whether leaving now would lose something. */
  hasUnsaved: () => boolean;
  /**
   * Resolves once no write is in flight: true when every one of them
   * succeeded and nothing is left typed-but-unsent, so a send can refuse to
   * go out with older content.
   */
  settled: () => Promise<boolean>;
}

/** One save state for every write the composer makes. */
export function useSaveTracker(): SaveTracker {
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [dirtyCount, setDirtyCount] = useState(0);
  const running = useRef(0);
  const failed = useRef(false);
  const dirty = useRef(new Set<string>());
  const waiters = useRef<((ok: boolean) => void)[]>([]);
  // Whether the writes since the tracker last went idle all succeeded.
  const lastOk = useRef(true);

  const track = useCallback<TrackSave>((work) => {
    running.current += 1;
    setStatus("saving");
    const settle = (ok: boolean) => {
      running.current -= 1;
      if (!ok) failed.current = true;
      if (running.current === 0) {
        lastOk.current = !failed.current;
        setStatus(failed.current ? "error" : "saved");
        failed.current = false;
        for (const resolve of waiters.current.splice(0)) resolve(lastOk.current && dirty.current.size === 0);
      }
    };
    work.then(
      () => settle(true),
      () => settle(false),
    );
    return work;
  }, []);

  const setDirty = useCallback<SetDirty>((key, isDirty) => {
    if (isDirty) dirty.current.add(key);
    else dirty.current.delete(key);
    setDirtyCount(dirty.current.size);
  }, []);

  const hasUnsaved = useCallback(() => dirty.current.size > 0 || running.current > 0, []);

  const settled = useCallback(
    () =>
      running.current === 0
        ? Promise.resolve(lastOk.current && dirty.current.size === 0)
        : new Promise<boolean>((resolve) => waiters.current.push(resolve)),
    [],
  );

  return { status: dirtyCount > 0 ? "saving" : status, track, setDirty, hasUnsaved, settled };
}
