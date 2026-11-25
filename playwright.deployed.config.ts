import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright config for the post-deploy smoke (e2e/deployed). It runs against
 * a deployed environment, named by SMOKE_BASE_URL. It starts no server, seeds
 * nothing and has no global setup: the one spec signs in by itself.
 *
 * The hermetic suite (playwright.config.ts, e2e/tests) does not include
 * e2e/deployed, and this config does not include e2e/tests.
 *
 * Run it by hand:
 *   SMOKE_BASE_URL=https://dev.clearinitiative.io SMOKE_EMAIL=… SMOKE_PASSWORD=… \
 *     bunx playwright test --config playwright.deployed.config.ts
 */

const BASE_URL = process.env.SMOKE_BASE_URL;
if (!BASE_URL) {
  throw new Error("SMOKE_BASE_URL must be set, for example https://dev.clearinitiative.io");
}
const isCI = !!process.env.CI;

export default defineConfig({
  testDir: "./e2e/deployed",
  forbidOnly: isCI,
  // One retry: a second image can roll while the test runs.
  retries: 1,
  workers: 1,
  reporter: isCI
    ? [["list"], ["html", { open: "never" }], ["github"]]
    : [["list"], ["html", { open: "never" }]],
  timeout: 120_000,
  expect: { timeout: 30_000 },
  use: {
    baseURL: BASE_URL,
    locale: "en",
    timezoneId: "Africa/Khartoum",
    // No trace and no video: a trace records the sign-in request (the account's
    // password) and the session cookie, and the workflow uploads the report as
    // an artifact that anyone with read access to the public repo can download.
    // The screenshot on failure is of the page only.
    trace: "off",
    video: "off",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
