import { expect, type Page, type PlaywrightWorkerArgs } from "@playwright/test";
import { ADMIN, BASE_URL } from "./data";

/**
 * Open the Detection page and make sure the Events tab is active. On desktop
 * the page is the map-first layout: a feed column of row cards beside the map.
 */
export async function gotoDetectionEvents(page: Page) {
  await page.goto("/detection", { waitUntil: "domcontentloaded" });
  const eventsTab = page.getByRole("tab", { name: "Events" });
  if (await eventsTab.isVisible().catch(() => false)) {
    await eventsTab.click();
  }
  // Waiting for a row also proves the page has hydrated and the feed query
  // succeeded (not pending-role empty).
  await expect(eventRows(page).first()).toBeVisible();
}

/** Locator for the feed rows (cards) on the Detection Events tab. */
export function eventRows(page: Page) {
  return page.locator('[data-testid^="feed-row-"]');
}

/**
 * Navigate from the Detection Events list to a specific event's detail page by
 * its (seeded) title.
 *
 * A plain row click opens the preview drawer without mounting page-mode
 * chrome (Add to Crisis, Alert), so go to the row's full event page so those
 * actions stay reachable. "Back to Events" is page-only: the drawer never
 * renders it, so it is the signal we actually left the overlay.
 */
export async function gotoEventByTitle(page: Page, title: string) {
  await gotoDetectionEvents(page);
  const row = eventRows(page).filter({ hasText: title }).first();
  await expect(row).toBeVisible();
  // An event row's test id carries the event's id.
  const id = (await row.getAttribute("data-testid"))?.replace(/^feed-row-/, "");
  if (!id) {
    throw new Error(`event row "${title}" should carry its event id`);
  }
  await page.goto(`/event/${id}?from=detection`);
  await expect(page.getByRole("link", { name: /Back to Events/i })).toBeVisible();
  await expect(page.getByText(title).first()).toBeVisible();
}

/**
 * Turn feature flags on as the seeded admin, through the app's own
 * admin-only toggle (flags are platform-wide; the hermetic stack starts
 * with them at their defaults).
 */
export async function enableFeatureFlags(
  playwright: PlaywrightWorkerArgs["playwright"],
  keys: string[],
): Promise<void> {
  const admin = await playwright.request.newContext({ baseURL: BASE_URL });
  try {
    const signIn = await admin.post("/api/auth/sign-in/email", {
      data: { email: ADMIN.email, password: ADMIN.password },
      headers: { Origin: BASE_URL },
    });
    expect(signIn.ok()).toBe(true);
    for (const key of keys) {
      const toggle = await admin.post("/api/trpc/featureFlags.toggle", {
        data: { json: { key, enabled: true } },
      });
      expect(toggle.ok()).toBe(true);
    }
  } finally {
    await admin.dispose();
  }
}


/**
 * A country's location id, as the signed-in user (Agent deep links carry
 * ids, never names).
 */
export async function countryIdByName(page: Page, name: string): Promise<string> {
  const res = await page.request.post("/api/graphql", {
    data: { query: "{ locations(level: 0) { id name } }" },
  });
  expect(res.ok()).toBe(true);
  const body = (await res.json()) as { data?: { locations?: Array<{ id: string; name: string }> } };
  const id = body.data?.locations?.find((l) => l.name === name)?.id;
  if (!id) throw new Error(`no country called ${name}`);
  return id;
}
