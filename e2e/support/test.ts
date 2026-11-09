import { test as base, expect, type BrowserContext, type TestInfo } from "@playwright/test";

/**
 * Shared test base. Every spec imports `test`/`expect` from here (not directly
 * from @playwright/test) so the locale cookie is guaranteed on every context —
 * including the fresh, unauthenticated context used by the login/logout spec.
 *
 * next-intl resolves the active locale from the NEXT_LOCALE cookie; middleware
 * only *seeds* it when absent and never overwrites, so an injected `en` wins.
 * This makes English UI text a stable selector for the whole suite.
 *
 * Crash guard: any uncaught exception in a page fails the test that was running,
 * even when the spec never asserts on that page. A React render crash leaves a
 * blank screen and nothing else for a locator to miss, so assertions alone do
 * not catch it (the /welcome/profile crash shipped to prod that way). The
 * default `context` is watched automatically; a spec that opens its own context
 * with `browser.newContext()` must call `watchForCrashes(ctx)` on it.
 *
 * Hydration mismatches (React #418/#423/#425) do not fail the test: React
 * recovers by re-rendering on the client, and they fire on most pages today
 * (server and browser time zones differ). They are attached to the report as a
 * `hydration-mismatch` annotation instead.
 */

const HYDRATION_MISMATCH = /Minified React error #(418|423|425)\b|Hydration failed|hydrating/;

const crashes = new WeakMap<TestInfo, string[]>();

/** Record every uncaught page exception in `context` against the running test. */
export function watchForCrashes(context: BrowserContext): void {
  const info = base.info();
  context.on("weberror", (webError) => {
    const err = webError.error();
    const where = webError.page()?.url() ?? "unknown page";
    if (HYDRATION_MISMATCH.test(err.message)) {
      info.annotations.push({ type: "hydration-mismatch", description: `${where}: ${err.message}` });
      return;
    }
    const list = crashes.get(info) ?? [];
    list.push(`${where}\n${err.stack ?? err.message}`);
    crashes.set(info, list);
  });
}

export const test = base.extend<{ crashGuard: void }>({
  crashGuard: [
    async ({ context }, use, testInfo) => {
      watchForCrashes(context);
      await use();
      const found = crashes.get(testInfo) ?? [];
      expect(found, `uncaught page exceptions:\n\n${found.join("\n\n")}`).toEqual([]);
    },
    { auto: true },
  ],
});

test.beforeEach(async ({ context, baseURL }) => {
  await context.addCookies([
    {
      name: "NEXT_LOCALE",
      value: "en",
      url: baseURL ?? "http://localhost:3000",
    },
  ]);
});

export { expect };
