import { test, expect } from "../support/test";
import { gotoDetectionEvents, eventRows } from "../support/helpers";

/**
 * Case 7 — sort the Detection Events list and assert the order changes. The sort
 * trigger is an icon-only button with no accessible name, so it carries a
 * data-testid (feed-sort-trigger). Events are seeded with distinct severities, so
 * "Severity: High to Low" and "Severity: Low to High" put different events first.
 */
test.describe("Sort events (case 7)", () => {
  test("changing the sort order reorders the event list", async ({ page }) => {
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
});
