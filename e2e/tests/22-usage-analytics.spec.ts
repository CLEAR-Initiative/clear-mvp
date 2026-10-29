import { test, expect } from "../support/test";

/**
 * Case 22 — usage analytics stay off unless configured. The e2e image is built
 * without NEXT_PUBLIC_UMAMI_* and the `usage_analytics` flag is off, so no
 * Umami script may load: not pre-login, not signed in. The admin / opted-out /
 * flag gates are covered by src/components/analytics/usage-tracker.test.tsx.
 * The Profile toggle and privacy notice are reachable either way.
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

  test("signed in: no tracker, and the opt-out toggle persists", async ({ page }) => {
    await page.goto("/profile");
    const toggle = page.getByRole("switch", { name: /Help improve CLEAR/ });
    await expect(toggle).toBeChecked({ timeout: 30_000 });
    await expect(page.locator(TRACKER)).toHaveCount(0);
    await toggle.click({ force: true });
    await expect(toggle).not.toBeChecked();
    await page.reload();
    await expect(page.getByRole("switch", { name: /Help improve CLEAR/ })).not.toBeChecked({ timeout: 30_000 });

    await page.getByRole("link", { name: "How usage analytics works" }).click();
    await expect(page.getByRole("heading", { name: "Usage analytics in CLEAR" })).toBeVisible();
    await expect(page.locator(TRACKER)).toHaveCount(0);
  });
});
