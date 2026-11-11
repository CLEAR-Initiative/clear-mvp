import { test, expect } from "../support/test";
import { SEEDED_EVENTS } from "../support/data";
import { countryIdByName, gotoDetectionEvents, eventRows } from "../support/helpers";

/**
 * Case 6 - filter the Detection Events list from the query bar above the list
 * and assert it narrows to exactly the matching seeded event(s).
 *
 * Places are a server-side filter (eventsPage locationId → the place and
 * everything under it) and need a country: the deep link's countryId scopes
 * the visit to Sudan, whose states the `in:` list offers. Type is filtered by
 * GLIDE code; the seeded events only carry codes because
 * e2e/support/event-types-seed.ts rewrites clear-api's plain slugs.
 */

/** Title line of every visible event row, sorted for order-independent compares. */
async function visibleTitles(page: import("@playwright/test").Page) {
  const all = Object.values(SEEDED_EVENTS);
  const texts = await eventRows(page).allInnerTexts();
  return texts
    .map((text) => all.find((title) => text.includes(title)) ?? text)
    .sort();
}

test.describe("Filter events (case 6)", () => {
  test("in: narrows the list to a state's events", async ({ page }) => {
    await gotoDetectionEvents(page);
    const sudan = await countryIdByName(page, "Sudan");
    await page.goto(`/detection?countryId=${sudan}`, { waitUntil: "domcontentloaded" });
    await expect.poll(() => visibleTitles(page)).toEqual(Object.values(SEEDED_EVENTS).sort());

    // The first match is the state itself; Enter picks it.
    const bar = page.getByTestId("query-bar-input");
    await bar.fill("in:khartoum");
    await expect(page.getByRole("option").first()).toContainText("Khartoum");
    await bar.press("Enter");

    await expect(page.getByTestId("query-token-in")).toContainText("Khartoum");
    await expect.poll(() => visibleTitles(page)).toEqual([SEEDED_EVENTS.khartoumFlood]);
  });

  test("type: narrows the list to that event type", async ({ page }) => {
    await gotoDetectionEvents(page);
    expect(await eventRows(page).count()).toBeGreaterThan(1);

    // The event type comes before its subtypes; picking it selects them all.
    const bar = page.getByTestId("query-bar-input");
    await bar.fill("type:conflict");
    await expect(page.getByRole("option").first()).toContainText(/conflict/i);
    await bar.press("Enter");

    await expect(page.getByTestId("query-token-type")).toBeVisible();
    await expect.poll(() => visibleTitles(page)).toEqual([SEEDED_EVENTS.darfurConflict]);
  });

  test("severity: picking a level shows only that level", async ({ page }) => {
    await gotoDetectionEvents(page);
    const before = await eventRows(page).count();
    expect(before).toBeGreaterThan(1);

    const bar = page.getByTestId("query-bar-input");
    await bar.fill("severity:low");
    await bar.press("Enter");

    await expect(page.getByTestId("query-token-severity")).toContainText("low");
    await expect.poll(() => visibleTitles(page)).toContain(SEEDED_EVENTS.foodSecurity);
    const levels = await eventRows(page).locator("[data-severity]").evaluateAll((els) => els.map((el) => el.getAttribute("data-severity")));
    expect(levels.every((l) => l === "low")).toBe(true);
    expect(levels.length).toBeLessThan(before);
  });
});
