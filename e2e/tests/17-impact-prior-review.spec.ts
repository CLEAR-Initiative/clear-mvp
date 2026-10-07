import type { Locator } from "@playwright/test";
import { test, expect } from "../support/test";
import { IMPACT_PRIORS } from "../support/data";
import { enableFeatureFlags, gotoEventByTitle } from "../support/helpers";

/**
 * Case 17 — Review proposed ImpactPriors (clear-api ADR-0010, V2 + V3).
 *
 * As the seeded analyst (a decider), with `event_enrichment` and
 * `impact_prior_review` on, against the proposed priors `seed-impact-prior`
 * wrote: two per seeded Event in IMPACT_PRIORS, one per source kind (CLEAR
 * data and the web), as several Workers propose on one Event:
 *
 *   1. From the Inbox: each proposal is its own Review item under the
 *      Impact priors filter, labelled with its source; rejecting the CLEAR
 *      one with a rationale takes it — and only it — out of the queue, and
 *      the Event page shows the two side by side, grouped by source.
 *   2. The bell: the seed completed each Task through clear-api, which
 *      notified the analyst (the requester) once per Worker; each
 *      notification opens its Event.
 *   3. From the Event page: the Enrichment section groups proposals by
 *      source; accepting the web one turns that card to Accepted with its
 *      controls gone while the CLEAR one stays decidable.
 *
 * Decisions are terminal (clear-api answers CONFLICT on a second one), so a
 * retry that finds a prior already decided asserts the end state instead.
 */
test.beforeAll(async ({ playwright }) => {
  await enableFeatureFlags(playwright, ["event_enrichment", "impact_prior_review"]);
});

const { clear: CLEAR, web: WEB } = IMPACT_PRIORS.sources;
const priorOf = (scope: Locator, kind: string) => scope.locator(`[data-testid="enrichment-prior"][data-source-kind="${kind}"]`);
const groupOf = (scope: Locator, kind: string) => scope.locator(`[data-testid="enrichment-group"][data-source-kind="${kind}"]`);

test.describe("Impact prior review (case 17)", () => {
  test("rejecting the CLEAR-data proposal from the Inbox takes only that Review item out of the queue", async ({ page }) => {
    await page.goto("/inbox", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("inbox-page")).toBeVisible({ timeout: 20_000 });
    // An analyst sees no hotline filters: Impact priors is the first one, and active.
    await expect(page.getByTestId("inbox-filter-priors")).toHaveAttribute("data-active", "true");
    await expect(page.getByTestId("inbox-filter-reports")).toHaveCount(0);

    // Only Review items are listed for an analyst: one row per proposal, the
    // Event title plus the source label tells them apart.
    const eventRows = page.getByTestId("inbox-entry").filter({ hasText: IMPACT_PRIORS.inboxEvent });
    const clearRow = eventRows.filter({ hasText: CLEAR.label });
    const webRow = eventRows.filter({ hasText: WEB.label });
    await expect(page.getByTestId("inbox-list")).toBeVisible();
    await expect(page.getByTestId("inbox-list-footer")).toHaveAttribute("data-loading", "false", { timeout: 20_000 });
    if ((await clearRow.count()) === 0) {
      // An earlier attempt already decided it.
      await gotoEventByTitle(page, IMPACT_PRIORS.inboxEvent);
      await expect(priorOf(page.getByTestId("enrichment-section"), CLEAR.kind)).toHaveAttribute("data-state", "rejected");
      return;
    }
    await expect(webRow).toHaveCount(1);

    // The nav badge counts what is waiting.
    await expect(page.getByTestId("nav-badge-inbox").first()).toBeVisible();

    await clearRow.first().click();
    const pane = page.getByTestId("inbox-pane");
    await expect(pane).toHaveAttribute("data-kind", "impact_prior");
    const prior = pane.getByTestId("enrichment-prior");
    await expect(prior).toHaveAttribute("data-state", "proposed");
    await expect(prior).toHaveAttribute("data-source-kind", CLEAR.kind);
    await expect(prior.getByTestId("enrichment-prior-source")).toHaveText(CLEAR.label);
    // A CLEAR-data case cites an earlier CLEAR Event, not a URL — and not
    // the Event under review.
    const priorEventLink = pane.getByRole("link", { name: "Open the prior event" });
    const eventLink = pane.getByRole("link", { name: "Open the event" });
    await expect(priorEventLink).toHaveAttribute("href", /^\/event\//);
    await expect(eventLink).toHaveAttribute("href", /^\/event\//);
    expect(await priorEventLink.getAttribute("href")).not.toBe(await eventLink.getAttribute("href"));

    // A decision needs a rationale: Reject alone sends nothing.
    await pane.getByTestId("impact-prior-reject").click();
    await expect(pane.getByText("A rationale is required")).toBeVisible();
    await pane.getByTestId("impact-prior-rationale").fill("E2E: the cited case is for another season.");
    await pane.getByTestId("impact-prior-reject").click();

    await expect(page.getByTestId("inbox-toast")).toContainText("Impact prior rejected");
    await expect(clearRow).toHaveCount(0);
    // The web Worker's proposal is a sibling, decided on its own: still waiting.
    await expect(webRow).toHaveCount(1);

    // The Event page shows both, grouped by source: the CLEAR one rejected
    // with its reason and no controls, the web one still proposed.
    await gotoEventByTitle(page, IMPACT_PRIORS.inboxEvent);
    const section = page.getByTestId("enrichment-section");
    const clearPrior = priorOf(section, CLEAR.kind);
    await expect(clearPrior).toHaveAttribute("data-state", "rejected", { timeout: 20_000 });
    await expect(clearPrior).toContainText("another season");
    await expect(groupOf(section, CLEAR.kind).getByTestId("impact-prior-decision")).toHaveCount(0);
    await expect(priorOf(section, WEB.kind)).toHaveAttribute("data-state", "proposed");
    await expect(groupOf(section, CLEAR.kind).getByTestId("enrichment-group-title")).toContainText(CLEAR.label);
    await expect(groupOf(section, WEB.kind).getByTestId("enrichment-group-title")).toContainText(WEB.label);
  });

  test("the requester hears from each Worker in the bell, and a row opens its Event", async ({ page }) => {
    await page.goto("/inbox", { waitUntil: "domcontentloaded" });
    // The desktop sidebar's bell (the mobile drawer holds another, hidden).
    const bell = page.getByTestId("notifications-bell").filter({ visible: true }).first();
    await expect(bell).toBeVisible({ timeout: 20_000 });
    await bell.click();

    // One per seeded proposal — two Events × two sources; read or not (a
    // retry may have opened one already).
    const rows = page
      .getByTestId("notifications-menu")
      .getByTestId("notification-row")
      .filter({ hasText: IMPACT_PRIORS.notification });
    await expect(rows).toHaveCount(4, { timeout: 20_000 });
    await expect(rows.filter({ hasText: "from CLEAR data" })).toHaveCount(2);
    await expect(rows.filter({ hasText: "from the web" })).toHaveCount(2);
    await expect(rows.first()).toHaveAttribute("href", /^\/event\/[^/]+$/);

    await rows.first().click();
    await expect(page).toHaveURL(/\/event\/[^/?#]+/, { timeout: 20_000 });
    await expect(page.getByTestId("enrichment-section")).toBeVisible({ timeout: 20_000 });
  });

  test("accepting the web proposal from the Event page leaves the CLEAR-data one decidable beside it", async ({ page }) => {
    await gotoEventByTitle(page, IMPACT_PRIORS.eventPageEvent);
    const section = page.getByTestId("enrichment-section");
    await expect(section).toBeVisible({ timeout: 20_000 });
    const webPrior = priorOf(section, WEB.kind);
    const clearPrior = priorOf(section, CLEAR.kind);
    await expect(webPrior).toBeVisible({ timeout: 20_000 });
    await expect(clearPrior).toBeVisible();
    await expect(webPrior.getByTestId("enrichment-prior-source")).toHaveText(WEB.label);
    await expect(webPrior.getByRole("link", { name: "Source" })).toHaveAttribute("href", IMPACT_PRIORS.sourceUrl);

    const webGroup = groupOf(section, WEB.kind);
    if ((await webPrior.getAttribute("data-state")) !== "proposed") {
      // An earlier attempt already accepted it.
      await expect(webPrior).toHaveAttribute("data-state", "accepted");
      await expect(webGroup.getByTestId("impact-prior-decision")).toHaveCount(0);
      return;
    }

    const decision = webGroup.getByTestId("impact-prior-decision");
    await expect(decision).toBeVisible();
    await decision.getByTestId("impact-prior-rationale").fill("E2E: the basis matches this hazard and country.");
    await decision.getByTestId("impact-prior-accept").click();

    await expect(webPrior).toHaveAttribute("data-state", "accepted", { timeout: 20_000 });
    await expect(webPrior).toContainText("Accepted");
    await expect(webGroup.getByTestId("impact-prior-decision")).toHaveCount(0);
    // Nothing marks the Event done: the CLEAR-data proposal is still waiting for its own decision.
    await expect(clearPrior).toHaveAttribute("data-state", "proposed");
    await expect(groupOf(section, CLEAR.kind).getByTestId("impact-prior-decision")).toHaveCount(1);
  });
});
