import type { Page } from "@playwright/test";
import { test, expect } from "../support/test";
import { SEEDED_EVENTS } from "../support/data";

/**
 * Case 24 — Briefs. As the seeded admin (the suite's storageState): start a
 * Daily Brief for Sudan, tick an Alert and a Signal from the History list,
 * write a note and see it survive a reload, send a test, then send to a new
 * Recipient list and see the Brief frozen and read-only.
 *
 * The e2e stack has no mail catcher, and its SMTP provider refuses every
 * send, so this asserts what the UI and `briefs.get` show, never delivery:
 * a test send either succeeds or is reported as refused, and the real send
 * reports "Sent to 0, failed 1" while still freezing the Brief.
 *
 * Non-admins are redirected off /brief by the role-access matrix (case 20,
 * `nav-brief`).
 */

type TrpcBrief = {
  status: string;
  items: { kind: string; note: string | null; snapshot: { title: string } }[];
};

async function getBrief(page: Page, id: string): Promise<TrpcBrief> {
  const input = encodeURIComponent(JSON.stringify({ json: { id } }));
  const res = await page.request.get(`/api/trpc/briefs.get?input=${input}`);
  expect(res.ok()).toBe(true);
  const body = (await res.json()) as { result: { data: { json: TrpcBrief } } };
  return body.result.data.json;
}

test.describe("Briefs (case 24)", () => {
  test("an admin composes, saves, tests and sends a Daily Brief", async ({ page }) => {
    test.setTimeout(180_000);

    // ── Start a Daily Brief for Sudan ─────────────────────────────────────
    await page.goto("/brief", { waitUntil: "domcontentloaded" });
    await page.getByTestId("brief-new").click();
    await page.getByTestId("brief-new-daily").click();
    await page.getByTestId("brief-new-country").click();
    await page.getByRole("option", { name: "Sudan", exact: true }).click();
    await page.getByTestId("brief-new-submit").click();
    await page.waitForURL(/\/brief\/[^/?]+$/, { timeout: 30_000 });
    const briefId = new URL(page.url()).pathname.split("/").pop()!;
    await expect(page.getByTestId("brief-title")).toHaveValue("Daily Brief, Sudan");
    await expect(page.getByTestId("brief-counts")).toBeVisible();

    // ── Tick one Alert and one Signal ──────────────────────────────────────
    const picker = page.getByTestId("brief-picker");
    const alertBox = picker.getByRole("checkbox", { name: `Select ${SEEDED_EVENTS.foodSecurity}` });
    await expect(alertBox).toBeVisible({ timeout: 45_000 });
    // The box is controlled by the Brief's cached items, which update a tick
    // after the click: click, then wait for the tick.
    await alertBox.click();
    await expect(alertBox).toBeChecked();

    const signalRow = picker.locator("tbody tr").filter({ has: page.getByText("Signal", { exact: true }) }).first();
    await expect(signalRow).toBeVisible();
    const signalTitle = (await signalRow.locator("td").nth(1).innerText()).trim();
    await signalRow.getByRole("checkbox").click();
    await expect(signalRow.getByRole("checkbox")).toBeChecked();

    const alerts = page.getByTestId("brief-group-alert");
    const signals = page.getByTestId("brief-group-signal");
    await expect(alerts.getByTestId("brief-item-title")).toHaveText([SEEDED_EVENTS.foodSecurity]);
    await expect(signals.getByTestId("brief-item-title")).toHaveCount(1);
    await expect(page.getByTestId("brief-group-event").getByTestId("brief-item")).toHaveCount(0);

    // ── A note and a summary survive a reload ──────────────────────────────
    await alerts.getByTestId("brief-item-note").fill("Watch Tawila markets");
    await page.getByTestId("brief-summary").fill("Quiet day, **two** food items.");
    await expect(page.getByTestId("brief-summary-preview")).toContainText("Quiet day, two food items.");
    await expect(page.getByTestId("brief-save-status")).toHaveAttribute("data-status", "saved", { timeout: 15_000 });

    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("brief-group-alert").getByTestId("brief-item-note")).toHaveValue("Watch Tawila markets", {
      timeout: 30_000,
    });
    await expect(page.getByTestId("brief-summary")).toHaveValue("Quiet day, **two** food items.");
    await expect(page.getByTestId("brief-group-signal").getByTestId("brief-item-title")).toContainText(signalTitle.slice(0, 20));
    await expect(picker.getByRole("checkbox", { name: `Select ${SEEDED_EVENTS.foodSecurity}` })).toBeChecked({ timeout: 45_000 });

    // ── Send a test ────────────────────────────────────────────────────────
    const testSend = page.waitForResponse((r) => r.url().includes("briefs.sendTest"));
    await page.getByTestId("brief-send-test").click();
    expect((await testSend).ok()).toBe(true);
    await expect(
      page.getByText(/Test sent to your email address\.|The email provider refused the test\./),
    ).toBeVisible();
    expect((await getBrief(page, briefId)).status).toBe("draft");

    // ── A Recipient list with one address ──────────────────────────────────
    const listName = `E2E list ${Date.now()}`;
    await page.goto("/brief?lists=1", { waitUntil: "domcontentloaded" });
    const drawer = page.getByTestId("recipient-lists");
    await drawer.getByTestId("recipient-list-name").fill(listName);
    await drawer.getByRole("button", { name: "Create" }).click();
    const list = drawer.locator(`[data-testid="recipient-list"][data-name="${listName}"]`);
    await expect(list).toBeVisible();
    await list.getByTestId("recipient-list-email").fill("e2e-brief@example.org");
    await list.getByRole("button", { name: "Add" }).click();
    await expect(list).toContainText("e2e-brief@example.org");
    await expect(list).toContainText("1 recipient");

    // ── Send, and the Brief is frozen ──────────────────────────────────────
    await page.goto(`/brief/${briefId}`, { waitUntil: "domcontentloaded" });
    await page.getByTestId("brief-send").click();
    await page.getByTestId("brief-send-list").click();
    await page.getByRole("option", { name: `${listName} (1 recipient)` }).click();
    await page.getByTestId("brief-send-next").click();
    await expect(page.getByTestId("brief-send-confirm")).toHaveText(`Send to ${listName} (1 recipient)?`);
    await page.getByTestId("brief-send-submit").click();
    await expect(page.getByTestId("brief-send-result")).toHaveText(/^Sent to \d+, failed \d+\.$/, { timeout: 30_000 });
    await page.getByRole("button", { name: "Done" }).click();

    await expect(page.getByTestId("brief-sent-notice")).toBeVisible();
    await expect(page.getByTestId("brief-status")).toHaveText("Sent");
    await expect(page.getByTestId("brief-send")).toHaveCount(0);
    await expect(page.getByTestId("brief-title")).toHaveCount(0);
    await expect(page.getByTestId("brief-item-note")).toHaveCount(0);
    await expect(page.getByTestId("brief-picker").getByRole("checkbox")).toHaveCount(0);
    await expect(page.getByTestId("brief-group-alert")).toContainText("Watch Tawila markets");

    const sent = await getBrief(page, briefId);
    expect(sent.status).toBe("sent");
    expect(sent.items.map((i) => i.kind).sort()).toEqual(["alert", "signal"]);
    expect(sent.items.find((i) => i.kind === "alert")?.note).toBe("Watch Tawila markets");

    // ── Listed as sent ─────────────────────────────────────────────────────
    await page.goto("/brief", { waitUntil: "domcontentloaded" });
    const row = page.getByTestId("brief-row").filter({ has: page.locator(`a[href="/brief/${briefId}"]`) });
    await expect(row.getByTestId("brief-status")).toHaveText("Sent");
  });
});
