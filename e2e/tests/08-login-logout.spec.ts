import { test, expect } from "../support/test";
import { ANALYST } from "../support/data";

/**
 * Case 8 — Login / logout, on a FRESH unauthenticated context (overrides the
 * suite-wide analyst storageState). This is the tracer bullet: it proves the
 * DB extensions, seed, app<->api wiring, and the real Better Auth UI flow in a
 * single path.
 */
test.use({ storageState: { cookies: [], origins: [] } });

test.describe("Login / logout (case 8)", () => {
  test("UI login reaches the dashboard; UI logout returns to the login page", async ({
    page,
  }) => {
    // ── Login ──────────────────────────────────────────────────────────────
    await page.goto("/auth/login");
    await expect(page.getByRole("button", { name: "Sign In" })).toBeVisible();

    await page.getByLabel("Email").fill(ANALYST.email);
    await page.getByLabel("Password").fill(ANALYST.password);
    await page.getByRole("button", { name: "Sign In" }).click();

    // Assert real post-login content (middleware fails open on transient
    // backend errors, so "not on /login" alone is not proof of a session).
    await page.waitForURL("**/dashboard", { timeout: 45_000 });
    await expect(page.getByText("CLEAR", { exact: true }).first()).toBeVisible();

    // ── Logout via the desktop sidebar user menu ─────────────────────────────
    await page
      .getByRole("button", { name: new RegExp(ANALYST.email, "i") })
      .click();
    await page.getByRole("menuitem", { name: "Sign out" }).click();

    await page.waitForURL("**/auth/login", { timeout: 20_000 });
    await expect(page.getByRole("button", { name: "Sign In" })).toBeVisible();
  });
});
