import type { Page } from "@playwright/test";
import { test, expect } from "../support/test";

/**
 * Case 29 — the NRC presence map on the Overview, on a real Mapbox canvas.
 *
 * Every other map spec tests controls only, because the stack had no Mapbox
 * token. So no test could see a map that crashes while it draws, and four
 * prod hotfixes in one week were exactly that (GlitchTip prod #912 was a
 * crash on a country click). This spec draws the map, hovers and clicks
 * countries, and relies on two guards:
 *
 * - the crash guard (e2e/support/test.ts) fails the test on any uncaught
 *   exception, which is how a Mapbox render-loop crash shows;
 * - the paint guard (src/lib/map/safe-paint.ts) fails the test on an unsafe
 *   paint change, through `failE2ETest`. The #912 crash itself is a timing
 *   race, so the guard is what makes that class fail every time.
 *
 * Needs a Mapbox token in the web image: the spec runs only when
 * E2E_REAL_MAP=1 (e2e/run-local.sh and the CI workflow set it when they have
 * a token). The world map is behind `overview_world_map`. Flags are
 * platform-wide, so the flag is turned on for this page only, by rewriting
 * the flag response, and other specs keep the default Overview.
 */

const REAL_MAP = process.env.E2E_REAL_MAP === "1";

// Headless Chromium has no GPU: draw WebGL in software.
test.use({
  launchOptions: { args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] },
});

const FILL_LAYER = "nrc-presence-fill";
const LINE_LAYER = "nrc-presence-line";
const SOURCE = "nrc-presence-countries";

/** Points well inside NRC countries, away from their pins: [lng, lat]. */
const COUNTRY_POINTS: Array<[number, number]> = [
  [30, 14], // Sudan
  [23.5, -3], // DR Congo
  [66, 33.5], // Afghanistan
  [-73, 4], // Colombia
  [31.5, 49], // Ukraine
];

/* The page-side code below runs in the browser. `m()` is the live Mapbox map
   that the E2E image exposes (src/lib/e2e/e2e-hooks.ts). */
/* eslint-disable @typescript-eslint/no-explicit-any */

/** Serve this page the real flags, with `overview_world_map` on. */
async function turnOnWorldMap(page: Page): Promise<void> {
  await page.route("**/api/trpc/**", async (route) => {
    const procedures = new URL(route.request().url()).pathname.split("/api/trpc/")[1]?.split(",") ?? [];
    const index = procedures.indexOf("featureFlags.getAll");
    if (index === -1) {
      await route.fallback();
      return;
    }
    const response = await route.fetch();
    const body = await response.json();
    const flags = (Array.isArray(body) ? body[index] : body)?.result?.data?.json;
    if (Array.isArray(flags)) {
      for (const flag of flags) if (flag.key === "overview_world_map") flag.enabled = true;
    }
    await route.fulfill({
      status: response.status(),
      headers: { ...response.headers(), "content-type": "application/json" },
      json: body,
    });
  });
}

/** The presence layers are drawn and the camera is at rest. */
async function waitForMapAtRest(page: Page): Promise<void> {
  await page.waitForFunction(
    ([fill, source]) => {
      const map = window.__clearE2EMap as any;
      return (
        !!map &&
        map.loaded() &&
        !map.isMoving() &&
        !!map.getLayer(fill) &&
        map.isSourceLoaded(source) &&
        map.queryRenderedFeatures({ layers: [fill] }).length > 0
      );
    },
    [FILL_LAYER, SOURCE] as const,
    { timeout: 45_000 },
  );
}

/** Let the next frames and timers run, so a render-loop error or a guard report lands. */
async function settle(page: Page): Promise<void> {
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(resolve, 100)));
      }),
  );
}

type CountryHit = { x: number; y: number; iso: string };

/** Viewport pixels of the NRC countries that are on screen now. */
async function countriesOnScreen(page: Page): Promise<CountryHit[]> {
  return page.evaluate(
    ([points, fill]) => {
      const map = window.__clearE2EMap as any;
      const rect = map.getCanvas().getBoundingClientRect();
      const hits: Array<{ x: number; y: number; iso: string }> = [];
      for (const [lng, lat] of points) {
        const p = map.project([lng, lat]);
        if (p.x < 0 || p.y < 0 || p.x > rect.width || p.y > rect.height) continue;
        const feature = map.queryRenderedFeatures([p.x, p.y], { layers: [fill] })[0];
        const iso = feature?.properties?.iso_3166_1;
        if (typeof iso === "string") hits.push({ x: rect.left + p.x, y: rect.top + p.y, iso });
      }
      return hits;
    },
    [COUNTRY_POINTS, FILL_LAYER] as const,
  );
}

async function hoverState(page: Page, iso: string): Promise<boolean> {
  return page.evaluate(
    ([id, source]) => {
      const map = window.__clearE2EMap as any;
      return map.getFeatureState({ source, sourceLayer: "country_boundaries", id })?.hover === true;
    },
    [iso, SOURCE] as const,
  );
}

async function lineVisibility(page: Page): Promise<string> {
  return page.evaluate((line) => {
    const map = window.__clearE2EMap as any;
    return map.getLayoutProperty(line, "visibility") ?? "visible";
  }, LINE_LAYER);
}

/** The labelled button on the map. The country panel's close icon has the same name. */
function backToWorld(page: Page) {
  return page.getByRole("button", { name: "Back to world" }).first();
}

/** What tells one Mapbox style from another: its name and sprite sheet. */
async function styleId(page: Page): Promise<string> {
  return page.evaluate(() => {
    const style = (window.__clearE2EMap as any).getStyle();
    return `${style?.name ?? ""}|${JSON.stringify(style?.sprite ?? "")}`;
  });
}

/** Count the styles that finish loading from now on. Returns the current style's id. */
async function watchStyleLoads(page: Page): Promise<string> {
  await page.evaluate(() => {
    const w = window as any;
    w.__clearE2EStyleLoads = 0;
    w.__clearE2EMap.on("style.load", () => {
      w.__clearE2EStyleLoads += 1;
    });
  });
  return styleId(page);
}

async function styleLoads(page: Page): Promise<number> {
  return page.evaluate(() => (window as any).__clearE2EStyleLoads as number);
}

async function mapZoom(page: Page): Promise<number> {
  return page.evaluate(() => (window.__clearE2EMap as any).getZoom() as number);
}

async function hover(page: Page, at: CountryHit): Promise<void> {
  // Two moves: Mapbox needs a real mousemove on the canvas, not only a jump.
  await page.mouse.move(at.x - 6, at.y - 6);
  await page.mouse.move(at.x, at.y, { steps: 4 });
}

test.describe("Presence map on a real canvas (case 29)", () => {
  test.skip(!REAL_MAP, "needs a Mapbox token in the web image; set E2E_REAL_MAP=1 when the stack has one");

  test("hovering and selecting countries keeps the map alive", async ({ page }) => {
    test.setTimeout(120_000);
    await turnOnWorldMap(page);
    await page.goto("/dashboard", { waitUntil: "domcontentloaded" });

    await expect(page.getByText("NRC presence")).toBeVisible({ timeout: 30_000 });
    await waitForMapAtRest(page);

    // Three rounds: the first crash of this kind (GlitchTip prod #912) was a
    // race between the click, the selection and the next frame.
    for (let round = 0; round < 3; round++) {
      const world = await countriesOnScreen(page);
      expect(world.length, "NRC countries on screen in the world view").toBeGreaterThanOrEqual(2);
      const first = world[round % world.length]!;
      const second = world[(round + 1) % world.length]!;

      // World view: hover highlights the country, and the borders are on.
      await hover(page, first);
      await expect.poll(() => hoverState(page, first.iso), { message: `hover on ${first.iso}` }).toBe(true);
      expect(await lineVisibility(page)).toBe("visible");

      // Select it: the country view opens and the world borders hide.
      await page.mouse.click(first.x, first.y);
      await expect(backToWorld(page)).toBeVisible();
      await expect.poll(() => lineVisibility(page)).toBe("none");
      await settle(page);
      await waitForMapAtRest(page);

      // Back to the world view: hover works at once on another country.
      await backToWorld(page).click();
      await expect(page.getByText("NRC presence")).toBeVisible();
      await expect.poll(() => lineVisibility(page)).toBe("visible");
      await waitForMapAtRest(page);

      const back = await countriesOnScreen(page);
      const other = back.find((c) => c.iso === second.iso) ?? back[0]!;
      await hover(page, other);
      await expect.poll(() => hoverState(page, other.iso), { message: `hover on ${other.iso} after deselect` }).toBe(true);
      await settle(page);
    }
    // The crash guard fails this test if any step threw in the page.
  });

  test("a theme switch in the country state rebuilds the map and keeps the selection", async ({ page }) => {
    test.setTimeout(120_000);
    await turnOnWorldMap(page);
    await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
    await expect(page.getByText("NRC presence")).toBeVisible({ timeout: 30_000 });
    await waitForMapAtRest(page);

    const [country] = await countriesOnScreen(page);
    expect(country, "an NRC country on screen").toBeTruthy();
    await page.mouse.click(country!.x, country!.y);
    await expect(backToWorld(page)).toBeVisible();
    await waitForMapAtRest(page);
    const markers = page.locator(".mapboxgl-marker");
    await expect(markers.first()).toBeVisible();
    const before = { markers: await markers.count(), zoom: await mapZoom(page) };

    // The app follows the system theme. A new theme loads a new map style,
    // which drops every layer: the mode is removed and added again.
    const lightStyle = await watchStyleLoads(page);
    await page.emulateMedia({ colorScheme: "dark" });
    await expect(page.locator("html")).toHaveAttribute("data-mantine-color-scheme", "dark");
    // Prove the theme reached Mapbox: a new style finished loading, and it is
    // a different style. Without this the checks below pass on the old map.
    await expect.poll(() => styleLoads(page), { message: "Mapbox loaded a new style", timeout: 30_000 }).toBeGreaterThan(0);
    expect(await styleId(page), "the dark style differs from the light one").not.toBe(lightStyle);
    await waitForMapAtRest(page);
    await settle(page);

    // Same country, same office markers, and the camera did not move.
    await expect(backToWorld(page)).toBeVisible();
    await expect.poll(() => lineVisibility(page)).toBe("none");
    await expect(markers).toHaveCount(before.markers);
    expect(Math.abs((await mapZoom(page)) - before.zoom)).toBeLessThan(0.01);

    // The rebuilt mode still works: back to the world view, and hover.
    await backToWorld(page).click();
    await expect(page.getByText("NRC presence")).toBeVisible();
    await expect.poll(() => lineVisibility(page)).toBe("visible");
    await waitForMapAtRest(page);
    const [again] = await countriesOnScreen(page);
    await hover(page, again!);
    await expect.poll(() => hoverState(page, again!.iso), { message: `hover on ${again!.iso} after the rebuild` }).toBe(true);
    await settle(page);
  });
});
