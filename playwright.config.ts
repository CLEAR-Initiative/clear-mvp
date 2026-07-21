import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright config for the clear-mvp E2E smoke suite (V1).
 *
 * The suite drives the real UI against the hermetic docker-compose stack
 * (docker-compose.e2e.yml). The stack is brought up out-of-band by
 * e2e/run-local.sh (`bun run e2e`); this config does NOT manage servers.
 *
 * Auth: `global-setup.ts` performs one real UI login as the seeded analyst and
 * writes storageState to e2e/.auth/state.json; every spec here reuses it. The
 * login/logout spec opts out with a fresh (empty) storageState.
 *
 * Locale: pinned to `en` — via `use.locale` and, decisively, the NEXT_LOCALE
 * cookie injected per-test in e2e/support/test.ts (next-intl reads the cookie).
 */

const BASE_URL = process.env.E2E_BASE_URL ?? "http://localhost:3000";
const isCI = !!process.env.CI;

export default defineConfig({
  testDir: "./e2e/tests",
  globalSetup: "./e2e/global-setup.ts",

  // Specs are independent (seeded state + what each creates), so run in parallel.
  // Parallelism is capped low on purpose: the whole suite drives one shared
  // backend, so high worker counts overload it and make the heavier pages
  // (/map, the signal feed) flake. 2 workers keeps it deterministic.
  fullyParallel: true,
  forbidOnly: isCI,
  // Per the PRD/feature spec: CI retries failed tests up to twice; locally none.
  retries: isCI ? 2 : 0,
  workers: 2,

  reporter: isCI
    ? [["list"], ["html", { open: "never" }]]
    : [["list"], ["html", { open: "never" }]],

  timeout: 60_000,
  expect: { timeout: 15_000 },

  use: {
    baseURL: BASE_URL,
    locale: "en",
    timezoneId: "Africa/Khartoum",
    // Reused session written by global-setup. The login/logout spec overrides
    // this with an empty state to exercise a fresh, unauthenticated context.
    storageState: "e2e/.auth/state.json",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
