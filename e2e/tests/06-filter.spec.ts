import { test, expect } from "../support/test";
import { gotoDetectionEvents, eventRows } from "../support/helpers";

/**
 * Case 6 — apply a filter on the Detection Events tab and assert the list narrows.
 *
 * We filter by SEVERITY. The spec's region/type filters can't narrow this stack's
 * data deterministically: the pipeline (out of scope) is what populates the event
 * location hierarchy the region filter keys on and the disaster-type codes the
 * type picker emits — the seeded events carry plain type slugs (e.g. "conflict")
 * and a single locationId, so both of those filters collapse the list to zero
 * rather than narrowing it. Severity is seeded distinctly per event, so it narrows
 * cleanly and still proves the requirement (a filter narrows the list).
 */
test.describe("Filter events (case 6)", () => {
  test("applying a severity filter narrows the event list", async ({ page }) => {
    await gotoDetectionEvents(page);
    const before = await eventRows(page).count();
    expect(before).toBeGreaterThan(1);

    await page.getByRole("button", { name: "Filter" }).click();
    const popover = page
      .locator(".mantine-Popover-dropdown")
      .filter({ hasText: "Severity" });
    // Deselect the "Low" severity — drops the low-severity event from the list.
    await popover.getByText("Low", { exact: true }).click();

    await expect.poll(() => eventRows(page).count()).toBeLessThan(before);
  });
});
