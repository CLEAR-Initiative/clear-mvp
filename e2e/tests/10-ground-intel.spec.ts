import type { Page } from "@playwright/test";
import { test, expect } from "../support/test";
import { GROUND, VIEWER } from "../support/data";

/**
 * Case 10 — Ground Intel review tab (expo-365).
 *
 * Drives the private ground-intel staging tier against the SYNTHETIC
 * fixture from e2e/support/ground-seed.ts (seeded by the `seed-ground`
 * compose step): message list + classification chips, the correction
 * chain in the thread drawer, the role-gated review flow, and the
 * viewer-must-not-see-it privacy gate.
 *
 * Tests target disjoint fixture data (thread A for the chain, thread B
 * for the review mutation, unthreaded messages for the filter) so they
 * stay independent under fullyParallel.
 */

async function gotoGroundTab(page: Page) {
  await page.goto("/detection?tab=ground", { waitUntil: "domcontentloaded" });
  await expect(page.getByTestId("ground-intel-tab")).toBeVisible({ timeout: 20_000 });
  // A row proves hydration + an authorized ground.messages round trip.
  await expect(page.getByTestId("ground-message-row").first()).toBeVisible();
}

test.describe("Ground Intel tab (case 10)", () => {
  test("lists staged messages and narrows by classification chip", async ({ page }) => {
    await gotoGroundTab(page);

    // Fixture variety is on screen: field report + chatter + news digest.
    await expect(page.getByText(GROUND.retractedFirstMessage)).toBeVisible();
    await expect(page.getByText(GROUND.chatterMessage)).toBeVisible();
    await expect(page.getByText(GROUND.newsDigestMessage)).toBeVisible();

    // Chips are multi-select: clicking "Chatter" excludes that class.
    const chips = page.getByTestId("ground-classification-chips");
    await chips.getByText(/^Chatter/).click();
    await expect(page.getByText(GROUND.chatterMessage)).toBeHidden();
    await expect(page.getByText(GROUND.retractedFirstMessage)).toBeVisible();

    // Also excluding "Field report" hides the field reports too.
    await chips.getByText(/^Field report/).click();
    await expect(page.getByText(GROUND.retractedFirstMessage)).toBeHidden();
    await expect(page.getByText(GROUND.newsDigestMessage)).toBeVisible();
  });

  test("thread drawer shows the correction chain with lifecycle badges", async ({ page }) => {
    await gotoGroundTab(page);

    // Open thread A from its correcting message.
    await page.getByText(GROUND.correctedLastMessage).first().click();
    const drawer = page.getByTestId("ground-thread-view");
    await expect(drawer).toBeVisible();
    await expect(page.getByText(GROUND.correctedThreadTitle).first()).toBeVisible();

    // Thread-level lifecycle badge reads Corrected.
    await expect(drawer.getByTestId("ground-lifecycle-badge")).toHaveText("Corrected");

    // The chain renders all four messages in order: the first step is the
    // original report, the last carries the correcting state.
    const chainMessages = drawer.getByTestId("ground-chain-message");
    await expect(chainMessages).toHaveCount(4);
    const steps = drawer.getByTestId("ground-chain-step");
    await expect(steps.first()).toHaveText("Reported");
    await expect(steps.last()).toHaveText("Corrected");

    // The contributor's own uncertainty marker survived ingestion.
    await expect(drawer.getByText("unconfirmed")).toBeVisible();
  });

  test("analyst can reject a thread via the role-gated review actions", async ({ page }) => {
    await gotoGroundTab(page);

    // Open thread B (the retracted misreporting case).
    await page.getByText(GROUND.retractedFirstMessage).first().click();
    const drawer = page.getByTestId("ground-thread-view");
    await expect(drawer).toBeVisible();

    // The seeded analyst passes the source's reviewerRoles policy, so the
    // review controls are visible, and the thread starts unverified.
    await expect(drawer.getByTestId("ground-review-state-badge")).toHaveText("Unverified");
    const actions = drawer.getByTestId("ground-review-actions");
    await expect(actions).toBeVisible();
    await expect(drawer.getByTestId("ground-approve-private")).toBeVisible();
    await expect(drawer.getByTestId("ground-approve-public")).toBeVisible();

    await drawer.getByTestId("ground-reject").click();

    // State machine: rejected is reversible — approvals remain, reject goes.
    await expect(drawer.getByTestId("ground-review-state-badge")).toHaveText("Rejected");
    await expect(drawer.getByTestId("ground-reject")).toBeHidden();
    await expect(drawer.getByTestId("ground-approve-private")).toBeVisible();
    await expect(drawer.getByTestId("ground-approve-public")).toBeVisible();
  });
});

test.describe("Ground Intel privacy gate (case 10, viewer)", () => {
  // Fresh unauthenticated context — the viewer must log in for real.
  test.use({ storageState: { cookies: [], origins: [] } });

  test("viewer does not see the Ground Intel tab", async ({ page }) => {
    await page.goto("/auth/login");
    await page.getByLabel("Email").fill(VIEWER.email);
    await page.getByLabel("Password").fill(VIEWER.password);
    await page.getByRole("button", { name: "Sign In" }).click();
    await page.waitForURL("**/dashboard", { timeout: 45_000 });

    await page.goto("/detection", { waitUntil: "domcontentloaded" });
    // The regular tabs render…
    await expect(page.getByRole("tab", { name: "Events" })).toBeVisible({ timeout: 20_000 });
    // …but the private staging tier is not offered to viewers.
    await expect(page.getByRole("tab", { name: "Ground Intel" })).toHaveCount(0);
  });
});
