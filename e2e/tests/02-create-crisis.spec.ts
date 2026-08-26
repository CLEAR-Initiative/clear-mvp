import { test, expect } from "../support/test";
import { SEEDED_EVENTS } from "../support/data";
import { gotoDetectionEvents, gotoEventByTitle, eventRows } from "../support/helpers";

/**
 * Case 2 — create a named crisis from an event. Enrichment (summary/scenarios)
 * is pipeline work that's out of the stack, so we assert navigation + the
 * chosen title. Requires the analyst role.
 *
 * Uses Khartoum Flood (not the South Darfur promote target) to stay independent
 * of the promote-alert spec when the suite runs in parallel.
 */
test.describe("Create crisis from event (case 2)", () => {
  test("creating a named crisis lands on the crisis page with that title", async ({
    page,
  }) => {
    await gotoEventByTitle(page, SEEDED_EVENTS.khartoumFlood);

    await page.getByRole("button", { name: /Add to Crisis/ }).click();
    await page.getByRole("menuitem", { name: "Create new Crisis" }).click();
    await expect(page.getByTestId("crisis-name-input")).toBeVisible();
    await page.getByTestId("crisis-name-input").fill("Khartoum flood desk");
    await page.getByRole("dialog").getByRole("button", { name: "Create crisis" }).click();

    await page.waitForURL("**/crisis/**");
    await expect(page.getByText("Khartoum flood desk").first()).toBeVisible();
  });

  test("Detection left-edge select creates a named crisis from multiple events", async ({
    page,
  }) => {
    await gotoDetectionEvents(page);
    const rows = eventRows(page);
    await expect(rows.first()).toBeVisible();

    const firstSelect = page.getByRole("button", { name: "Select event" }).nth(0);
    const secondSelect = page.getByRole("button", { name: "Select event" }).nth(1);
    await firstSelect.click();
    await secondSelect.click();

    await expect(page.getByTestId("event-bulk-bar")).toContainText("2 events selected");
    await page.getByRole("button", { name: "Create crisis" }).click();
    await expect(page.getByTestId("crisis-name-input")).toBeVisible();
    await page.getByTestId("crisis-name-input").fill("Multi-event crisis");
    await page.getByRole("dialog").getByRole("button", { name: "Create crisis" }).click();

    await page.waitForURL("**/crisis/**");
    await expect(page.getByText("Multi-event crisis").first()).toBeVisible();
  });
});
