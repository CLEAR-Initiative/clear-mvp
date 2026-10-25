import { test, expect } from "../support/test";

/**
 * Analysis redesign. The list is real scopes only: there is no design sample.
 * Creating an analysis is opened and cancelled so the test does not write a scope.
 */

test.describe("Analysis redesign", () => {
  test("the list has no design sample, and a new analysis waits for areas", async ({ page }) => {
    test.setTimeout(90_000);

    await page.goto("/analysis", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "Analyses" })).toBeVisible();
    await expect(page.getByTestId("analysis-preview")).toHaveCount(0);
    await expect(page.getByTestId("analysis-scope-preview-created")).toHaveCount(0);

    await page.getByTestId("analysis-new").click();
    await expect(page.getByText(/New analysis in /)).toBeVisible();
    await expect(page.getByTestId("analysis-create-submit")).toBeDisabled();
    await page.getByRole("button", { name: "Cancel" }).click();
    await expect(page.getByText(/New analysis in /)).toBeHidden();
  });
});
