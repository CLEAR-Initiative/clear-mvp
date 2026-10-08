import type { Locator, Page } from "@playwright/test";
import { test, expect } from "../support/test";
import { SEEDED_EVENTS } from "../support/data";
import { enableFeatureFlags, gotoEventByTitle } from "../support/helpers";

/**
 * Case 18 — My requests in the Inbox (clear-api ADR-0010, V2).
 *
 * As the seeded analyst, with `event_enrichment` on: requesting enrichment
 * on an Event fans out into one Task per source kind (CLEAR data, the web);
 * the Inbox's My requests filter lists both at once with their status, they
 * never appear under Everything (they are not Review items), and Cancel in
 * the read-only pane ends a request.
 *
 * Uses an Event no other spec enriches, and cancels every request it opens,
 * so a rerun on a kept-up stack starts from the same place.
 */
test.beforeAll(async ({ playwright }) => {
  await enableFeatureFlags(playwright, ["event_enrichment"]);
});

const EVENT = SEEDED_EVENTS.displacement;
const KINDS = ["event.impact_prior.clear", "event.impact_prior.web"] as const;

/** The reader's open request for EVENT from one source. */
const openRequest = (page: Page, kind: string): Locator =>
  page
    .getByTestId("inbox-entry")
    .and(page.locator(`[data-kind="task"][data-source-kind="${kind}"]`))
    .and(page.locator('[data-status="PENDING"], [data-status="LEASED"]'))
    .filter({ hasText: EVENT });

test.describe("My requests (case 18)", () => {
  test("a request shows under My requests at once, stays out of Everything, and is cancelled from there", async ({ page }) => {
    // ── Request enrichment on the Event page ──
    await gotoEventByTitle(page, EVENT);
    const requestButton = page.getByTestId("request-enrichment");
    const requested = page.getByTestId("enrichment-requested");
    await expect(requestButton.or(requested)).toBeVisible({ timeout: 20_000 });
    if (await requestButton.isVisible()) {
      await requestButton.click();
      await page.getByTestId("enrichment-confirm-button").click();
    }
    await expect(requested).toBeVisible({ timeout: 20_000 });

    // ── The Inbox lists both source kinds under My requests ──
    await page.goto("/inbox", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("inbox-page")).toBeVisible({ timeout: 20_000 });
    await page.getByTestId("inbox-filter-requests").click();
    await expect(page.getByTestId("inbox-filter-requests")).toHaveAttribute("data-active", "true");
    for (const kind of KINDS) await expect(openRequest(page, kind)).toHaveCount(1, { timeout: 20_000 });
    await expect(openRequest(page, KINDS[0]).first()).toContainText("CLEAR data");
    await expect(openRequest(page, KINDS[1]).first()).toContainText("Web search");

    // ── Not Review items: nothing of it under Everything ──
    await page.getByTestId("inbox-filter-all").click();
    await expect(page.getByTestId("inbox-list-footer")).toHaveAttribute("data-loading", "false", { timeout: 20_000 });
    await expect(page.locator('[data-testid="inbox-entry"][data-kind="task"]')).toHaveCount(0);

    // ── Cancel each from its read-only pane ──
    await page.getByTestId("inbox-filter-requests").click();
    for (const kind of KINDS) {
      const row = openRequest(page, kind);
      await row.first().click();
      const pane = page.getByTestId("inbox-pane");
      await expect(pane).toHaveAttribute("data-kind", "task");
      await expect(pane.getByTestId("enrichment-task")).toHaveAttribute("data-kind", kind);
      // Status only: no decision controls on a request.
      await expect(pane.getByTestId("impact-prior-decision")).toHaveCount(0);
      await pane.getByTestId("inbox-task-cancel").click();
      // No Worker runs in the stack, so the Task is PENDING and ends at once.
      await expect(pane).toHaveAttribute("data-status", "CANCELLED", { timeout: 20_000 });
    }
    for (const kind of KINDS) {
      await expect(
        page
          .getByTestId("inbox-entry")
          .and(page.locator(`[data-kind="task"][data-source-kind="${kind}"][data-status="PENDING"]`))
          .filter({ hasText: EVENT }),
      ).toHaveCount(0, { timeout: 20_000 });
    }

    // The Event is free to request again.
    await gotoEventByTitle(page, EVENT);
    await expect(requestButton).toBeVisible({ timeout: 20_000 });
  });
});
