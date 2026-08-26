import type { Page } from "@playwright/test";
import { test, expect } from "../support/test";

/**
 * Case 12 — Observe PWA field-signal pipeline (PR 200 / Expo #399).
 *
 * Online GPS submit lands on the Observe Signals tab. Offline text+GPS
 * queues on the device and drains when the browser is back online.
 * Detection / map pins are covered by the PR's preview checklist; this
 * spec stays on `/observe` so it does not depend on Mapbox pixels.
 */

const KHARTOUM = { latitude: 15.5007, longitude: 32.5599 };
const KHARTOUM_LABEL = "15.5007°N 32.5599°E";

/**
 * `/observe` SSRs with isOnline=true, so "Online" is not proof of hydration.
 * Retry fill until React state has the draft (Send enables) — otherwise a
 * pre-hydrate fill is wiped when the client mounts.
 */
async function composeObservation(page: Page, title: string) {
  const draft = page.getByPlaceholder("What did you observe?");
  await expect(async () => {
    await draft.fill(title);
    await expect(draft).toHaveValue(title);
    await expect(page.getByRole("button", { name: "Send signal" })).toBeEnabled();
  }).toPass({ timeout: 20_000 });
}

async function captureKhartoum(page: Page) {
  const coords = page.getByText(KHARTOUM_LABEL);
  await expect(async () => {
    if (await coords.isVisible()) return;
    await page.getByRole("button", { name: "Capture location" }).click();
    await expect(coords).toBeVisible({ timeout: 8_000 });
  }).toPass({ timeout: 25_000 });
}

/** SuperJSON tRPC payloads nest session fields under `json` / `user`. */
function forceNoTeamSession(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(forceNoTeamSession);
  if (value && typeof value === "object") {
    const rec = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    const isSessionUser = "email" in rec && "role" in rec;
    for (const [key, nested] of Object.entries(rec)) {
      if (key === "defaultTeamId") {
        out[key] = null;
      } else if (key === "role" && isSessionUser) {
        // Analysts/admins may file without a team; pin a non-platform role
        // so this spec still exercises the dedicated missing-team error.
        out[key] = "viewer";
      } else {
        out[key] = forceNoTeamSession(nested);
      }
    }
    return out;
  }
  return value;
}

test.describe("Observe field signals (case 12)", () => {
  test.use({
    geolocation: KHARTOUM,
    permissions: ["geolocation"],
  });

  test("an online GPS signal appears on the Signals tab", async ({ page }) => {
    await page.goto("/observe", { waitUntil: "domcontentloaded" });
    await expect(page.getByText("Field Signals")).toBeVisible();

    const title = `E2E Observe Online ${Date.now()}`;
    await composeObservation(page, title);
    await captureKhartoum(page);

    await page.getByRole("button", { name: "Send signal" }).click();
    await expect(page.getByText("Signal received")).toBeVisible({
      timeout: 20_000,
    });

    await page.getByRole("button", { name: "Signals" }).click();
    await expect(page.getByText(title).first()).toBeVisible({ timeout: 20_000 });
  });

  test("an offline GPS signal drains onto the Signals tab when back online", async ({
    page,
    context,
  }) => {
    await page.goto("/observe", { waitUntil: "domcontentloaded" });
    await expect(page.getByText("Field Signals")).toBeVisible();
    await expect(page.getByRole("status", { name: "Online" })).toBeVisible();

    const title = `E2E Observe Offline ${Date.now()}`;
    await composeObservation(page, title);
    await captureKhartoum(page);

    await context.setOffline(true);
    await expect(page.getByRole("status", { name: "Offline" })).toBeVisible();
    const send = page.getByRole("button", { name: "Send signal" });
    await expect(send).toBeEnabled();
    await send.click();
    await expect(
      page.getByText("Your signal has been saved locally"),
    ).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("1 queued")).toBeVisible();

    await context.setOffline(false);
    await expect(page.getByRole("status", { name: "Online" })).toBeVisible();
    await expect(page.getByText("You're back online")).toBeVisible({
      timeout: 20_000,
    });

    await page.getByRole("button", { name: "Signals" }).click();
    await expect(page.getByText(title).first()).toBeVisible({ timeout: 20_000 });
  });

  test("a missing defaultTeamId shows the dedicated error and does not queue", async ({
    page,
  }) => {
    await page.route("**/api/trpc/**", async (route) => {
      const url = route.request().url();
      const post = route.request().postData() ?? "";
      if (!url.includes("auth.me") && !post.includes("auth.me")) {
        await route.continue();
        return;
      }
      const response = await route.fetch();
      const json = forceNoTeamSession(await response.json());
      await route.fulfill({
        status: response.status(),
        headers: { ...response.headers(), "content-type": "application/json" },
        json,
      });
    });

    await page.goto("/observe?noTeam=1", { waitUntil: "domcontentloaded" });
    await expect(page.getByText("Field Signals")).toBeVisible();

    const title = `E2E Observe NoTeam ${Date.now()}`;
    await composeObservation(page, title);
    const send = page.getByRole("button", { name: "Send signal" });
    await send.click();

    await expect(page.getByText("This account has no default team")).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByText("queued")).toHaveCount(0);
  });
});
