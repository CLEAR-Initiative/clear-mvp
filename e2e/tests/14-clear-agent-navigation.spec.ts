import { test, expect } from "../support/test";
import { SEEDED_EVENTS } from "../support/data";
import { enableFeatureFlags, gotoEventByTitle } from "../support/helpers";

/**
 * CLEAR Agent V2: on an Event page, ask to see it on the map. The Agent
 * navigates to the Map (announced in the Thread, with Back), and Back lands
 * on the Event page exactly.
 *
 * Hermetic: the scripted model (CLEAR_AGENT_MODEL=scripted/e2e) navigates
 * when asked for something "on the map", and its reply names the entity in
 * the turn's Current view — so the spec also proves the Event page's Current
 * view reached the Agent.
 */

test.beforeAll(async ({ playwright }) => {
  // V2 sits behind agent_clear_data, on top of agent; both default off.
  await enableFeatureFlags(playwright, ["agent", "agent_clear_data"]);
});

test("Agent navigation from an Event to the Map, then Back", async ({ page }) => {
  await gotoEventByTitle(page, SEEDED_EVENTS.khartoumFlood);
  const eventUrl = page.url();
  const eventId = new URL(eventUrl).pathname.split("/").pop()!;

  await page.getByRole("button", { name: "Open the Agent drawer" }).click();
  const drawer = page.getByRole("dialog");
  await drawer.getByLabel("Message the CLEAR Agent").fill("Show it on the map");
  await drawer.getByRole("button", { name: "Send" }).click();

  // The move happens, and is announced where it happened in the Thread.
  await page.waitForURL(/\/map\?country=Sudan/, { timeout: 30_000 });
  const notice = drawer.getByTestId("agent-navigation");
  await expect(notice).toHaveText(/Moved you to the Map: Sudan/);
  // The turn carried the Event page's Current view.
  await expect(drawer.getByText(`You were viewing event ${eventId}.`)).toBeVisible();

  // Back restores the exact previous view.
  await notice.getByRole("button", { name: "Back" }).click();
  await page.waitForURL(eventUrl);
  expect(page.url()).toBe(eventUrl);
  await expect(page.getByText(SEEDED_EVENTS.khartoumFlood).first()).toBeVisible();
  await expect(notice.getByRole("button", { name: "Back" })).toHaveCount(0);
});
