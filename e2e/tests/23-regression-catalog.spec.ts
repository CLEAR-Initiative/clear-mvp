import type { Page } from "@playwright/test";
import { test, expect } from "../support/test";

/**
 * CLEAR-571 — filter chrome on /map must already be at its final left when the
 * page reloads. Missing SSR `data-nav-overlay` used to paint the bar at the
 * left edge, then slide it by the sidebar width. Geometry of the filter bar
 * only. Never the Mapbox canvas.
 *
 * CLEAR-589 is not driven here. The hermetic seed cannot select a non-crisis
 * NRC location, so that row is in e2e/ALLOWLIST.md.
 */

const SLIDE_PX = 8;

test.describe("Regression catalog", () => {
  test("map filter chrome does not slide on reload", async ({ page }) => {
    await armFilterLeftSampler(page);

    await page.goto("/map", { waitUntil: "domcontentloaded" });
    const chrome = page.locator('[data-tour="map-filters"]:visible');
    await expect(chrome).toBeVisible();

    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(chrome).toBeVisible();
    // NavSidebar publishes the width in a layout effect. Visibility of the
    // server-rendered bar is earlier than that, so wait for the inline
    // variable, then through the 200ms left transition, before reading
    // every sample taken since first paint.
    await expect
      .poll(() =>
        page.evaluate(() => document.documentElement.style.getPropertyValue("--clear-nav-w")),
      )
      .not.toBe("");
    await page.evaluate(() => new Promise((resolve) => setTimeout(resolve, 250)));

    const spread = await filterLeftSpread(page);
    expect(spread).toBeLessThan(SLIDE_PX);

    const box = await chrome.boundingBox();
    const viewport = page.viewportSize();
    expect(box).not.toBeNull();
    expect(viewport).not.toBeNull();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(viewport!.width + 1);
  });
});

async function armFilterLeftSampler(page: Page) {
  await page.addInitScript(() => {
    const w = window as Window & { __mapFilterLeft?: number[] };
    w.__mapFilterLeft = [];
    const sample = () => {
      const nodes = document.querySelectorAll("[data-tour='map-filters']");
      for (const node of nodes) {
        const box = node.getBoundingClientRect();
        if (box.width > 0 && box.height > 0) {
          w.__mapFilterLeft!.push(box.left);
          break;
        }
      }
      requestAnimationFrame(sample);
    };
    requestAnimationFrame(sample);
  });
}

async function filterLeftSpread(page: Page): Promise<number> {
  const samples = await page.evaluate(
    () => (window as Window & { __mapFilterLeft?: number[] }).__mapFilterLeft ?? [],
  );
  expect(samples.length).toBeGreaterThan(1);
  return Math.max(...samples) - Math.min(...samples);
}
