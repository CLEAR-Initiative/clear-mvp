import type { Locator, Page } from "@playwright/test";
import type { Map as MapboxMap } from "mapbox-gl";
import { SEEDED_EVENTS } from "../support/data";
import { countryIdByName, enableFeatureFlags, eventRows, gotoDetectionEvents } from "../support/helpers";
import { test, expect } from "../support/test";

// These two seeded signals have distinct points in the same part of Sudan.
const flood = "Flood warnings along the Nile in Khartoum";
const bridge = "Bridge damage reported in Omdurman";

// The seeded signals have no severity. Give this page classified signals
// so the default feed includes them, preserving their real IDs and points.
async function openSeededSignals(page: Page, titles: string[]) {
  await page.route("**/api/trpc/**", async route => {
    const names = new URL(route.request().url()).pathname.split("/api/trpc/")[1]?.split(",") ?? [];
    const index = names.indexOf("signals.signalsPage");
    if (index < 0) return route.fallback();
    const response = await route.fetch();
    const body = await response.json();
    const result = Array.isArray(body) ? body[index] : body;
    // Keep the two real neighbours under test, independent of other seeded
    // or newly created signals and their ordering in the shared database.
    const data = result.result.data.json;
    data.items = data.items.filter((signal: { title: string }) => titles.includes(signal.title));
    data.totalCount = data.items.length;
    data.hasMore = false;
    for (const signal of data.items) signal.severity ??= 3;
    await route.fulfill({ response, json: body });
  });
  await page.goto("/detection?tab=signals", { waitUntil: "domcontentloaded" });
  await expect(eventRows(page).filter({ hasText: flood })).toBeVisible();
  await page.waitForFunction(() => {
    const map = window.__clearE2EMap as MapboxMap | undefined;
    return map?.getSource("crisis-markers") && !map.isMoving();
  });
}

async function dragPreview(page: Page, preview: Locator) {
  const card = (await preview.boundingBox())!;
  const area = (await preview.locator("..").boundingBox())!;
  const grip = (await preview.getByTestId("map-marker-panel-grip").boundingBox())!;
  const targetY = card.y - area.y > 70 ? area.y + 12 : area.y + area.height - card.height - 20;
  await page.mouse.move(grip.x + 15, grip.y + 12);
  await page.mouse.down();
  await page.mouse.move(grip.x + 15, targetY + 12, { steps: 8 });
  await page.mouse.up();
  await expect.poll(async () => Math.abs((await preview.boundingBox())!.y - card.y)).toBeGreaterThan(30);
}

async function expectDefaultPlacement(preview: Locator, pin: Locator, width: number) {
  const card = (await preview.boundingBox())!;
  if (width === 1024) {
    const head = (await pin.locator(".marker-pin-head").boundingBox())!;
    const dx = head.x + head.width / 2 - card.x;
    const dy = head.y + head.height / 2 - card.y;
    const clearance = Math.max(-dx, dx - card.width, -dy, dy - card.height);
    expect(clearance).toBeCloseTo(34, 0);
  } else {
    const area = (await preview.locator("..").boundingBox())!;
    expect(area.x + area.width - card.x - card.width).toBeCloseTo(8, 0);
    expect(area.y + area.height - card.y - card.height).toBeCloseTo(8, 0);
  }
}

// Compare the painted SVG to the actual pin head and card edge in screen coordinates.
async function expectConnector(pin: Locator) {
  await expect.poll(() => pin.evaluate(element => {
    const head = element.querySelector(".marker-pin-head")!.getBoundingClientRect();
    const card = document.querySelector('[data-testid="detection-marker-preview"]')?.getBoundingClientRect();
    const line = document.querySelector<SVGLineElement>("[data-map-overlay-host] svg line");
    if (!card || !line) return Infinity;
    const svg = line.ownerSVGElement!.getBoundingClientRect();
    const pinX = head.left + head.width / 2;
    const pinY = head.top + head.height / 2;
    const edge = pinX < card.left + card.width / 2 ? card.left : card.right;
    return Math.max(
      Math.abs(svg.left + line.x1.baseVal.value - pinX), Math.abs(svg.top + line.y1.baseVal.value - pinY),
      Math.abs(svg.left + line.x2.baseVal.value - edge), Math.abs(svg.top + line.y2.baseVal.value - (card.top + card.height / 2)),
    );
  }), { message: "connector joins the selected pin head and facing card edge" }).toBeLessThan(2);
}

test.use({
  launchOptions: { args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] },
});

test.beforeAll(async ({ playwright }) => {
  await enableFeatureFlags(playwright, ["agent"]);
});

test("selecting an offscreen signal from the feed or preview arrows frames both locations and restores the zoom", async ({ page }) => {
  test.skip(process.env.E2E_REAL_MAP !== "1", "requires the real Mapbox canvas in the E2E image");
  const nyala = "IDP camp overcrowding reported in Nyala";
  await openSeededSignals(page, [nyala, flood]);
  const locations: Record<string, [number, number]> = { [nyala]: [24.88, 12.05], [flood]: [32.56, 15.59] };
  const zoom = 11;
  await page.evaluate(({ origin, zoom }) => {
    (window.__clearE2EMap as MapboxMap).jumpTo({ center: origin, zoom });
  }, { origin: locations[nyala]!, zoom });
  const oldRow = eventRows(page).filter({ hasText: nyala });
  await oldRow.click();
  await expect(oldRow).toHaveAttribute("aria-pressed", "true");

  const preview = page.getByTestId("detection-marker-preview");
  async function follow(from: string, to: string, control: Locator) {
    const target = locations[to]!;
    // Observe real animation frames before clicking. Polling from Playwright can
    // miss the intermediate view when a busy runner draws only a few frames.
    const flight = await page.evaluateHandle(({ origin, target }) => {
      const map = window.__clearE2EMap as MapboxMap;
      const seen = { startedOffscreen: !map.getBounds()!.contains(target), framedBoth: false, starts: 0, ends: 0 };
      map.on("movestart", () => { seen.starts++; });
      map.on("moveend", () => { seen.ends++; });
      const sample = () => {
        const bounds = map.getBounds()!;
        if (bounds.contains(origin) && bounds.contains(target)) {
          seen.framedBoth = true;
          map.off("move", sample);
        }
      };
      map.on("move", sample);
      return seen;
    }, { origin: locations[from]!, target });
    expect(await flight.evaluate(seen => seen.startedOffscreen)).toBe(true);
    await control.click();
    await expect(preview).toContainText(to);
    await expect.poll(() => flight.evaluate(seen => seen.framedBoth), {
      message: "the flight shows the previous and selected locations together",
    }).toBe(true);
    await expect.poll(() => page.evaluate(() => {
      const map = window.__clearE2EMap as MapboxMap;
      if (map.isMoving()) return null;
      return [...map.getCenter().toArray(), map.getZoom()];
    })).toEqual([expect.closeTo(target[0], 4), expect.closeTo(target[1], 4), expect.closeTo(zoom, 4)]);
    expect(await flight.evaluate(({ starts, ends }) => [starts, ends])).toEqual([1, 1]);
    await expectConnector(page.locator(".mapboxgl-map").getByRole("button", { name: to, exact: true }));
  }

  await follow(nyala, flood, eventRows(page).filter({ hasText: flood }));
  const previous = preview.getByRole("button", { name: "Previous signal" });
  const next = preview.getByRole("button", { name: "Next signal" });
  const [outbound, inbound] = await previous.isEnabled() ? [previous, next] : [next, previous];
  await follow(flood, nyala, outbound);
  await follow(nyala, flood, inbound);
});

for (const width of [790, 820]) {
  test.describe(`Detection keyboard and feed at ${width} × 900`, () => {
    test.use({ viewport: { width, height: 900 } });

    test("opens a readable preview from the keyboard and keeps the filtered URL", async ({ page }) => {
      const country = await countryIdByName(page, "Sudan");
      await page.goto(`/detection?tab=events&c=${country}`, { waitUntil: "domcontentloaded" });
      const row = eventRows(page).filter({ hasText: SEEDED_EVENTS.khartoumFlood });
      await expect(row).toBeVisible();
      const detectionUrl = page.url();
      await row.press("Enter");
      const preview = page.getByTestId("detection-marker-preview");
      await expect(preview).toBeFocused();
      await expect(page).toHaveURL(detectionUrl);
      await expect(row).toHaveAttribute("aria-pressed", "true");
      expect((await preview.boundingBox())!.width).toBeGreaterThan(220);
      await row.click({ trial: true });
      await preview.getByRole("button", { name: "Close", exact: true }).click({ trial: true });
      const details = preview.getByRole("link", { name: /view details/i });
      await expect(details).toHaveAttribute("href", /\/event\//);
      await details.click({ trial: true });
      await preview.press("Escape");
      await expect(preview).toBeHidden();
      await expect(row).toBeFocused();
      await page.getByRole("button", { name: "Hide list" }).click();
      await page.getByRole("button", { name: "Show list" }).click();
      await row.click({ trial: true });

      if (process.env.E2E_REAL_MAP !== "1") return;
      // Isolate a single pin from nearby clusters so it can receive keyboard input.
      await page.getByPlaceholder("Search or filter…").fill(SEEDED_EVENTS.khartoumFlood);
      const pin = page.locator(".mapboxgl-map").getByRole("button", { name: SEEDED_EVENTS.khartoumFlood, exact: true });
      await pin.press("Enter");
      await expect(preview).toBeFocused();
      await preview.press("Escape");
      await expect(pin).toBeFocused();
      await pin.press("Enter");
      const canvas = page.locator("canvas.mapboxgl-canvas");
      const longitude = () => page.evaluate(() => (window.__clearE2EMap as MapboxMap).getCenter().lng);
      const before = await longitude();
      await canvas.press("ArrowRight");
      await expect.poll(longitude).not.toBe(before);
      await expect(preview).toContainText(SEEDED_EVENTS.khartoumFlood);
      await expect(row).toHaveAttribute("aria-pressed", "true");
    });
  });
}

for (const [width, height] of [[1024, 768], [1366, 768], [1440, 900]] as const) {
  test.describe(`Detection map preview at ${width} × ${height}`, () => {
    test.use({ viewport: { width, height } });

    test("an event opens a movable preview and the map controls remain usable", async ({ page }) => {
      await gotoDetectionEvents(page);
      const row = eventRows(page).filter({ hasText: SEEDED_EVENTS.khartoumFlood });
      await row.click();
      const preview = page.getByTestId("detection-marker-preview");
      await expect(preview).toContainText(SEEDED_EVENTS.khartoumFlood);
      await expect(row).toHaveAttribute("aria-pressed", "true");
      const fullDetails = preview.getByRole("link", { name: /view details/i });
      await expect(fullDetails).toHaveAttribute("href", /\/event\//);
      const eventHref = await fullDetails.getAttribute("href");

      await dragPreview(page, preview);

      // A visible control can still be covered by the preview. Exercise it.
      await page.getByRole("button", { name: "Open the Agent drawer" }).click({ trial: true });
      if (process.env.E2E_REAL_MAP === "1") {
        await page.getByRole("button", { name: "Zoom in", exact: true }).click({ trial: true });
        await page.getByRole("button", { name: "Zoom out", exact: true }).click({ trial: true });
      }
      await page.getByTitle("Show timeline (T)").click();
      await page.getByRole("button", { name: "Hide timeline (T)" }).click();
      await page.getByTestId("map-layers-toggle").click();
      await expect(page.getByText("Boundaries", { exact: true })).toBeVisible();
      await page.getByTestId("map-layers-toggle").click();
      await preview.getByRole("button", { name: "Close", exact: true }).click();
      await expect(preview).toBeHidden();
      await expect(page).toHaveURL(/\/detection/);
      if (process.env.E2E_REAL_MAP === "1") {
        // Search isolates the event from any nearby cluster while preserving the camera.
        await page.getByPlaceholder("Search or filter…").fill(SEEDED_EVENTS.khartoumFlood);
        await page.locator(".mapboxgl-map").getByRole("button", { name: SEEDED_EVENTS.khartoumFlood, exact: true }).click();
        await expect(preview).toContainText(SEEDED_EVENTS.khartoumFlood);
        await expect(row).toHaveAttribute("aria-pressed", "true");
        await preview.getByRole("button", { name: "Close", exact: true }).click();
      }

      // The alert has its own feed ID but shares the event's point and detail page.
      await page.getByRole("tab", { name: /Alerts/ }).click();
      await eventRows(page).filter({ hasText: SEEDED_EVENTS.khartoumFlood }).click();
      await expect(preview).toContainText(SEEDED_EVENTS.khartoumFlood);
      await expect(fullDetails).toHaveAttribute("href", eventHref!);
    });

    test("a dragged signal preview stays put and its connector follows the selected pin", async ({ page }) => {
      test.skip(process.env.E2E_REAL_MAP !== "1", "requires the real Mapbox canvas in the E2E image");
      test.setTimeout(100_000);
      await openSeededSignals(page, [flood, bridge]);
      const floodRow = eventRows(page).filter({ hasText: flood });
      const bridgeRow = eventRows(page).filter({ hasText: bridge });
      // Start close enough to work with individual pins, at a repeatable camera.
      await page.evaluate(() => {
        (window.__clearE2EMap as MapboxMap).jumpTo({ center: [32.52, 15.615], zoom: 9.5 });
      });
      const map = page.locator(".mapboxgl-map");
      const floodPin = map.getByRole("button", { name: flood, exact: true });
      const bridgePin = map.getByRole("button", { name: bridge, exact: true });
      await expect(floodPin).toBeVisible();
      await expect(bridgePin).toBeVisible();
      const camera = () => page.evaluate(() => {
        const map = window.__clearE2EMap as MapboxMap;
        return [map.getZoom(), ...map.getCenter().toArray()];
      });
      const initial = await camera();
      await floodRow.hover();
      await expect(floodPin).toHaveAttribute("data-hovered", "true");
      await bridgePin.hover();
      await expect(bridgeRow).toHaveAttribute("data-hovered", "true");
      await expect(floodPin).not.toHaveAttribute("data-hovered", "true");
      await bridgePin.click();
      const preview = page.getByTestId("detection-marker-preview");
      await expect(preview).toContainText(bridge);
      await expect(bridgeRow).toHaveAttribute("aria-pressed", "true");
      await expect(bridgePin).toHaveAttribute("data-selected", "true");
      await expectConnector(bridgePin);
      await expectDefaultPlacement(preview, bridgePin, width);
      await dragPreview(page, preview);
      const dragged = (await preview.boundingBox())!;
      await expectConnector(bridgePin);
      await floodPin.click();
      await expect(preview).toContainText(flood);
      await expect(floodPin).toHaveAttribute("data-selected", "true");
      await expect(floodRow).toHaveAttribute("aria-pressed", "true");
      await expect(preview.getByRole("link", { name: /view details/i })).toHaveAttribute("href", /\/signal\//);
      expect(await preview.boundingBox()).toMatchObject({ x: dragged.x, y: dragged.y });
      await expectConnector(floodPin);
      const next = preview.getByRole("button", { name: "Next signal" });
      const previous = preview.getByRole("button", { name: "Previous signal" });
      const [forward, back] = await next.isEnabled() ? [next, previous] : [previous, next];
      await forward.click();
      await expect(floodRow).toHaveAttribute("aria-pressed", "false");
      expect(await preview.boundingBox()).toMatchObject({ x: dragged.x, y: dragged.y });
      await back.click();
      await expectConnector(floodPin);
      expect(await camera()).toEqual(initial);

      // Start an actual map drag on exposed canvas alongside the card.
      const canvas = map.locator("canvas.mapboxgl-canvas");
      const box = (await canvas.boundingBox())!;
      const panX = box.x + box.width / 2;
      const panY = dragged.y > box.y + 100 ? box.y + 72 : box.y + box.height - 120;
      await page.mouse.move(panX, panY);
      await page.mouse.down();
      await page.mouse.move(panX + 45, panY, { steps: 8 });
      await page.mouse.up();
      await page.waitForFunction(() => !(window.__clearE2EMap as MapboxMap).isMoving());
      const panned = await camera();
      expect(panned[0]).toBe(initial[0]);
      expect(panned[1]).not.toBe(initial[1]);
      await expectConnector(floodPin);
      expect(await preview.boundingBox()).toMatchObject({ x: dragged.x, y: dragged.y });

      const line = map.locator("[data-map-overlay-host] svg line");
      await page.evaluate(() => {
        (window.__clearE2EMap as MapboxMap).jumpTo({ center: [0, 0] });
      });
      await expect(line).toHaveCount(0);
      await expect(preview).toContainText(flood);
      await page.evaluate(() => {
        (window.__clearE2EMap as MapboxMap).jumpTo({ center: [32.52, 15.615] });
      });
      await expectConnector(floodPin);
      await preview.getByRole("button", { name: "Close", exact: true }).click();
      await expect(line).toHaveCount(0);
      await bridgeRow.click();
      await expect(preview).toContainText(bridge);
      await expectConnector(bridgePin);
      await expectDefaultPlacement(preview, bridgePin, width);
      expect(Math.abs((await preview.boundingBox())!.y - dragged.y)).toBeGreaterThan(30);
      expect(await camera()).toEqual(initial);
    });
  });
}
