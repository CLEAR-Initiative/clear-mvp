import { test, expect } from "../support/test";
import { eventRows, gotoDetectionEvents } from "../support/helpers";

/**
 * Post-deploy smoke: runs against a DEPLOYED environment (dev), not the
 * hermetic stack. Config: playwright.deployed.config.ts. Workflow:
 * .github/workflows/check-dev-smoke.yml.
 *
 * It signs in through the real login page and opens Detection. It fails when:
 *   - the sign-in does not reach the dashboard,
 *   - Detection shows no event row (render crash, failed feed query, no data),
 *   - a page throws an uncaught exception (crash guard in ../support/test),
 *   - a /_next/static asset answers 4xx or 5xx (a stale or half-rolled build),
 *   - a same-origin request answers 5xx.
 *
 * The account comes from SMOKE_EMAIL and SMOKE_PASSWORD. It needs read access
 * only. The test writes nothing.
 */

const EMAIL = process.env.SMOKE_EMAIL ?? "";
const PASSWORD = process.env.SMOKE_PASSWORD ?? "";

// A fresh context: the sign-in is part of what the smoke proves.
test.use({ storageState: { cookies: [], origins: [] } });

test("a signed-in user can open Detection", async ({ page, baseURL }) => {
  expect(EMAIL, "SMOKE_EMAIL must be set").not.toBe("");
  expect(PASSWORD, "SMOKE_PASSWORD must be set").not.toBe("");

  const origin = new URL(baseURL ?? "").origin;
  const badResponses: string[] = [];
  page.on("response", (res) => {
    const url = new URL(res.url());
    if (url.origin !== origin) return;
    const status = res.status();
    const brokenAsset = url.pathname.startsWith("/_next/static/") && status >= 400;
    if (brokenAsset || status >= 500) {
      badResponses.push(`${status} ${res.request().method()} ${url.pathname}`);
    }
  });

  await page.goto("/auth/login");
  await page.getByLabel("Email").fill(EMAIL);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Sign In" }).click();
  await page.waitForURL("**/dashboard", { timeout: 45_000 });

  // Waits for an event row: the page hydrated and the feed query succeeded.
  await gotoDetectionEvents(page);
  await expect(eventRows(page).first()).toBeVisible();

  expect(badResponses, `failed responses:\n${badResponses.join("\n")}`).toEqual([]);
});
