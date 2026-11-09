import { test, expect } from "../support/test";

/**
 * Case 27 — every page outside the `(app)` layout renders.
 *
 * These pages mount their own providers (or none), so a hook that works under
 * `(app)` can throw here, and no feature spec visits them. Each test opens one
 * page and waits for its heading; the shared crash guard (e2e/support/test.ts)
 * fails the test on any uncaught exception while it renders.
 *
 * Add a row when a new top-level route gets its own layout.
 */
test.describe("Standalone pages render (case 27)", () => {
  test.describe("signed in", () => {
    const PAGES = [
      { path: "/welcome", text: "Set up your profile" },
      { path: "/welcome/profile", text: "Set up your profile" },
      { path: "/welcome/settings", text: "Quick settings" },
      { path: "/verify-email/e2e-no-such-token", text: "Verification Failed" },
    ];
    for (const { path, text } of PAGES) {
      test(path, async ({ page }) => {
        await page.goto(path, { waitUntil: "domcontentloaded" });
        await expect(page.getByText(text)).toBeVisible({ timeout: 20_000 });
      });
    }
  });

  test.describe("signed out", () => {
    test.use({ storageState: { cookies: [], origins: [] } });
    const PAGES = [
      { path: "/accept-invite", text: "No invitation token found in the URL." },
      { path: "/accept-invite?token=e2e-no-such-invite", text: "Invalid invitation link" },
      { path: "/auth/forgot-password", text: "Reset Password" },
      { path: "/auth/reset-password", text: "Invalid reset link" },
    ];
    for (const { path, text } of PAGES) {
      test(path, async ({ page }) => {
        await page.goto(path, { waitUntil: "domcontentloaded" });
        await expect(page.getByText(text).first()).toBeVisible({ timeout: 20_000 });
      });
    }
  });
});
