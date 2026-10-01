import { test, expect } from "../support/test";
import { SEEDED_EVENTS } from "../support/data";
import { gotoEventByTitle } from "../support/helpers";

/**
 * The deep links Agent navigation uses, on the real pages: they win over
 * remembered state, keep the deep-linked country as the visit's override,
 * and turn their other filters into ordinary state for that visit only.
 */

test("Map: a deep link wins over a remembered focus and keeps its country", async ({ page }) => {
  // Remember an in-session focus, as "Full map" on an event does.
  await gotoEventByTitle(page, SEEDED_EVENTS.khartoumFlood);
  const eventId = new URL(page.url()).pathname.split("/").pop()!;
  await page.goto(`/map?event=${eventId}`, { waitUntil: "domcontentloaded" });
  await expect(page).toHaveURL(new RegExp(`event=${eventId}`));

  await page.goto("/map?country=Sudan&timeframe=7d", { waitUntil: "domcontentloaded" });
  // Timeframe applied and taken out of the URL; the country stays; the
  // remembered focus did not take over.
  await expect(page).toHaveURL(/\/map\?country=Sudan$/, { timeout: 20_000 });
  await expect(page.locator('input[value="Last 7 days"]:visible').first()).toBeVisible();
  await page.waitForTimeout(1_000);
  expect(page.url()).not.toContain("event=");
});

test("Detection: deep-linked filters apply for that visit only", async ({ page }) => {
  await page.goto("/detection?country=Sudan&date=Last%207%20days&severities=critical,high", {
    waitUntil: "domcontentloaded",
  });
  await expect(page).not.toHaveURL(/date=|severities=/, { timeout: 20_000 });
  expect(new URL(page.url()).searchParams.get("country")).toBe("Sudan");
  await expect(page.locator('input[value="Last 7 days"]:visible').first()).toBeVisible();

  // Not stored as the page's defaults.
  const stored = await page.evaluate(() => sessionStorage.getItem("detection-filters"));
  expect(stored ?? "").not.toContain("Last 7 days");
});
