import { afterEach, describe, expect, it, vi } from "vitest";
import { clearSignedInCaches } from "./service-worker-caches";

function stubCaches(names: string[]) {
  const deleted: string[] = [];
  vi.stubGlobal("caches", {
    keys: () => Promise.resolve(names),
    delete: (name: string) => {
      deleted.push(name);
      return Promise.resolve(true);
    },
  });
  return deleted;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("clearSignedInCaches", () => {
  it("drops the signed-in user's pages and API responses but keeps the precache", async () => {
    const deleted = stubCaches([
      "workbox-precache-v2-https://app.clearinitiative.io/",
      "pages",
      "pages-rsc",
      "apis",
      "start-url",
      "static-js-assets",
    ]);

    await clearSignedInCaches();

    expect(deleted.sort()).toEqual(["apis", "pages", "pages-rsc", "start-url", "static-js-assets"]);
  });

  it("does nothing where the browser has no Cache Storage", async () => {
    vi.stubGlobal("caches", undefined);
    await expect(clearSignedInCaches()).resolves.toBeUndefined();
  });

  it("does not throw when the browser refuses storage", async () => {
    vi.stubGlobal("caches", { keys: () => Promise.reject(new DOMException("denied", "SecurityError")) });
    await expect(clearSignedInCaches()).resolves.toBeUndefined();
  });
});
