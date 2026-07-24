import { test, expect } from "../support/test";
import { SEEDED_EVENTS } from "../support/data";
import { gotoEventByTitle } from "../support/helpers";

/**
 * Case 2 — create a crisis from an event. Enrichment (title/summary/scenarios)
 * is pipeline work that's out of the stack, so we assert only that the action
 * navigated to the crisis page and shows the enrichment-loading state — NOT that
 * the crisis materialised. Requires the analyst role.
 *
 * Uses Khartoum Flood (not the South Darfur promote target) to stay independent
 * of the promote-alert spec when the suite runs in parallel.
 */
test.describe("Create crisis from event (case 2)", () => {
  test("creating a crisis lands on the crisis page's enrichment-loading state", async ({
    page,
  }) => {
    await gotoEventByTitle(page, SEEDED_EVENTS.khartoumFlood);

    await page.getByRole("button", { name: /Add to Crisis/ }).click();
    await page.getByRole("menuitem", { name: "Create new Crisis" }).click();

    await page.waitForURL("**/crisis/**");
    // Assert the crisis is created but NOT yet enriched (enrichment is pipeline
    // work, out of the stack). Two equivalent un-enriched renders exist depending
    // on timing: the full-screen "Information is being prepared" loader (crisis
    // title still null) or the detail view with a placeholder "Untitled Crisis"
    // title and "No summary available yet." Either proves navigation + not-
    // completion; assert whichever appears.
    await expect(
      page
        .getByText("Information is being prepared")
        .or(page.getByText("No summary available yet")),
    ).toBeVisible();
  });
});
