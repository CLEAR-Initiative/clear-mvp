import { test, expect } from "../support/test";

/**
 * Case 1 — create a signal via the Create Signal modal (Detection header) and
 * assert it lands in the Signals list. The async pipeline (process_manual_signal)
 * is out of the stack; we assert the signal was filed + rendered, not enriched.
 */
test.describe("Create signal (case 1)", () => {
  test("a created signal appears in the Signals list", async ({ page }) => {
    await page.goto("/detection", { waitUntil: "domcontentloaded" });
    // Wait for hydration + feed before clicking — a pre-hydrate click is a no-op
    // on the React onClick handler and the modal never opens.
    await expect(page.locator('a[href^="/event/"]').first()).toBeVisible();

    await page.getByRole("button", { name: "Create Signal" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    const title = `E2E Smoke Signal ${Date.now()}`;
    // Placeholders match messages/en.json → common.createSignal.*
    await dialog
      .getByPlaceholder("e.g., Flooding reported in Kassala State")
      .fill(title);

    // field_officer is auto-selected when present; still pick explicitly so the
    // assertion doesn't depend on the race with sourcesQuery.
    await dialog.getByPlaceholder("Select a source…").click();
    await page.getByRole("option", { name: "Field Team" }).click();

    await dialog.getByPlaceholder("Search location…").click();
    await dialog.getByPlaceholder("Search location…").fill("Khartoum");
    await page.getByRole("option", { name: /Khartoum/ }).first().click();

    await dialog.getByPlaceholder("Select severity…").click();
    await page.getByRole("option", { name: "High", exact: true }).click();

    const next = dialog.getByRole("button", { name: "Next: Add Media" });
    await expect(next).toBeEnabled();
    await next.click();
    await dialog.getByRole("button", { name: "Skip & Submit" }).click();

    await expect(dialog.getByRole("button", { name: "Done" })).toBeVisible();
    await dialog.getByRole("button", { name: "Done" }).click();

    // New signals surface behind a "N new items - refresh" banner rather than
    // auto-inserting; reload so the created signal loads as part of the feed.
    await expect(async () => {
      await page.reload({ waitUntil: "domcontentloaded" });
      await page.getByRole("tab", { name: "Signals" }).click();
      await expect(page.getByText(title)).toBeVisible({ timeout: 5_000 });
    }).toPass({ timeout: 30_000 });
  });
});
