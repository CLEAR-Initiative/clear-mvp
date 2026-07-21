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
  // The event rows are anchors to /event/<id>.
  await expect(page.locator('a[href^="/event/"]').first()).toBeVisible();
}

/** Locator for the event-list rows (anchors) on the Detection Events tab. */
export function eventRows(page: Page) {
  return page.locator('a[href^="/event/"]');
}

/**
 * Navigate from the Detection Events list to a specific event's detail page by
 * its (seeded) title.
 */
export async function gotoEventByTitle(page: Page, title: string) {
  await gotoDetectionEvents(page);
  const row = eventRows(page).filter({ hasText: title }).first();
  await expect(row).toBeVisible();
  await row.click();
  await page.waitForURL("**/event/**");
  await expect(page.getByText(title).first()).toBeVisible();
}
