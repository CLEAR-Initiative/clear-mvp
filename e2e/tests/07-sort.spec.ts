import { test, expect } from "../support/test";
import { gotoDetectionEvents, eventRows } from "../support/helpers";

/**
 * Case 7 — sort the Detection Events list and assert the order changes. The sort
 * trigger is an icon-only button, so it carries a data-testid (feed-sort-trigger).
 * Labels are detection.sort in messages/en.json.
 *
 * Severity: seeded events have distinct severities, so High to Low and Low to High
 * put different events first. Age: event-types-seed stamps a distinct
 * lastSignalCreatedAt on each of those four, so Newest first and Oldest first
 * do the same. Region and type filters are not this case.
 */
test.describe("Sort events (case 7)", () => {
  test("changing the severity sort reorders the event list", async ({ page }) => {
    await gotoDetectionEvents(page);

    await page.getByTestId("feed-sort-trigger").click();
    await page.getByRole("menuitem", { name: "Severity: High to Low" }).click();
    await expect(eventRows(page).first()).toBeVisible();
    const topHighToLow = (await eventRows(page).first().innerText()).trim();

    await page.getByTestId("feed-sort-trigger").click();
    await page.getByRole("menuitem", { name: "Severity: Low to High" }).click();

    await expect
      .poll(async () => (await eventRows(page).first().innerText()).trim())
      .not.toBe(topHighToLow);
  });

  test("Newest first and Oldest first put different events first", async ({ page }) => {
    await gotoDetectionEvents(page);

    await page.getByTestId("feed-sort-trigger").click();
    await page.getByRole("menuitem", { name: "Newest first" }).click();
    await expect(eventRows(page).first()).toBeVisible();
    const topNewest = (await eventRows(page).first().innerText()).trim();

    await page.getByTestId("feed-sort-trigger").click();
    await page.getByRole("menuitem", { name: "Oldest first" }).click();

    await expect
      .poll(async () => (await eventRows(page).first().innerText()).trim())
      .not.toBe(topNewest);
  });
});
