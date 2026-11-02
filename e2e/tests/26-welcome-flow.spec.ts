import { test, expect } from "../support/test";
import { WELCOME_INVITES, WELCOME_INVITEE_PASSWORD } from "../support/data";

/**
 * Case 26 — an invited user goes from the invite link to the product tour.
 *
 * Accept the invite, set up the profile, confirm settings, land in the tour on
 * Detection, skip it, and stay in the app. The welcome pages have their own
 * layout and provider stack, separate from `(app)`, and seeded accounts never
 * reach them (only accepting an invite starts onboarding), so nothing else in
 * the suite renders them. The prod crash this guards against: /welcome/profile
 * called a hook whose provider only the `(app)` layout mounted, and every
 * invitee got a blank page.
 *
 * Invitations come from e2e/support/invite-seed.ts. Accepting consumes one, so
 * each attempt (CI retries twice) takes its own.
 */
test.describe("Invited-user welcome flow (case 26)", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("invite link → profile → settings → tour → app", async ({ page }, testInfo) => {
    const invite = WELCOME_INVITES[testInfo.retry];
    if (!invite) throw new Error(`no seeded invitation for retry ${testInfo.retry}`);

    await page.goto(`/accept-invite?token=${invite.token}`);
    await expect(page.getByText("Accept Invitation")).toBeVisible({ timeout: 20_000 });
    await page.getByLabel("Full Name").fill("E2E Invitee");
    await page.getByRole("textbox", { name: "Password", exact: true }).fill(WELCOME_INVITEE_PASSWORD);
    await page.getByRole("textbox", { name: "Confirm Password" }).fill(WELCOME_INVITEE_PASSWORD);
    await page.getByRole("button", { name: "Accept & Create Account" }).click();

    await page.waitForURL("**/welcome/profile", { timeout: 30_000 });
    await expect(page.getByText("Set up your profile")).toBeVisible({ timeout: 20_000 });
    await expect(page.getByLabel("Full name")).toHaveValue("E2E Invitee");
    await page.getByRole("button", { name: "Continue", exact: true }).click();

    await page.waitForURL("**/welcome/settings", { timeout: 30_000 });
    await expect(page.getByText("Quick settings")).toBeVisible({ timeout: 20_000 });
    await page.getByRole("button", { name: "Continue to tour" }).click();

    await page.waitForURL("**/detection?**", { timeout: 30_000 });
    await expect(page.getByText("Alerts need your attention first")).toBeVisible({ timeout: 30_000 });
    await page.getByRole("button", { name: "Skip Tour" }).click();

    await page.waitForURL("**/map", { timeout: 30_000 });
    await expect(page.getByText("Alerts need your attention first")).toHaveCount(0);

    // Onboarding is finished: an app page stays put instead of bouncing back
    // to /welcome.
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByText("Set up your profile")).toHaveCount(0);
  });
});
