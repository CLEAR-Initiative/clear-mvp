"use client";

import { useCallback, useRef, useState } from "react";
import type { TrackSave } from "./use-brief-items";

export type SaveStatus = "idle" | "saving" | "saved" | "error";

/** Marks one piece of the composer as typed-but-not-yet-saved (or not). */
export type SetDirty = (key: string, dirty: boolean) => void;

export interface SaveTracker {
  /** "saving" while anything is unsaved or in flight, then "saved", or "error" if the last batch had a failure. */
  status: SaveStatus;
  /** Counts a write (queued or running) until it settles. */
  track: TrackSave;
  setDirty: SetDirty;
  /** Registers a function that sends one editor's pending edit now; returns the unregister. */
  registerFlush: (key: string, flush: () => void) => () => void;
  /** Sends every editor's pending edit now. */
  flushAll: () => void;
  /** Whether leaving now would lose something. */
  hasUnsaved: () => boolean;
  /**
   * Resolves once no write is queued or running: true when no editor is
   * unsaved. Editors are marked saved only by a save's success (see
   * `createOrderedSaver`), so a failed text or note save keeps this false;
   * a refused item change is rolled back to what clear-api holds and doesn't
   * count.
   */
  settled: () => Promise<boolean>;
  /** Sends every editor's pending edit, waits for the queue to drain, then says whether everything saved. */
  saveAll: () => Promise<boolean>;
}

/** What an editor needs to take part in saving. */
export type Saver = Pick<SaveTracker, "track" | "setDirty" | "registerFlush">;

/** One save state for every write the composer makes. */
export function useSaveTracker(): SaveTracker {
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [dirtyCount, setDirtyCount] = useState(0);
  const running = useRef(0);
  const failed = useRef(false);
  const dirty = useRef(new Set<string>());
  const flushers = useRef(new Map<string, () => void>());
  const waiters = useRef<((ok: boolean) => void)[]>([]);

  const track = useCallback<TrackSave>((work) => {
    running.current += 1;
    setStatus("saving");
    const settle = (ok: boolean) => {
      running.current -= 1;
      if (!ok) failed.current = true;
      if (running.current === 0) {
        setStatus(failed.current ? "error" : "saved");
        failed.current = false;
        for (const resolve of waiters.current.splice(0)) resolve(dirty.current.size === 0);
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

  const registerFlush = useCallback((key: string, flush: () => void) => {
    flushers.current.set(key, flush);
    return () => {
      if (flushers.current.get(key) === flush) flushers.current.delete(key);
    };
  }, []);

  const flushAll = useCallback(() => {
    for (const flush of flushers.current.values()) flush();
  }, []);

  const hasUnsaved = useCallback(() => dirty.current.size > 0 || running.current > 0, []);

  const settled = useCallback(
    () =>
      running.current === 0
        ? Promise.resolve(dirty.current.size === 0)
        : new Promise<boolean>((resolve) => waiters.current.push(resolve)),
    [],
  );

  const saveAll = useCallback(() => {
    flushAll();
    return settled();
  }, [flushAll, settled]);

  return { status: dirtyCount > 0 ? "saving" : status, track, setDirty, registerFlush, flushAll, hasUnsaved, settled, saveAll };
}
