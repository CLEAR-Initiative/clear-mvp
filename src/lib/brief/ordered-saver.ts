/**
 * Autosave for one editor (a Brief's text, or one item's note), built so
 * that "saved" can't be claimed early:
 *
 * - Every save of the editor goes through one ordered queue, so clear-api
 *   always ends on the newest value. Each save is told the value clear-api
 *   last confirmed when it starts, so it can send only what changed and
 *   leave fields another tab saved alone.
 * - The editor is unsaved while its latest value differs from the last value
 *   clear-api confirmed. Only a save's success moves that confirmed value,
 *   so a failed save leaves the editor unsaved.
 * - Each save's success and failure handling runs inside the work handed to
 *   `track`, so whoever waits on the tracker sees its outcome.
 * - Saves succeed in queue order, so `onSaved` sees confirmed values oldest
 *   first; `latest` says whether a newer save is queued behind.
 */

export interface OrderedSaverOptions<V, R> {
  initial: V;
  /** Whether two values save to the same thing. */
  same: (a: V, b: V) => boolean;
  /** Saves `value`; `confirmed` is what clear-api held when this save started. */
  save: (value: V, confirmed: V) => Promise<R>;
  /** After a save succeeds. `latest` is false when a newer save was queued after it. */
  onSaved?: (result: R, value: V, latest: boolean) => void;
  onError?: (err: unknown) => void;
  /** Counts the save, from queueing to its handlers having run. */
  track: <T>(work: Promise<T>) => Promise<T>;
  /** Told whether the editor holds something clear-api hasn't confirmed. */
  setDirty: (dirty: boolean) => void;
}

export interface OrderedSaver<V> {
  /** The editor's value changed. */
  set: (value: V) => void;
  /** Queue a save of the latest value, unless it is already saved or queued. */
  flush: () => void;
  /** Whether the latest value differs from what clear-api confirmed. */
  isDirty: () => boolean;
}

export function createOrderedSaver<V, R>(options: OrderedSaverOptions<V, R>): OrderedSaver<V> {
  const { same, save, onSaved, onError, track, setDirty } = options;
  let latest = options.initial;
  let queued = options.initial;
  let confirmed = options.initial;
  let queue: Promise<unknown> = Promise.resolve();
  let seq = 0;

  const isDirty = () => !same(latest, confirmed);
  const report = () => setDirty(isDirty());

  return {
    set(value) {
      latest = value;
      report();
    },
    flush() {
      if (same(latest, queued)) return;
      const value = latest;
      queued = value;
      const mine = ++seq;
      const run = () => save(value, confirmed);
      const write = queue.then(run, run).then(
        (result) => {
          confirmed = value;
          onSaved?.(result, value, mine === seq);
          report();
        },
        (err: unknown) => {
          // Nothing newer is queued to carry the value: let the next flush resend it.
          if (mine === seq) queued = confirmed;
          report();
          onError?.(err);
          throw err;
        },
      );
      queue = track(write).catch(() => undefined);
    },
    isDirty,
  };
}
