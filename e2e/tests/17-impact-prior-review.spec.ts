import type { Locator, Page } from "@playwright/test";
import { test, expect } from "../support/test";
import { IMPACT_PRIORS } from "../support/data";
import { enableFeatureFlags, gotoEventByTitle } from "../support/helpers";

/**
 * Case 17 — Review enrichment proposals (clear-api ADR-0010, V2–V4).
 *
 * As the seeded analyst (a decider), with `event_enrichment` and
 * `impact_prior_review` on, against what `seed-impact-prior` wrote on each
 * Event in IMPACT_PRIORS: a proposed ImpactPrior from CLEAR data, and two
 * proposed web cases (CaseProposals), decided one by one:
 *
 *   1. From the Inbox: the web cases are grouped under their Event, each
 *      with its own Accept / Reject; rejecting one needs a rationale,
 *      accepting the other links the Event it now sits on, and both rows
 *      turn to their decision in place. No whole-prior Review item exists
 *      for the web; the CLEAR-data prior is still one, undecided. The Event
 *      page shows the same cases, decided, and no whole prior.
 *   2. The bell: the seed completed each Task through clear-api, which
 *      notified the analyst (the requester) once per Worker; each
 *      notification opens its Event.
 *   3. From the Event page: the Enrichment section lists the same cases with
 *      the same actions; accepting one leaves its sibling decidable. Whole
 *      priors are decided from the Inbox only.
 *
 * Decisions are terminal (clear-api answers CONFLICT on a second one), so a
 * retry that finds a case already decided asserts the end state instead.
 */
test.beforeAll(async ({ playwright }) => {
  await enableFeatureFlags(playwright, ["event_enrichment", "impact_prior_review"]);
});

const { clear: CLEAR, web: WEB } = IMPACT_PRIORS.sources;
/** One web case, found by its source link (an inner locator built from the
 * page is queried within each row). */
const caseRow = (page: Page, scope: Locator, sourceUrl: string): Locator =>
  scope
    .getByTestId("case-proposal")
    .filter({ has: page.locator(`[data-testid="case-proposal-source"][href="${sourceUrl}"]`) });

/** Reject a case with a rationale, unless an earlier attempt decided it. */
async function rejectCase(row: Locator, rationale: string) {
  if ((await row.getAttribute("data-state")) !== "proposed") return;
  await row.getByTestId("case-proposal-reject").click();
  // A rejection needs a rationale: confirming without one sends nothing.
  await row.getByTestId("case-proposal-confirm-reject").click();
  await expect(row.getByText("A rationale is required to reject")).toBeVisible();
  await expect(row).toHaveAttribute("data-state", "proposed");
  await row.getByTestId("case-proposal-rationale").fill(rationale);
  await row.getByTestId("case-proposal-confirm-reject").click();
}

/** Accept a case, unless an earlier attempt decided it. */
async function acceptCase(row: Locator) {
  if ((await row.getAttribute("data-state")) !== "proposed") return;
  await row.getByTestId("case-proposal-accept").click();
}

test.describe("Enrichment review (case 17)", () => {
  test("from the Inbox, each web case is decided on its own and turns to its decision in place", async ({ page }) => {
    const [rejectUrl, acceptUrl] = IMPACT_PRIORS.webCases[IMPACT_PRIORS.inboxEvent]!;
    await page.goto("/inbox", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("inbox-page")).toBeVisible({ timeout: 20_000 });
    // An analyst sees no hotline filters: Proposed signals is the first one, and active.
    await expect(page.getByTestId("inbox-filter-priors")).toHaveAttribute("data-active", "true");
    await expect(page.getByTestId("inbox-filter-reports")).toHaveCount(0);
    await expect(page.getByTestId("inbox-list-footer")).toHaveAttribute("data-loading", "false", { timeout: 20_000 });

    const eventRows = page.getByTestId("inbox-entry").filter({ hasText: IMPACT_PRIORS.inboxEvent });
    const casesRow = eventRows.and(page.locator('[data-kind="cases"]'));
    // The web's whole prior is never a Review item (V4): only its cases are.
    await expect(eventRows.and(page.locator(`[data-kind="impact_prior"][data-source-kind="${WEB.kind}"]`))).toHaveCount(0);
    // The CLEAR-data prior is still its own Review item.
    await expect(eventRows.and(page.locator(`[data-kind="impact_prior"][data-source-kind="${CLEAR.kind}"]`))).toHaveCount(1);

    if ((await casesRow.count()) > 0) {
      // The nav badge counts what is waiting.
      await expect(page.getByTestId("nav-badge-inbox").first()).toBeVisible();
      await expect(casesRow).toContainText("proposed signal");
      await casesRow.click();
      const pane = page.getByTestId("inbox-pane");
      await expect(pane).toHaveAttribute("data-kind", "cases");
      await expect(pane.getByTestId("case-proposal")).toHaveCount(2);

      const rejected = caseRow(page, pane, rejectUrl);
      const accepted = caseRow(page, pane, acceptUrl);
      // The first case gives a figure on one of the ontology's metric types.
      await expect(rejected.getByTestId("case-proposal-figure")).toContainText("People affected");
      await expect(rejected.getByTestId("case-proposal-source-kind")).toHaveText(WEB.label);

      await rejectCase(rejected, "E2E: the source reports another season.");
      await expect(rejected).toHaveAttribute("data-state", "rejected", { timeout: 20_000 });
      await expect(rejected.getByTestId("case-proposal-rationale-shown")).toContainText("another season");
      await expect(rejected.getByTestId("case-proposal-decision")).toHaveCount(0);

      // Its sibling is decided on its own.
      await expect(accepted).toHaveAttribute("data-state", "proposed");
      await acceptCase(accepted);
      await expect(accepted).toHaveAttribute("data-state", "accepted", { timeout: 20_000 });
      await expect(accepted.getByTestId("case-proposal-result-event")).toHaveAttribute("href", /^\/event\/[^/]+$/);
      await expect(page.getByTestId("inbox-toast")).toContainText("Case accepted");

      // Both rows stay in place, decided: nothing in the group is left to decide.
      await expect(pane.getByTestId("case-proposal")).toHaveCount(2);
      await expect(casesRow).toHaveAttribute("data-undecided", "0");
    }

    // The Event page shows the same cases with their decisions, and no
    // whole prior: the prior is computed from accepted cases (V4).
    await gotoEventByTitle(page, IMPACT_PRIORS.inboxEvent);
    const section = page.getByTestId("enrichment-section");
    await expect(caseRow(page, section, rejectUrl)).toHaveAttribute("data-state", "rejected", { timeout: 20_000 });
    await expect(caseRow(page, section, rejectUrl)).toContainText("another season");
    await expect(caseRow(page, section, acceptUrl)).toHaveAttribute("data-state", "accepted");
    await expect(caseRow(page, section, acceptUrl).getByTestId("case-proposal-result-event")).toHaveAttribute("href", /^\/event\//);
    await expect(section.getByTestId("enrichment-prior")).toHaveCount(0);
  });

  test("the requester hears from each Worker in the bell, and a row opens its Event", async ({ page }) => {
    await page.goto("/inbox", { waitUntil: "domcontentloaded" });
    // The desktop sidebar's bell (the mobile drawer holds another, hidden).
    const bell = page.getByTestId("notifications-bell").filter({ visible: true }).first();
    await expect(bell).toBeVisible({ timeout: 20_000 });
    await bell.click();

    // One per completed Task — two Events × two sources; read or not (a
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

  test("from the Event page, accepting one web case leaves its sibling decidable", async ({ page }) => {
    const [acceptUrl, siblingUrl] = IMPACT_PRIORS.webCases[IMPACT_PRIORS.eventPageEvent]!;
    await gotoEventByTitle(page, IMPACT_PRIORS.eventPageEvent);
    const section = page.getByTestId("enrichment-section");
    await expect(section).toBeVisible({ timeout: 20_000 });
    const cases = section.getByTestId("enrichment-cases");
    await expect(cases.getByTestId("case-proposal")).toHaveCount(2, { timeout: 20_000 });
    const accepted = caseRow(page, section, acceptUrl);
    const sibling = caseRow(page, section, siblingUrl);
    await expect(accepted.getByTestId("case-proposal-figure")).toContainText("Households affected");
    await expect(accepted.getByTestId("case-proposal-source")).toHaveAttribute("href", acceptUrl);

    await acceptCase(accepted);
    await expect(accepted).toHaveAttribute("data-state", "accepted", { timeout: 20_000 });
    await expect(accepted).toContainText("Accepted");
    await expect(accepted.getByTestId("case-proposal-decision")).toHaveCount(0);
    await expect(accepted.getByTestId("case-proposal-result-event")).toHaveAttribute("href", /^\/event\/[^/]+$/);

    // Nothing marks the Event done: the sibling case still waits for its
    // own decision. No whole prior is offered here.
    await expect(sibling).toHaveAttribute("data-state", "proposed");
    await expect(sibling.getByTestId("case-proposal-decision")).toHaveCount(1);
    await expect(section.getByTestId("impact-prior-decision")).toHaveCount(0);
  });
});
