import { test as base, expect } from "@playwright/test";

/**
 * Shared test base. Every spec imports `test`/`expect` from here (not directly
 * from @playwright/test) so the locale cookie is guaranteed on every context —
 * including the fresh, unauthenticated context used by the login/logout spec.
 *
 * next-intl resolves the active locale from the NEXT_LOCALE cookie; middleware
 * only *seeds* it when absent and never overwrites, so an injected `en` wins.
 * This makes English UI text a stable selector for the whole suite.
 */
export const test = base.extend({});

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
