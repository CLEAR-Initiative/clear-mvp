import { describe, expect, it, vi } from "vitest";
import {
  CHUNK_RELOAD_COOLDOWN_MS,
  CHUNK_RELOAD_KEY,
  claimChunkReload,
  isChunkLoadError,
  reloadOnceForChunkError,
} from "./chunk-load-error";

function memoryStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    data,
  };
}

describe("isChunkLoadError", () => {
  it("recognises webpack's ChunkLoadError by name", () => {
    const e = new Error("whatever");
    e.name = "ChunkLoadError";
    expect(isChunkLoadError(e)).toBe(true);
  });

  it.each([
    "Loading chunk 8113 failed.\n(error: https://dev.clearinitiative.io/_next/static/chunks/8113-abc.js)",
    "Loading chunk app/(app)/detection/page failed.",
    "Loading CSS chunk 4242 failed.",
    "Failed to fetch dynamically imported module: https://x/_next/static/chunks/a.js",
    "Importing a module script failed.",
    "error loading dynamically imported module",
  ])("recognises %s", (message) => {
    expect(isChunkLoadError(new Error(message))).toBe(true);
  });

  it("ignores ordinary errors and non-errors", () => {
    expect(isChunkLoadError(new TypeError("Cannot read properties of undefined"))).toBe(false);
    expect(isChunkLoadError(new Error("Failed to fetch"))).toBe(false);
    expect(isChunkLoadError("Loading chunk 1 failed")).toBe(false);
    expect(isChunkLoadError(null)).toBe(false);
    expect(isChunkLoadError(undefined)).toBe(false);
  });
});

describe("claimChunkReload", () => {
  it("allows the first reload and records when it happened", () => {
    const storage = memoryStorage();
    expect(claimChunkReload(storage, 1_000)).toBe(true);
    expect(storage.data.get(CHUNK_RELOAD_KEY)).toBe("1000");
  });

  it("refuses a second reload inside the cooldown, so it can't loop", () => {
    const storage = memoryStorage();
    expect(claimChunkReload(storage, 1_000)).toBe(true);
    expect(claimChunkReload(storage, 1_000 + CHUNK_RELOAD_COOLDOWN_MS - 1)).toBe(false);
  });

  it("allows another reload once the cooldown has passed (the next deploy)", () => {
    const storage = memoryStorage({ [CHUNK_RELOAD_KEY]: "1000" });
    expect(claimChunkReload(storage, 1_000 + CHUNK_RELOAD_COOLDOWN_MS)).toBe(true);
  });

  it("treats a garbled timestamp as no previous reload", () => {
    expect(claimChunkReload(memoryStorage({ [CHUNK_RELOAD_KEY]: "nope" }), 5)).toBe(true);
  });

  it("never reloads without storage or when storage throws", () => {
    expect(claimChunkReload(null, 1)).toBe(false);
    const throwing = {
      getItem: () => {
        throw new Error("SecurityError");
      },
      setItem: () => undefined,
    };
    expect(claimChunkReload(throwing, 1)).toBe(false);
  });
});

describe("reloadOnceForChunkError", () => {
  const chunkError = Object.assign(new Error("Loading chunk 1 failed."), {
    name: "ChunkLoadError",
  });

  it("reloads for a chunk error", () => {
    const reload = vi.fn();
    expect(reloadOnceForChunkError(chunkError, { storage: memoryStorage(), now: 1, reload })).toBe(true);
    expect(reload).toHaveBeenCalledOnce();
  });

  it("does not reload twice in a row", () => {
    const storage = memoryStorage();
    const reload = vi.fn();
    reloadOnceForChunkError(chunkError, { storage, now: 1, reload });
    expect(reloadOnceForChunkError(chunkError, { storage, now: 2, reload })).toBe(false);
    expect(reload).toHaveBeenCalledOnce();
  });

  it("leaves other errors to the error screen", () => {
    const reload = vi.fn();
    expect(
      reloadOnceForChunkError(new Error("boom"), { storage: memoryStorage(), now: 1, reload }),
    ).toBe(false);
    expect(reload).not.toHaveBeenCalled();
  });
});
