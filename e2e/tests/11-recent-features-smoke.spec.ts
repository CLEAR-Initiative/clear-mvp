import { test, expect } from "../support/test";
import { WORLD_VIEW } from "../../src/lib/constants/country-config";

/**
 * Case 11 — smoke for features landed this week / morning merges:
 *   - map "All Countries" → global WORLD_VIEW (not Sahel crop)
 *   - Insights → Situation tab shell
 *   - Detection → Ground Intel + History tabs reachable
 *   - Map layers / satellite A/B chrome still mounts
 *
 * Controls + DOM only — never assert the WebGL canvas pixels.
 */

test.describe("Recent features smoke (case 11)", () => {
  test("All Countries browse camera uses WORLD_VIEW, not a country zoom", async ({
    page,
  }) => {
    // Fresh session so a prior country camera seed cannot mask the default.
    await page.goto("/map", { waitUntil: "domcontentloaded" });
    await page.evaluate(() => sessionStorage.clear());
    await page.reload({ waitUntil: "domcontentloaded" });

    const country = page.getByRole("textbox", { name: "Country" });
    await expect(country).toBeVisible();

    // Unscoped teams keep "All Countries"; scoped teams pin to one country —
    // either way the browse-camera testid must be present after hydrate.
    const camera = page.getByTestId("map-browse-camera");
    await expect(camera).toBeVisible();

    const countryValue = await camera.getAttribute("data-country");
    if (countryValue === "All Countries") {
      await expect(camera).toHaveAttribute(
        "data-center-lng",
        String(WORLD_VIEW.center[0]),
      );
      await expect(camera).toHaveAttribute(
        "data-center-lat",
        String(WORLD_VIEW.center[1]),
      );
      await expect(camera).toHaveAttribute(
        "data-zoom",
        String(WORLD_VIEW.zoom),
      );
      // Regression: former bug used zoom 4–5 (country crop over Mali/Sahel).
      const zoom = Number(await camera.getAttribute("data-zoom"));
      expect(zoom).toBeLessThan(2.5);
    } else {
      // Team-scoped: camera should be a country zoom, not WORLD_VIEW.
      const zoom = Number(await camera.getAttribute("data-zoom"));
      expect(zoom).toBeGreaterThanOrEqual(4);
    }
  });

  test("Insights Situation tab loads (empty or analysis shell)", async ({
    page,
  }) => {
    await page.goto("/insights", { waitUntil: "domcontentloaded" });
    const situationTab = page.getByRole("tab", { name: /Situation/i });
    await expect(situationTab).toBeVisible({ timeout: 20_000 });
    await situationTab.click();
    // Seeded stack has a single country → name text, not a multi-country Select.
    // Assert the Situation shell: empty state or overview sub-tabs.
    await expect(
      page
        .getByText(/No situation analysis|Overview|Sectors|Sources|Sudan/i)
        .first(),
    ).toBeVisible({ timeout: 20_000 });
  });

  test("Detection Ground Intel and History tabs are reachable", async ({
    page,
  }) => {
    await page.goto("/detection", { waitUntil: "domcontentloaded" });

    const ground = page.getByRole("tab", { name: /Ground/i });
    await expect(ground).toBeVisible({ timeout: 20_000 });
    await ground.click();
    await expect(page.getByTestId("ground-intel-tab")).toBeVisible();

    const history = page.getByRole("tab", { name: /History/i });
    await expect(history).toBeVisible();
    await history.click();
    // Opt-in filter chips (#164) — at least the Class chip row / table shell.
    await expect(page.getByText(/Class|Alert|Event|Signal/i).first()).toBeVisible();
  });

  test("Map layers toggle still opens after topography / A/B merges", async ({
    page,
  }) => {
    await page.goto("/map", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("textbox", { name: "Country" })).toBeVisible();
    await page.getByTestId("map-layers-toggle").click();
    await expect(page.getByText("Boundaries")).toBeVisible();
  });
});
