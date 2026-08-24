import { test, expect } from "../support/test";

/**
 * Case 12 — Observe PWA field-signal pipeline (PR 200 / Expo #399).
 *
 * Online GPS submit lands on the Observe Signals tab. Offline text+GPS
 * queues on the device and drains when the browser is back online.
 * Detection / map pins are covered by the PR's preview checklist; this
 * spec stays on `/observe` so it does not depend on Mapbox pixels.
 */

const KHARTOUM = { latitude: 15.5007, longitude: 32.5599 };

test.describe("Observe field signals (case 12)", () => {
  test.use({
    geolocation: KHARTOUM,
    permissions: ["geolocation"],
  });

  test("an online GPS signal appears on the Signals tab", async ({ page }) => {
    await page.goto("/observe", { waitUntil: "domcontentloaded" });
    await expect(page.getByText("Field Signals")).toBeVisible();

    const title = `E2E Observe Online ${Date.now()}`;
    await page.getByPlaceholder("What did you observe?").fill(title);
    await page.getByRole("button", { name: "Capture location" }).click();
    await expect(page.getByText("15.5007°N 32.5599°E")).toBeVisible();

    const send = page.getByRole("button", { name: "Send signal" });
    await expect(send).toBeEnabled();
    await send.click();
    await expect(page.getByText("Signal received")).toBeVisible({
      timeout: 20_000,
    });

    await page.getByRole("button", { name: "Signals" }).click();
    await expect(page.getByText(title)).toBeVisible({ timeout: 20_000 });
  });

  test("an offline GPS signal drains onto the Signals tab when back online", async ({
    page,
    context,
  }) => {
    await page.goto("/observe", { waitUntil: "domcontentloaded" });
    await expect(page.getByText("Field Signals")).toBeVisible();

    const title = `E2E Observe Offline ${Date.now()}`;
    await page.getByPlaceholder("What did you observe?").fill(title);
    await page.getByRole("button", { name: "Capture location" }).click();
    await expect(page.getByText("15.5007°N 32.5599°E")).toBeVisible();

    await context.setOffline(true);
    const send = page.getByRole("button", { name: "Send signal" });
    await expect(send).toBeEnabled();
    await send.click();
    await expect(
      page.getByText("Your signal has been saved locally"),
    ).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("1 queued")).toBeVisible();

    await context.setOffline(false);
    await expect(page.getByText("You're back online")).toBeVisible({
      timeout: 20_000,
    });

    await page.getByRole("button", { name: "Signals" }).click();
    await expect(page.getByText(title)).toBeVisible({ timeout: 20_000 });
  });
});
