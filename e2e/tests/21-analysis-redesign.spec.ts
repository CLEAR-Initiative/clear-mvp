import { test, expect } from "../support/test";
import { SEEDED_ANALYSIS } from "../support/data";
import { countryIdByName } from "../support/helpers";

/**
 * Insights. The list is real scopes only: there is no design sample.
 * Creating an analysis is opened and cancelled so the test does not write a scope.
 *
 * The page is /insights. The opened record is insights=. Older links still
 * open: /analysis redirects here, and analysis= or automation= is rewritten
 * to insights=.
 *
 * The second test walks the seeded Sudan country analysis once. It does not
 * build a PDF, start a generation, or invent figures the seed does not have.
 * The seed is one WASH sector with a stock figure, two citations, and the
 * country's events. Funding shares, duplicate titles, and a raw publisher id
 * are covered by unit tests because this document does not contain them.
 */

/** Long enough that the loading label is still on screen when the assertion runs. */
const EVENTS_HOLD_MS = 1_000;

test.describe("Insights", () => {
  test("the list has no design sample, and a new analysis waits for areas", async ({ page }) => {
    test.setTimeout(90_000);

    await page.goto("/insights", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/insights(?:\?|$)/);
    await expect(page.getByRole("heading", { name: "Analyses" })).toBeVisible();
    await expect(page.getByTestId("analysis-preview")).toHaveCount(0);
    await expect(page.getByTestId("analysis-scope-preview-created")).toHaveCount(0);

    await page.getByTestId("analysis-new").click();
    await expect(page.getByText(/New analysis in /)).toBeVisible();
    await expect(page.getByTestId("analysis-create-submit")).toBeDisabled();
    await page.getByRole("button", { name: "Cancel" }).click();
    await expect(page.getByText(/New analysis in /)).toBeHidden();

    await page.goto("/analysis", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/insights(?:\?|$)/);
    await expect(page.getByRole("heading", { name: "Analyses" })).toBeVisible();
  });

  test("a seeded analysis keeps the patched page behaviours", async ({ page }) => {
    test.setTimeout(60_000);
    await page.emulateMedia({ colorScheme: "light" });

    let holdEvents = true;
    await page.route(/\/api\/trpc\//, async (route) => {
      const url = route.request().url();
      if (holdEvents && url.includes("analysis.events") && !url.includes("analysis.current")) {
        await new Promise((resolve) => setTimeout(resolve, EVENTS_HOLD_MS));
      }
      await route.continue();
    });

    const sudan = await countryIdByName(page, SEEDED_ANALYSIS.countryName);
    await page.goto(`/insights?country=${sudan}`, { waitUntil: "domcontentloaded" });
    const detail = page.getByTestId("analysis-page");
    await expect(detail).toBeVisible();
    // country= is a location id. It must stay that, and not be rewritten as an insights id.
    await expect(page).toHaveURL(/\/insights\?/);
    await expect(page).toHaveURL(new RegExp(`[?&]country=${sudan}(?:&|$)`));
    await expect(page).not.toHaveURL(/[?&](?:insights|analysis|automation)=/);

    const map = page.getByRole("region", { name: "Analysis area" });
    await expect(map).toContainText("Loading events…");
    await expect(map).not.toContainText(/\b0\b/);
    holdEvents = false;
    // The count is events in the area. "event" and "events" both count; the empty
    // sentence is "No events recorded in this area since …", which this pattern skips.
    await expect(map).toContainText(/events? in this area since/);
    await expect(map).not.toContainText("No events recorded");
    await expect(map).not.toContainText("Loading events…");

    await expect(page.getByTestId("analysis-meta")).toContainText(/cited events?/);
    await expect(page.getByTestId("analysis-section-contexts")).toContainText(SEEDED_ANALYSIS.leadingRange);

    const background = () =>
      detail.evaluate((el) => getComputedStyle(el).backgroundColor);
    const scheme = (value: "light" | "dark") =>
      page.evaluate((value) => {
        document.documentElement.setAttribute("data-mantine-color-scheme", value);
      }, value);
    await scheme("light");
    await expect.poll(background).toBe("rgb(250, 250, 250)");
    await scheme("dark");
    await expect.poll(background).toBe("rgb(11, 12, 15)");
    await scheme("light");

    await page.getByRole("tab", { name: "Needs Assessment" }).click();
    const needs = page.getByTestId("analysis-sectors-card");
    await expect(needs).toContainText("WASH");
    await expect(needs).toContainText(SEEDED_ANALYSIS.washPin);
    // The seed has no Food, Nutrition, or Agriculture grade, so those rows are absent.
    // Presence and precision are crisis-detail columns; this table does not render them.
    await expect(needs).not.toContainText("Op. Presence");
    await expect(needs).not.toContainText("Precision");
    await expect(needs).not.toContainText("Food Security");

    await page.getByRole("tab", { name: "Sources & Events" }).click();
    const sources = page.getByTestId("analysis-sources");
    await expect(sources).toContainText(SEEDED_ANALYSIS.sourceTitle);
    await expect(sources).toContainText(SEEDED_ANALYSIS.eventLabel);
    await expect(sources).not.toContainText(SEEDED_ANALYSIS.unresolvedEventCitation);
    // The events query has already settled for the map, so this is the loaded list,
    // not the loading flash. A settled list with events must not say it is empty.
    const events = page.getByTestId("analysis-events");
    await expect(events).toContainText(/Sample: \d+ of \d+/);
    await expect(events).not.toContainText("No events recorded");
    await expect(events).not.toContainText("Loading events…");

    await page.goto("/insights?automation=not-a-real-automation", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/insights\?/);
    await expect(page).toHaveURL(/[?&]insights=not-a-real-automation(?:&|$)/);
    await expect(page).not.toHaveURL(/[?&](?:analysis|automation)=/);
    await expect(page.getByRole("heading", { name: "Analyses" })).toBeVisible();
    await expect(page.getByTestId("analysis-page")).toHaveCount(0);

    await page.goto("/analysis?analysis=not-a-real-automation", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/insights\?/);
    await expect(page).toHaveURL(/[?&]insights=not-a-real-automation(?:&|$)/);
    await expect(page).not.toHaveURL(/[?&](?:analysis|automation)=/);
    await expect(page.getByRole("heading", { name: "Analyses" })).toBeVisible();
    await expect(page.getByTestId("analysis-page")).toHaveCount(0);
  });
});
