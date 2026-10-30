import { describe, expect, it, vi } from "vitest";
import { createOrderedSaver } from "./ordered-saver";

/** A save the test resolves or rejects by hand. */
function deferred() {
  let resolve!: (v: string) => void;
  let reject!: (e: Error) => void;
  const promise = new Promise<string>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

/** A minimal tracker: counts work and drains. */
function tracker() {
  let running = 0;
  const waiters: (() => void)[] = [];
  return {
    track: <T,>(work: Promise<T>) => {
      running += 1;
      const done = () => {
        running -= 1;
        if (running === 0) waiters.splice(0).forEach((w) => w());
      };
      work.then(done, done);
      return work;
    },
    drain: () => (running === 0 ? Promise.resolve() : new Promise<void>((r) => waiters.push(r))),
  };
}

function setup() {
  const saves: { value: string; d: ReturnType<typeof deferred> }[] = [];
  const dirty: boolean[] = [];
  const onSaved = vi.fn();
  const t = tracker();
  const saver = createOrderedSaver<string, string>({
    initial: "a",
    same: (x, y) => x === y,
    save: (value) => {
      const d = deferred();
      saves.push({ value, d });
      return d.promise;
    },
    onSaved,
    onError: () => {},
    track: t.track,
    setDirty: (v) => dirty.push(v),
  });
  return { saver, saves, dirty, onSaved, drain: t.drain };
}

const tick = () => new Promise((r) => setTimeout(r, 0));

describe("createOrderedSaver", () => {
  it("stays unsaved after a failed last save, and resends on the next flush", async () => {
    const { saver, saves, drain } = setup();
    saver.set("b");
    saver.flush();
    await tick();
    saves[0]!.d.reject(new Error("refused"));
    await drain();
    expect(saver.isDirty()).toBe(true);
    saver.flush();
    await tick();
    expect(saves.map((s) => s.value)).toEqual(["b", "b"]);
    saves[1]!.d.resolve("ok");
    await drain();
    expect(saver.isDirty()).toBe(false);
  });

  it("is saved only once clear-api confirms, not when the save is queued", async () => {
    const { saver, saves, dirty, drain } = setup();
    saver.set("b");
    saver.flush();
    expect(saver.isDirty()).toBe(true);
    await tick();
    saves[0]!.d.resolve("ok");
    await drain();
    expect(saver.isDirty()).toBe(false);
    expect(dirty.at(-1)).toBe(false);
  });

  it("sends saves one at a time, and a drain waits for the one queued behind", async () => {
    const { saver, saves, drain } = setup();
    saver.set("b");
    saver.flush();
    saver.set("c");
    saver.flush();
    await tick();
    expect(saves.map((s) => s.value)).toEqual(["b"]);
    let drained = false;
    const waiting = drain().then(() => (drained = true));
    saves[0]!.d.resolve("ok b");
    await tick();
    expect(saves.map((s) => s.value)).toEqual(["b", "c"]);
    expect(drained).toBe(false);
    saves[1]!.d.resolve("ok c");
    await waiting;
    expect(saver.isDirty()).toBe(false);
  });

  it("marks only the newest save's answer as latest, so a stale one can't overwrite newer text", async () => {
    const { saver, saves, onSaved, drain } = setup();
    saver.set("b");
    saver.flush();
    saver.set("c");
    saver.flush();
    await tick();
    saves[0]!.d.resolve("ok b");
    await tick();
    saves[1]!.d.resolve("ok c");
    await drain();
    expect(onSaved.mock.calls.map(([result, , latest]) => [result, latest])).toEqual([
      ["ok b", false],
      ["ok c", true],
    ]);
  });

  it("doesn't queue a value already saved or queued", async () => {
    const { saver, saves } = setup();
    saver.flush();
    saver.set("b");
    saver.flush();
    saver.flush();
    await tick();
    expect(saves).toHaveLength(1);
  });
});
