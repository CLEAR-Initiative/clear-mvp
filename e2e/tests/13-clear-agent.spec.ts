import { test, expect } from "../support/test";
import { ADMIN, BASE_URL } from "../support/data";

/**
 * CLEAR Agent V1: ask from the Agent drawer on the Map, see the Answer with
 * its Source documents, reload, and continue the same Thread on the Agent
 * page with a follow-up answered from the earlier turn.
 *
 * Hermetic: the web container runs the scripted model (CLEAR_AGENT_MODEL=
 * scripted/e2e) against the NRC Find stub, which echoes the question it
 * received — so the follow-up proves the Agent sent NRC Find a standalone
 * question built from the Thread, not the raw follow-up.
 */

test.beforeAll(async ({ playwright }) => {
  // The `agent` flag defaults off. Turn it on as the seeded admin, through
  // the app's own (admin-only) toggle.
  const admin = await playwright.request.newContext({ baseURL: BASE_URL });
  const signIn = await admin.post("/api/auth/sign-in/email", {
    data: { email: ADMIN.email, password: ADMIN.password },
    headers: { Origin: BASE_URL },
  });
  expect(signIn.ok()).toBe(true);
  const toggle = await admin.post("/api/trpc/featureFlags.toggle", {
    data: { json: { key: "agent", enabled: true } },
  });
  expect(toggle.ok()).toBe(true);
  await admin.dispose();
});

test("ask in the Agent drawer, then continue the Thread on the Agent page", async ({ page }) => {
  await page.goto("/map", { waitUntil: "domcontentloaded" });

  await page.getByRole("button", { name: "Open the Agent drawer" }).click();
  const drawer = page.getByRole("dialog");
  await drawer.getByLabel("Message the CLEAR Agent").fill("What limits access in North Darfur?");
  await drawer.getByRole("button", { name: "Send" }).click();

  // The Answer, the tool it ran, and the Source documents it cited.
  await expect(drawer.getByText("Searched NRC documents")).toBeVisible({ timeout: 30_000 });
  await expect(drawer.getByText(/NRC Find received: What limits access in North Darfur\?/)).toBeVisible();
  const sources = drawer.getByTestId("agent-sources");
  await expect(sources.getByText("Sources (2)")).toBeVisible();
  await expect(sources.getByText("E2E North Darfur access report")).toBeVisible();
  await expect(sources.getByText("E2E Protection monitoring brief")).toBeVisible();

  // The Thread is a stored Conversation: after a reload, the Agent page lists
  // it and shows its turns.
  await page.reload();
  await page.goto("/agent", { waitUntil: "domcontentloaded" });
  const history = page.getByRole("navigation", { name: "Your Conversations" });
  // .first(): the most recently active Thread lists first (a CI retry may
  // leave an earlier Thread with the same title).
  await expect(history.getByText("What limits access in North Darfur?").first()).toBeVisible({
    timeout: 20_000,
  });
  await expect(page.getByText(/NRC Find received: What limits access in North Darfur\?/)).toBeVisible();

  // A follow-up reaches NRC Find as a complete question built from the Thread.
  await page.getByLabel("Message the CLEAR Agent").fill("And in Kordofan?");
  await page.getByRole("button", { name: "Send" }).click();
  await expect(
    page.getByText(/NRC Find received: And in Kordofan\? \(following up on: What limits access in North Darfur\?\)/),
  ).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId("agent-sources")).toHaveCount(2);
});
