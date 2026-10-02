import { test, expect } from "../support/test";
import { SEEDED_EVENTS } from "../support/data";
import { gotoDetectionEvents, eventRows } from "../support/helpers";

/**
 * Case 6 — filter the Detection Events list by region and by disaster type, and
 * assert the list narrows to exactly the matching seeded event(s).
 *
 * Region is a server-side filter (eventsPage locationId → location + descendants)
 * and needs a country picked first: the region picker lists that country's
 * states. Type is filtered by GLIDE code; the seeded events only carry codes
 * because e2e/support/event-types-seed.ts rewrites clear-api's plain slugs.
 */

/** Title line of every visible event row, sorted for order-independent compares. */
async function visibleTitles(page: import("@playwright/test").Page) {
  const all = Object.values(SEEDED_EVENTS);
  const texts = await eventRows(page).allInnerTexts();
  return texts
    .map((text) => all.find((title) => text.includes(title)) ?? text)
    .sort();
}

test.describe("Filter events (case 6)", () => {
  test("filtering by region narrows the list to that region's events", async ({ page }) => {
    await gotoDetectionEvents(page);

    await page.getByRole("textbox", { name: "Country" }).click();
    await page.getByRole("option", { name: "Sudan", exact: true }).click();
    await expect.poll(() => visibleTitles(page)).toEqual(Object.values(SEEDED_EVENTS).sort());

    await page.getByRole("button", { name: "All Regions" }).click();
    await page.getByPlaceholder("Search regions...").fill("Khartoum");
    await page
      .locator(".mantine-Popover-dropdown")
      .getByRole("button", { name: "Khartoum", exact: true })
      .click();

    await expect.poll(() => visibleTitles(page)).toEqual([SEEDED_EVENTS.khartoumFlood]);
  });

  test("filtering by disaster type narrows the list to that type's events", async ({ page }) => {
    await gotoDetectionEvents(page);
    expect(await eventRows(page).count()).toBeGreaterThan(1);

    await page.getByRole("button", { name: "Filter" }).click();
    await page.getByRole("button", { name: "Select disaster types" }).click();
    // Level-1 checkbox selects every level-2 group under it (battles, riots, ...).
    await page.getByRole("checkbox", { name: "conflict and violence" }).check();

    await expect.poll(() => visibleTitles(page)).toEqual([SEEDED_EVENTS.darfurConflict]);
  });

  test("filtering by severity narrows the event list", async ({ page }) => {
    await gotoDetectionEvents(page);
    const before = await eventRows(page).count();
    expect(before).toBeGreaterThan(1);

    await page.getByRole("button", { name: "Filter" }).click();
    const popover = page
      .locator(".mantine-Popover-dropdown")
      .filter({ hasText: "Severity" });
    // Deselect the "Low" severity — drops the low-severity event from the list.
    await popover.getByText("Low", { exact: true }).click();

    await expect.poll(() => visibleTitles(page)).not.toContain(SEEDED_EVENTS.foodSecurity);
    expect(await eventRows(page).count()).toBeLessThan(before);
  });
});
