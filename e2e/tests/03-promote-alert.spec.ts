import { test, expect } from "../support/test";
import { SEEDED_EVENTS } from "../support/data";
import { gotoEventByTitle } from "../support/helpers";

/**
 * Case 3 — promote the (only) alert-free seeded event to an alert. The smoke
 * session is admin, which can raise alerts platform-wide; under the new role
 * model a plain member cannot (that path is admin or a team analyst within the
 * team's location scope — covered by the role-access matrix spec). Idempotent:
 * if the event is already an alert (e.g. on a retry), we still assert the end state.
 */
test.describe("Promote event to alert (case 3)", () => {
  test("promoting the alert-free event turns it into an alert", async ({
    page,
  }) => {
    await gotoEventByTitle(page, SEEDED_EVENTS.displacement);

    const turnIntoAlert = page.getByRole("button", { name: "Turn into Alert" });
    const alertStatus = page.getByTestId("event-alert-status");

    if (await turnIntoAlert.isVisible().catch(() => false)) {
      await turnIntoAlert.click();
      await page.getByRole("button", { name: "Confirm" }).click();
    }

    // After promotion the Actions panel says the event is an alert, with its
    // status, and the header carries the alert chip.
    await expect(alertStatus).toBeVisible();
    await expect(alertStatus).toContainText("Raised as an alert");
    await expect(alertStatus).toContainText("Published");
    await expect(page.getByTestId("event-alert-chip")).toContainText(/Alert · Published/i);
    await expect(turnIntoAlert).toHaveCount(0);
  });
});
