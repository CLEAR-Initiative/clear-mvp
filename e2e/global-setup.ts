import { chromium, expect, type FullConfig } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { ADMIN, BASE_URL } from "./support/data";

export const STORAGE_STATE = "e2e/.auth/state.json";

/**
 * Global setup: perform ONE real UI login as the seeded ADMIN and persist the
 * resulting Better Auth session (+ the pinned NEXT_LOCALE cookie) to
 * storageState. Every authenticated spec reuses this session — no per-test login,
 * no programmatic session minting (which would leave the login flow unproven).
 *
 * The smoke suite exercises FEATURES end-to-end, so it runs as admin (which can
 * reach every feature) — role-based access is covered separately by the
 * role-access matrix spec (case 20). Under the new role model a plain global
 * `member` (the old default "analyst"/"viewer" personas) is intentionally NOT a
 * content writer or ground reviewer, so driving the feature smoke tests as admin
 * keeps them about the feature, not the gate.
 */
async function globalSetup(_config: FullConfig) {
  mkdirSync(dirname(STORAGE_STATE), { recursive: true });

  const browser = await chromium.launch();
  const context = await browser.newContext({ baseURL: BASE_URL, locale: "en" });
  await context.addCookies([
    { name: "NEXT_LOCALE", value: "en", url: BASE_URL },
  ]);
  const page = await context.newPage();

  try {
    await page.goto("/auth/login", { waitUntil: "domcontentloaded" });

    await page.getByLabel("Email").fill(ADMIN.email);
    await page.getByLabel("Password").fill(ADMIN.password);
    await page.getByRole("button", { name: "Sign In" }).click();

    // Real post-login content — NOT merely "not on /login" (middleware fails
    // open on transient backend errors, so a redirect-absence is not proof).
    await page.waitForURL("**/dashboard", { timeout: 45_000 });
    await expect(page.getByText("CLEAR", { exact: true }).first()).toBeVisible({
      timeout: 20_000,
    });

    await context.storageState({ path: STORAGE_STATE });
  } finally {
    await browser.close();
  }
}

export default globalSetup;
