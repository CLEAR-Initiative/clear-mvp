import { test, expect } from "../support/test";
import { IMPACT_PRIORS } from "../support/data";
import { enableFeatureFlags, gotoEventByTitle } from "../support/helpers";

/**
 * Case 17 — Review a proposed ImpactPrior (clear-api ADR-0010, V2).
 *
 * As the seeded analyst (a decider), with `event_enrichment` and
 * `impact_prior_review` on, against the two proposed priors
 * `seed-impact-prior` wrote (one per seeded Event in IMPACT_PRIORS):
 *
 *   1. From the Inbox: the Review item is listed under the Impact priors
 *      filter with its Event's title, the nav badge counts it, and
 *      rejecting it with a rationale takes it out of the queue.
 *   2. From the Event page: the Enrichment section shows the proposed prior
 *      with the decision controls, and accepting it with a rationale turns
 *      the card to Accepted with the controls gone.
 *   3. The bell: the seed completed each Task through clear-api, which
 *      notified the analyst (the requester); each notification is listed
 *      and opens its Event.
 *
 * Both decisions are terminal (clear-api answers CONFLICT on a second one),
 * so a retry that finds the prior already decided asserts the end state
 * instead of deciding again.
 */
test.beforeAll(async ({ playwright }) => {
  await enableFeatureFlags(playwright, ["event_enrichment", "impact_prior_review"]);
});

test.describe("Impact prior review (case 17)", () => {
  test("rejecting from the Inbox takes the Review item out of the queue", async ({ page }) => {
    await page.goto("/inbox", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("inbox-page")).toBeVisible({ timeout: 20_000 });
    // An analyst sees no hotline filters: Impact priors is the first one, and active.
    await expect(page.getByTestId("inbox-filter-priors")).toHaveAttribute("data-active", "true");
    await expect(page.getByTestId("inbox-filter-reports")).toHaveCount(0);

    // Only Review items are listed for an analyst, so the Event title is the row.
    const row = page.getByTestId("inbox-entry").filter({ hasText: IMPACT_PRIORS.inboxEvent });
    const list = page.getByTestId("inbox-list");
    await expect(list).toBeVisible();
    // Either the item is still waiting, or an earlier attempt already decided
    // it. Wait for the first load to land (the footer stops saying it is
    // loading), not for the list to empty: the other test's prior may still
    // be waiting in it, in either order.
    await expect(page.getByTestId("inbox-list-footer")).toHaveAttribute("data-loading", "false", { timeout: 20_000 });
    if ((await row.count()) === 0) {
      await gotoEventByTitle(page, IMPACT_PRIORS.inboxEvent);
      await expect(page.getByTestId("enrichment-prior").first()).toHaveAttribute("data-state", "rejected");
      return;
    }

    // The nav badge counts what is waiting.
    await expect(page.getByTestId("nav-badge-inbox").first()).toBeVisible();

    await row.first().click();
    const pane = page.getByTestId("inbox-pane");
    await expect(pane).toHaveAttribute("data-kind", "impact_prior");
    await expect(pane.getByTestId("enrichment-prior")).toHaveAttribute("data-state", "proposed");
    await expect(pane.getByRole("link", { name: "Source" })).toHaveAttribute("href", IMPACT_PRIORS.sourceUrl);
    await expect(pane.getByRole("link", { name: "Open the event" })).toHaveAttribute("href", /^\/event\//);

    // A decision needs a rationale: Reject alone sends nothing.
    await pane.getByTestId("impact-prior-reject").click();
    await expect(pane.getByText("A rationale is required")).toBeVisible();
    await pane.getByTestId("impact-prior-rationale").fill("E2E: the cited case is for another season.");
    await pane.getByTestId("impact-prior-reject").click();

    await expect(page.getByTestId("inbox-toast")).toContainText("Impact prior rejected");
    await expect(page.getByTestId("inbox-entry").filter({ hasText: IMPACT_PRIORS.inboxEvent })).toHaveCount(0);

    // The Event page shows it as rejected, with the reason, and no controls.
    await gotoEventByTitle(page, IMPACT_PRIORS.inboxEvent);
    const prior = page.getByTestId("enrichment-prior").first();
    await expect(prior).toHaveAttribute("data-state", "rejected", { timeout: 20_000 });
    await expect(prior).toContainText("another season");
    await expect(page.getByTestId("impact-prior-decision")).toHaveCount(0);
  });

  test("the requester hears about each proposal in the bell, and a row opens its Event", async ({ page }) => {
    await page.goto("/inbox", { waitUntil: "domcontentloaded" });
    // The desktop sidebar's bell (the mobile drawer holds another, hidden).
    const bell = page.getByTestId("notifications-bell").filter({ visible: true }).first();
    await expect(bell).toBeVisible({ timeout: 20_000 });
    await bell.click();

    // One per seeded prior; read or not (a retry may have opened one already).
    const rows = page
      .getByTestId("notifications-menu")
      .getByTestId("notification-row")
      .filter({ hasText: IMPACT_PRIORS.notification });
    await expect(rows).toHaveCount(2, { timeout: 20_000 });
    await expect(rows.first()).toHaveAttribute("href", /^\/event\/[^/]+$/);

    await rows.first().click();
    await expect(page).toHaveURL(/\/event\/[^/?#]+/, { timeout: 20_000 });
    await expect(page.getByTestId("enrichment-section")).toBeVisible({ timeout: 20_000 });
  });

  test("accepting from the Event page turns the proposed prior into an accepted one", async ({ page }) => {
    await gotoEventByTitle(page, IMPACT_PRIORS.eventPageEvent);
    const section = page.getByTestId("enrichment-section");
    await expect(section).toBeVisible({ timeout: 20_000 });
    const prior = section.getByTestId("enrichment-prior").first();
    await expect(prior).toBeVisible({ timeout: 20_000 });

    if ((await prior.getAttribute("data-state")) !== "proposed") {
      // An earlier attempt already accepted it.
      await expect(prior).toHaveAttribute("data-state", "accepted");
      await expect(section.getByTestId("impact-prior-decision")).toHaveCount(0);
      return;
    }

    const decision = section.getByTestId("impact-prior-decision");
    await expect(decision).toBeVisible();
    await decision.getByTestId("impact-prior-rationale").fill("E2E: the basis matches this hazard and country.");
    await decision.getByTestId("impact-prior-accept").click();

    await expect(section.getByTestId("enrichment-prior").first()).toHaveAttribute("data-state", "accepted", { timeout: 20_000 });
    await expect(section.getByTestId("enrichment-prior").first()).toContainText("Accepted");
    await expect(section.getByTestId("impact-prior-decision")).toHaveCount(0);
  });
});
