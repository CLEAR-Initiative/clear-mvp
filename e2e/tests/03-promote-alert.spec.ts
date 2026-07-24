import { test, expect } from "../support/test";
import { SEEDED_EVENTS } from "../support/data";
import { gotoEventByTitle } from "../support/helpers";

/**
 * Case 3 — promote the (only) alert-free seeded event to an alert. Requires the
 * analyst role (backend gates promoteToAlert on requireRole(["admin","analyst"])).
 * Idempotent: if the event is already an alert (e.g. on a retry), we still assert
 * the end state.
 */
test.describe("Promote event to alert (case 3)", () => {
  test("promoting the alert-free event turns it into an alert", async ({
    page,
  }) => {
    await gotoEventByTitle(page, SEEDED_EVENTS.displacement);

    const turnIntoAlert = page.getByRole("button", { name: "Turn into Alert" });
    const alertState = page.getByRole("button", { name: "Alert", exact: true });

    if (await turnIntoAlert.isVisible().catch(() => false)) {
      await turnIntoAlert.click();
      await page.getByRole("button", { name: "Confirm" }).click();
    }

    // After promotion the action collapses to a disabled "Alert" button.
    await expect(alertState).toBeVisible();
  });
});
