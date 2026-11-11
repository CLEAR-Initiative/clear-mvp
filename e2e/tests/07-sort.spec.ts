import { test, expect } from "../support/test";
import { gotoDetectionEvents, eventRows } from "../support/helpers";

/**
 * Case 7 - sort the Detection Events list and assert the order changes. The
 * sort button (data-testid feed-sort-trigger) on the count row opens a menu
 * grouped by Last activity, Severity and Published; labels are
 * detection.mapFirst.sort in messages/en.json.
 *
 * Severity: seeded events have distinct severities, so the Severity sort must
 * list them most severe first. Age: event-types-seed stamps a distinct
 * lastSignalCreatedAt on each of those four, so Newest and Oldest put
 * different events first. Region and type filters are not this case.
 */
const RANK: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1, unknown: 0 };

async function severities(page: import("@playwright/test").Page) {
  return eventRows(page)
    .locator("[data-severity]")
    .evaluateAll((els) => els.map((el) => el.getAttribute("data-severity") ?? "unknown"));
}

test.describe("Sort events (case 7)", () => {
  test("the Severity sort lists the most severe events first", async ({ page }) => {
    await gotoDetectionEvents(page);
    const sort = page.getByTestId("feed-sort-trigger");
    await expect(sort).toHaveText(/Activity/);

    await sort.click();
    await page.getByRole("menuitemradio", { name: "Highest first" }).click();
    await expect(sort).toHaveText(/Severity/);
    await expect
      .poll(async () => {
        const ranks = (await severities(page)).map((s) => RANK[s] ?? 0);
        return ranks.length > 1 && ranks.every((r, i) => i === 0 || r <= ranks[i - 1]!);
      })
      .toBe(true);
  });

  test("Newest and Oldest put different events first", async ({ page }) => {
    await gotoDetectionEvents(page);
    const sort = page.getByTestId("feed-sort-trigger");
    await expect(sort).toHaveText(/Activity/);
    await expect(eventRows(page).first()).toBeVisible();
    const topNewest = (await eventRows(page).first().innerText()).trim();

    // Last activity, oldest first: the first "Oldest first" in the menu.
    await sort.click();
    await page.getByRole("menuitemradio", { name: "Oldest first" }).first().click();
    await expect(sort).toHaveAttribute("title", /Last activity · Oldest first/);

    await expect
      .poll(async () => (await eventRows(page).first().innerText()).trim())
      .not.toBe(topNewest);
  });
});
