import { test, expect } from "../support/test";
import { SEEDED_EVENTS } from "../support/data";
import { gotoEventByTitle } from "../support/helpers";

/**
 * Case 4 — post a comment on an event's Discussion and assert it renders.
 */
test.describe("Comment on an event (case 4)", () => {
  test("posting a comment renders it in the discussion", async ({ page }) => {
    await gotoEventByTitle(page, SEEDED_EVENTS.darfurConflict);

    const body = `E2E smoke comment ${Date.now()}`;
    const input = page.getByPlaceholder("Add a comment");
    await input.scrollIntoViewIfNeeded();
    await input.fill(body);
    await page.getByRole("button", { name: "Post" }).click();

    await expect(page.getByText(body)).toBeVisible();
  });
});
