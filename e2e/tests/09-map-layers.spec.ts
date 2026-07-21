import { test, expect } from "../support/test";

/**
 * Case 9 — change map layer controls on /map and assert each reflects the new
 * state. Controls only — never the WebGL canvas (no Mapbox token in the stack).
 * The layers panel is opened by an icon-only button carrying a data-testid
 * (map-layers-toggle).
 */
test.describe("Map layers (case 9)", () => {
  test("changing boundary level and toggling population update the controls", async ({
    page,
  }) => {
    await page.goto("/map", { waitUntil: "domcontentloaded" });
    await page.getByTestId("map-layers-toggle").click();

    // Boundaries Select — default "A1 - States"; switch to "A2 - Districts".
    await expect(page.locator('input[value="A1 - States"]')).toBeVisible();
    await page.locator('input[value="A1 - States"]').click();
    await page.getByRole("option", { name: "A2 - Districts" }).click();
    await expect(page.locator('input[value="A2 - Districts"]')).toBeVisible();

    // Population checkbox — toggle it and assert the checkbox state flips.
    // ("Population" is both a section label and the row label; scope to the row
    // div that has both a checkbox and exactly that text.)
    const populationCheckbox = page
      .locator("div")
      .filter({ has: page.locator('input[type="checkbox"]') })
      .filter({ hasText: /^Population$/ })
      .locator('input[type="checkbox"]');
    const wasChecked = await populationCheckbox.isChecked();
    await populationCheckbox.click();
    await expect(populationCheckbox).toBeChecked({ checked: !wasChecked });
  });
});
