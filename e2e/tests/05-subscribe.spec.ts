import { test, expect } from "../support/test";

/**
 * Case 5 — create an alert subscription with a region + a disaster type on the
 * /profile Notifications tab, and assert the subscription card appears.
 */
test.describe("Subscribe by region + type (case 5)", () => {
  test("subscribing with a region and a type shows the subscription", async ({
    page,
  }) => {
    await page.goto("/profile", { waitUntil: "domcontentloaded" });
    await page.getByRole("tab", { name: "Notifications" }).click();
    await page.getByRole("button", { name: "Add", exact: true }).click();

    // Region (MultiSelect, portaled).
    const locations = page.getByPlaceholder("Select one or more locations");
    await locations.click();
    await locations.fill("Kassala");
    await page.getByRole("option", { name: "Kassala", exact: true }).click();
    await page.keyboard.press("Escape"); // close the dropdown

    // Type (DisasterTypePicker popover checkbox tree).
    await page.getByRole("button", { name: "Select disaster types" }).click();
    await page
      .getByRole("checkbox", { name: "conflict and violence" })
      .check();
    await page.keyboard.press("Escape"); // close the popover

    await page.getByRole("button", { name: "Subscribe" }).click();

    // The new subscription card renders the region name.
    await expect(
      page.getByText("Kassala", { exact: true }).first(),
    ).toBeVisible();
  });
});
