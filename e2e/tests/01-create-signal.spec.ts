import { test, expect } from "../support/test";

/**
 * Case 1 — create a signal via the Create Signal modal (Detection header) and
 * assert it lands in the Signals list. The async pipeline (process_manual_signal)
 * is out of the stack; we assert the signal was filed + rendered, not enriched.
 */
test.describe("Create signal (case 1)", () => {
  test("a created signal appears in the Signals list", async ({ page }) => {
    await page.goto("/detection", { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: "Create Signal" }).click();

    const title = `E2E Smoke Signal ${Date.now()}`;
    await page
      .getByPlaceholder("Flooding reported in Kassala")
      .fill(title);

    // Source is required (not auto-selected); pick the seeded manual source.
    await page.getByPlaceholder("Select a source").click();
    await page.getByRole("option").first().click();

    // Give the signal a location so it clears the location-scoped signal feed
    // (the list is filtered to the team's locations).
    await page.getByPlaceholder("Search location").click();
    await page.getByPlaceholder("Search location").fill("Khartoum");
    await page.getByRole("option").first().click();

    // Pick a severity so the new signal clears the list's default severity filter
    // (severity is otherwise pipeline-assigned, which is out of scope here).
    await page.getByPlaceholder("Select severity").click();
    await page.getByRole("option", { name: "High", exact: true }).click();

    await page.getByRole("button", { name: "Next: Add Media" }).click();
    await page.getByRole("button", { name: "Skip & Submit" }).click();

    // Success step — the Done button only renders once the signal is filed.
    await expect(page.getByRole("button", { name: "Done" })).toBeVisible();
    await page.getByRole("button", { name: "Done" }).click();

    // New signals surface behind a "N new items - refresh" banner rather than
    // auto-inserting; reload so the created signal loads as part of the feed.
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.getByRole("tab", { name: "Signals" }).click();
    await expect(page.getByText(title)).toBeVisible();
  });
});
