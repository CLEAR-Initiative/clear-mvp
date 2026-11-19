import { afterEach, describe, expect, it, vi } from "vitest";
import { clearSignedInCaches } from "./service-worker-caches";
import { SIGNED_OUT_CACHE, SIGNED_OUT_KEY } from "./signed-out-marker";
import { FakeCacheStorage } from "./fake-cache-storage.test-helper";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("clearSignedInCaches", () => {
  it("drops the signed-in user's pages and API responses but keeps the precache", async () => {
    const storage = new FakeCacheStorage();
    for (const name of [
      "workbox-precache-v2-https://app.clearinitiative.io/",
      "pages",
      "pages-rsc",
      "apis",
      "start-url",
      "static-js-assets",
    ]) {
      await storage.open(name);
    }
    vi.stubGlobal("caches", storage);

    await clearSignedInCaches();

    expect((await storage.keys()).sort()).toEqual([
      SIGNED_OUT_CACHE,
      "workbox-precache-v2-https://app.clearinitiative.io/",
    ]);
  });

  it("records when the sign-out happened, for the service worker to compare against", async () => {
    const storage = new FakeCacheStorage();
    vi.stubGlobal("caches", storage);
    vi.spyOn(Date, "now").mockReturnValue(1_700_000_000_000);

    await clearSignedInCaches();

    const marker = await storage.match(SIGNED_OUT_KEY, { cacheName: SIGNED_OUT_CACHE });
    expect(await marker?.text()).toBe("1700000000000");
  });

  it("does nothing where the browser has no Cache Storage", async () => {
    vi.stubGlobal("caches", undefined);
    await expect(clearSignedInCaches()).resolves.toBeUndefined();
  });

  it("still clears the caches when the sign-out record cannot be written (storage full)", async () => {
    const storage = new FakeCacheStorage();
    await storage.open("pages");
    await storage.open("apis");
    const full = () => Promise.reject(new DOMException("full", "QuotaExceededError"));
    const open = storage.open.bind(storage);
    vi.spyOn(storage, "open").mockImplementation(async (name: string) => ({ ...(await open(name)), put: full }));
    vi.stubGlobal("caches", storage);

    await clearSignedInCaches();

    expect(storage.entries("pages")).toBeUndefined();
    expect(storage.entries("apis")).toBeUndefined();
  });

  it("does not throw when the browser refuses storage", async () => {
    const denied = () => Promise.reject(new DOMException("denied", "SecurityError"));
    vi.stubGlobal("caches", { open: denied, keys: denied });
    await expect(clearSignedInCaches()).resolves.toBeUndefined();
  });
});
