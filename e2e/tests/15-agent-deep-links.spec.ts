import { test, expect } from "../support/test";
import { SEEDED_EVENTS } from "../support/data";
import { countryIdByName, gotoEventByTitle } from "../support/helpers";

/**
 * The deep links Agent navigation uses, on the real pages: places travel as
 * ids, they win over remembered state, the deep-linked country stays as the
 * visit's override, and the other filters become ordinary state for that
 * visit only — a revisit (here, a reload) brings them back.
 */

test("Map: a deep link wins over a remembered focus and keeps its country", async ({ page }) => {
  // Remember an in-session focus, as "Full map" on an event does.
  await gotoEventByTitle(page, SEEDED_EVENTS.khartoumFlood);
  const eventId = new URL(page.url()).pathname.split("/").pop()!;
  const sudan = await countryIdByName(page, "Sudan");
  await page.goto(`/map?event=${eventId}`, { waitUntil: "domcontentloaded" });
  await expect(page).toHaveURL(new RegExp(`event=${eventId}`));

  await page.goto(`/map?countryId=${sudan}&timeframe=7d`, { waitUntil: "domcontentloaded" });
  // Timeframe applied and taken out of the URL; the country stays; the
  // remembered focus did not take over.
  await expect(page).toHaveURL(new RegExp(`/map\\?countryId=${sudan}$`), { timeout: 20_000 });
  await expect(page.locator('input[value="Last 7 days"]:visible').first()).toBeVisible();
  await page.waitForLoadState("networkidle");
  expect(page.url()).not.toContain("event=");

  // A revisit restores the visit's timeframe instead of resetting it.
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.locator('input[value="Last 7 days"]:visible').first()).toBeVisible({ timeout: 20_000 });
});

test("Detection: deep-linked filters apply for that visit only", async ({ page }) => {
  await page.goto("/detection", { waitUntil: "domcontentloaded" });
  const sudan = await countryIdByName(page, "Sudan");
  await page.goto(`/detection?countryId=${sudan}&date=Last%207%20days&severities=critical,high`, {
    waitUntil: "domcontentloaded",
  });
  await expect(page).not.toHaveURL(/date=|severities=/, { timeout: 20_000 });
  expect(new URL(page.url()).searchParams.get("countryId")).toBe(sudan);
  await expect(page.locator('input[value="Last 7 days"]:visible').first()).toBeVisible();

  // Kept under the link, not stored as the page's defaults.
  await expect
    .poll(() => page.evaluate(() => sessionStorage.getItem("detection-link-filters") ?? ""))
    .toContain("Last 7 days");
  const stored = await page.evaluate(() => sessionStorage.getItem("detection-filters"));
  expect(stored ?? "").not.toContain("Last 7 days");

  // A revisit of the same link brings the visit's filters back.
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.locator('input[value="Last 7 days"]:visible').first()).toBeVisible({ timeout: 20_000 });
});
