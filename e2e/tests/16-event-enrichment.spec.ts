import { test, expect } from "../support/test";
import { SEEDED_EVENTS } from "../support/data";
import { enableFeatureFlags, gotoEventByTitle } from "../support/helpers";

/**
 * Case 16 — Request enrichment on the Event page (clear-api ADR-0010, V1).
 *
 * As the seeded analyst (escalate rights globally), with the
 * `event_enrichment` flag on: the Actions card shows Request enrichment,
 * confirming it records a PENDING Task in clear-api, the action collapses
 * into "Enrichment requested", and the Enrichment section lists the Task
 * as Pending. No Worker runs in the hermetic stack, so the Task stays
 * PENDING; the requester can then cancel it, which frees the action again.
 *
 * Idempotent: a retry that finds the Task already open still asserts the
 * end state, then cancels.
 */
test.beforeAll(async ({ playwright }) => {
  await enableFeatureFlags(playwright, ["event_enrichment"]);
});

test.describe("Request enrichment (case 16)", () => {
  test("requesting enrichment records a pending Task and the page shows it", async ({ page }) => {
    await gotoEventByTitle(page, SEEDED_EVENTS.darfurConflict);

    const requestButton = page.getByTestId("request-enrichment");
    const requested = page.getByTestId("enrichment-requested");

    // The flag and the open-Task query both land asynchronously: wait for
    // whichever state the page settles in before branching on it.
    await expect(requestButton.or(requested)).toBeVisible({ timeout: 20_000 });
    if (await requestButton.isVisible()) {
      await requestButton.click();
      await expect(page.getByTestId("enrichment-confirm")).toBeVisible();
      await page.getByTestId("enrichment-confirm-button").click();
    }

    // The action collapsed into the requested state …
    await expect(requested).toBeVisible({ timeout: 20_000 });
    // … and the Enrichment section lists the open Task as Pending.
    const section = page.getByTestId("enrichment-section");
    await expect(section).toBeVisible();
    const task = section.getByTestId("enrichment-task").first();
    await expect(task).toBeVisible();
    await expect(task).toHaveAttribute("data-status", "PENDING");
    await expect(task).toContainText("Impact prior");
    await expect(task).toContainText("Pending");

    // The requester may cancel; a PENDING Task ends at once and the action returns.
    await page.getByTestId("enrichment-cancel").click();
    await expect(requestButton).toBeVisible({ timeout: 20_000 });
    await expect(section.getByTestId("enrichment-task").first()).toHaveAttribute("data-status", "CANCELLED");
  });
});
