import type { Page } from "@playwright/test";
import { test, expect } from "../support/test";

/**
 * Case 28: a tab that outlives a deploy recovers instead of going blank.
 *
 * A deploy replaces every hashed file under /_next/static. A page loaded from
 * the previous build that then lazy-loads a chunk (the map on /detection is a
 * `next/dynamic` import) gets a 404, and with no error boundary Next showed
 * its blank "Application error" page (dev, 2026-11-09).
 *
 * To reproduce it, let the document and every chunk it names through, and 404
 * any chunk requested later. That's exactly what a deploy does to a lazy
 * chunk. The crash guard in support/test.ts also fails these tests if the
 * error escapes as an uncaught exception.
 */

const CHUNK = /\/_next\/static\/chunks\/[^"'\\\s]+\.js/g;
const RELOAD_KEY = "clear:chunk-reload-at";

/**
 * 404 lazily requested JS chunks on `path`'s first load. Returns a counter of
 * the chunks it failed. Later document loads (the recovery reload) are left
 * alone when `once` is true.
 */
async function failLazyChunks(page: Page, path: string, { once }: { once: boolean }) {
  const known = new Set<string>();
  let documents = 0;
  const failed = { count: 0 };

  await page.route(
    (url) => url.pathname === path,
    async (route) => {
      if (route.request().resourceType() !== "document") return route.continue();
      documents += 1;
      const response = await route.fetch();
      const html = await response.text();
      for (const m of html.matchAll(CHUNK)) known.add(m[0]);
      await route.fulfill({ response, body: html });
    },
  );

  await page.route("**/_next/static/chunks/**/*.js", async (route) => {
    const { pathname } = new URL(route.request().url());
    const blocking = !once || documents <= 1;
    if (blocking && !known.has(pathname)) {
      failed.count += 1;
      return route.fulfill({ status: 404, body: "" });
    }
    return route.continue();
  });

  return failed;
}

test.describe("Stale chunk after a deploy (case 28)", () => {
  test("reloads once and the page comes back", async ({ page }) => {
    const failed = await failLazyChunks(page, "/detection", { once: true });

    await page.goto("/detection", { waitUntil: "domcontentloaded" });

    // The boundary reloaded the page, which recorded the reload time.
    await expect
      .poll(() => page.evaluate((k) => sessionStorage.getItem(k), RELOAD_KEY), {
        timeout: 30_000,
      })
      .not.toBeNull();
    expect(failed.count).toBeGreaterThan(0);

    // After the reload the chunks load and the page works again.
    await expect(page.getByRole("tab", { name: "Events" })).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId("route-error")).toHaveCount(0);
  });

  test("shows a reload card instead of a blank page if reloading didn't help", async ({
    page,
  }) => {
    // A reload a moment ago means the loop guard refuses another one.
    await page.addInitScript((k) => sessionStorage.setItem(k, String(Date.now())), RELOAD_KEY);
    await failLazyChunks(page, "/detection", { once: false });

    await page.goto("/detection", { waitUntil: "domcontentloaded" });

    const card = page.getByTestId("route-error");
    await expect(card).toBeVisible({ timeout: 30_000 });
    await expect(card.getByText("CLEAR has been updated")).toBeVisible();
    await expect(card.getByRole("button", { name: "Reload page" })).toBeVisible();
    // The nav is still there: the boundary sits inside the app shell.
    await expect(page.getByRole("navigation").first()).toBeVisible();
  });
});
