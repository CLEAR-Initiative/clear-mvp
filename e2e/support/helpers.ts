import { expect, type Page } from "@playwright/test";

/**
 * Open the Detection page and make sure the Events tab is active. Filters and
 * the event list live in the shared page header / Events tab.
 */
export async function gotoDetectionEvents(page: Page) {
  await page.goto("/detection", { waitUntil: "domcontentloaded" });
  const eventsTab = page.getByRole("tab", { name: "Events" });
  if (await eventsTab.isVisible().catch(() => false)) {
    await eventsTab.click();
  }
  // Event rows are anchors to /event/<id>. Waiting for one also proves the
  // page has hydrated and the feed query succeeded (not pending-role empty).
  await expect(page.locator('a[href^="/event/"]').first()).toBeVisible();
}

/** Locator for the event-list rows (anchors) on the Detection Events tab. */
export function eventRows(page: Page) {
  return page.locator('a[href^="/event/"]');
}

/**
 * Navigate from the Detection Events list to a specific event's detail page by
 * its (seeded) title.
 *
 * A plain row click now opens the preview drawer and replaceStates /event/:id
 * without mounting page-mode chrome (Add to Crisis, Alert). Follow the href
 * so those actions stay reachable. "Back to Events" is page-only — the drawer
 * never renders it — so it is the signal we actually left the overlay.
 */
export async function gotoEventByTitle(page: Page, title: string) {
  await gotoDetectionEvents(page);
  const row = eventRows(page).filter({ hasText: title }).first();
  await expect(row).toBeVisible();
  const href = await row.getAttribute("href");
  if (!href) {
    throw new Error(`event row "${title}" should link to /event/:id`);
  }
  await page.goto(href);
  await expect(page.getByRole("link", { name: /Back to Events/i })).toBeVisible();
  await expect(page.getByText(title).first()).toBeVisible();
}
