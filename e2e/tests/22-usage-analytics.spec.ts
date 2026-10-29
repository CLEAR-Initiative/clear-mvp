import type { Page } from "@playwright/test";
import { test, expect } from "../support/test";
import { ANALYST } from "../support/data";

/**
 * Case 22 — usage analytics stay off unless configured. The e2e image is built
 * without NEXT_PUBLIC_UMAMI_* and the `usage_analytics` flag is off, so no
 * Umami script may load: not pre-login, not signed in. The admin / opted-out /
 * flag gates are covered by src/components/analytics/usage-tracker.test.tsx.
 * The Profile toggle and privacy notice are reachable either way, and the
 * opt-out lives on the account, so it holds in a fresh browser context.
 */
const TRACKER = 'script[src*="script.js"][data-website-id]';

test.describe("Usage analytics (case 22)", () => {
  test.describe("pre-login", () => {
    test.use({ storageState: { cookies: [], origins: [] } });
    test("the login page loads no tracker", async ({ page }) => {
      await page.goto("/auth/login");
      await expect(page.getByRole("button", { name: "Sign In" })).toBeVisible();
      await expect(page.locator(TRACKER)).toHaveCount(0);
    });
  });

  test("global admin: no tracker and no toggle", async ({ page }) => {
    // Suite-wide storageState is the seeded ADMIN.
    await page.goto("/profile");
    await expect(page.getByText("Global admins are never tracked.")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole("switch", { name: /Help improve CLEAR/ })).toHaveCount(0);
    await expect(page.locator(TRACKER)).toHaveCount(0);
  });

  test.describe("member", () => {
    test.use({ storageState: { cookies: [], origins: [] } });
    async function signIn(page: Page) {
      await page.goto("/auth/login");
      await page.getByLabel("Email").fill(ANALYST.email);
      await page.getByLabel("Password").fill(ANALYST.password);
      await page.getByRole("button", { name: "Sign In" }).click();
      await page.waitForURL((url) => !url.pathname.startsWith("/auth"), { timeout: 45_000 });
    }

    test("no tracker, and the opt-out holds across browsers", async ({ page, browser }) => {
      await signIn(page);

      await page.goto("/profile");
      const toggle = page.getByRole("switch", { name: /Help improve CLEAR/ });
      await expect(toggle).toBeEnabled({ timeout: 30_000 });
      // Start from opted in, whatever an earlier run left on the account.
      if (!(await toggle.isChecked())) {
        await toggle.click({ force: true });
        await expect(toggle).toBeChecked();
      }
      await expect(page.locator(TRACKER)).toHaveCount(0);
      await toggle.click({ force: true });
      await expect(toggle).not.toBeChecked();
      await page.reload();
      await expect(page.getByRole("switch", { name: /Help improve CLEAR/ })).not.toBeChecked({ timeout: 30_000 });

      await page.getByRole("link", { name: "How usage analytics works" }).click();
      await expect(page.getByRole("heading", { name: "Usage analytics in CLEAR" })).toBeVisible();
      await expect(page.locator(TRACKER)).toHaveCount(0);

      // A fresh browser context has no opt-out cookie: the account carries it.
      const other = await browser.newContext({
        baseURL: test.info().project.use.baseURL,
        storageState: { cookies: [], origins: [] },
      });
      try {
        const otherPage = await other.newPage();
        await signIn(otherPage);
        await otherPage.goto("/profile");
        const otherToggle = otherPage.getByRole("switch", { name: /Help improve CLEAR/ });
        await expect(otherToggle).toBeEnabled({ timeout: 30_000 });
        await expect(otherToggle).not.toBeChecked();
        // Opt back in, leaving the seeded account as it started.
        await otherToggle.click({ force: true });
        await expect(otherToggle).toBeChecked();
      } finally {
        await other.close();
      }
    });
  });
});
