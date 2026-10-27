import { test, expect } from "../support/test";
import { SEEDED_ANALYSIS } from "../support/data";

/**
 * Analysis redesign. The list is real scopes only: there is no design sample.
 * Creating an analysis is opened and cancelled so the test does not write a scope.
 *
 * The second test walks the seeded Sudan analysis once. It does not build a PDF.
 */

/** Long enough that the loading label is still on screen when the assertion runs. */
const EVENTS_HOLD_MS = 1_000;

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

  test("a seeded analysis keeps the patched page behaviours", async ({ page }) => {
    test.setTimeout(60_000);
    await page.emulateMedia({ colorScheme: "light" });

    let holdEvents = true;
    let failScopes = false;
    await page.route(/\/api\/trpc\//, async (route) => {
      const url = route.request().url();
      if (failScopes && url.includes("analysis.scopes")) {
        await route.abort();
        return;
      }
      if (holdEvents && url.includes("analysis.events") && !url.includes("analysis.current")) {
        await new Promise((resolve) => setTimeout(resolve, EVENTS_HOLD_MS));
      }
      await route.continue();
    });

    await page.goto(`/analysis?country=${SEEDED_ANALYSIS.countryId}`, { waitUntil: "domcontentloaded" });
    const detail = page.getByTestId("analysis-page");
    await expect(detail).toBeVisible();

    const map = page.getByRole("region", { name: "Analysis area" });
    await expect(map).toContainText("Loading events…");
    await expect(map).not.toContainText(/\b0\b/);
    holdEvents = false;
    await expect(map).toContainText(/events since/);
    await expect(map).not.toContainText("Loading events…");

    await expect(page.getByTestId("analysis-meta")).toContainText(/cited event/);
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

    await page.getByRole("tab", { name: "Sources & Events" }).click();
    const sources = page.getByTestId("analysis-sources");
    await expect(sources).toContainText(SEEDED_ANALYSIS.sourceTitle);
    await expect(sources).toContainText(SEEDED_ANALYSIS.eventLabel);
    await expect(sources).not.toContainText(SEEDED_ANALYSIS.unresolvedEventCitation);
    await expect(page.getByTestId("analysis-events")).toContainText(/Sample: \d+ of \d+/);

    await page.goto("/analysis?automation=not-a-real-automation", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "Analyses" })).toBeVisible();
    await expect(page.getByTestId("analysis-page")).toHaveCount(0);

    failScopes = true;
    await page.goto("/analysis", { waitUntil: "domcontentloaded" });
    await expect(page.getByText("The analysis could not be loaded.")).toBeVisible();
  });
});
