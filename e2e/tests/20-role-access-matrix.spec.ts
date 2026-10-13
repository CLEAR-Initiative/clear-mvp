/**
 * Case 20 — Role-access matrix (data-driven, generated skeleton).
 *
 * Drives e2e/support/role-access/matrix.json: for every (action × persona) the
 * matrix expects, this emits a test asserting the expected access.
 *
 * WHAT RUNS AUTOMATICALLY (green baseline):
 *   • deny-side checks — a surface/control that must be HIDDEN for a role, and
 *     the /admin → /dashboard redirect. Absence is robust regardless of seed data.
 *   • load-time presence — nav links, tabs, and inbox filter pills that render
 *     from access alone (no record needed).
 *
 * WHAT IS SCAFFOLDED AS test.fixme (fill these in):
 *   • anything needing a seeded record ([id] routes), an action invocation
 *     (server 403/200 writes), read-only decision surfaces, own-scoped data,
 *     and selectors the matrix only describes in prose. Each fixme title carries
 *     the id, expected status, selector and source so an agent can implement it.
 *
 * Personas beyond the seeded admin/analyst/viewer (ERM, pending, team/org roles)
 * need credentials via env (see personas.ts); without them those tests SKIP with
 * a reason — never a false pass.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test, expect } from "../support/test";
import type { Page } from "@playwright/test";
import { STATUS, type Persona } from "../support/role-access/personas";
import { contextFor, enableMatrixFlags } from "../support/role-access/auth";

type Case = {
  id: string; area: string; action: string; route: string;
  selectors: string[]; flags: string[]; source: string; note?: string;
  expect?: Record<string, string>;
};
type RoleCase = { id: string; action: string; route: string; source: string; roles: Record<string, string> };
type Matrix = {
  cases: Case[]; roleCases: RoleCase[];
  sharedFlows: { id: string; action: string; route: string; server: string; source: string }[];
  gotchas: { id: string; check: string; source: string }[];
};

// Loaded via fs (not `import ... with {type:'json'}`) for portability across loaders.
const matrix = JSON.parse(
  readFileSync(join(process.cwd(), "e2e/support/role-access/matrix.json"), "utf8"),
) as Matrix;

const CORE: Persona[] = ["admin", "analyst", "viewer", "erm", "pending"];

/** First concrete, static route for a case ("*" → /dashboard; "a|b" → a). */
function routeOf(route: string): { path: string; dynamic: boolean } {
  let r = (route || "*").split("|")[0]!.trim();
  if (r === "*") r = "/dashboard";
  const dynamic = /\[|<|:/.test(r) || r === "settings"; // [id], <reason>, :id, bare "settings"
  return { path: r, dynamic };
}

/** A locator for a matrix selector, or null when it's only prose. */
function resolve(page: Page, sel: string) {
  if (!sel || sel.includes("<")) return null;
  if (/^(a\[|\[|\.|#)/.test(sel)) return page.locator(sel);
  const m = /^(tab|btn|nav|role|text):(.+)$/.exec(sel);
  if (m) {
    const name = new RegExp(m[2]!.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    if (m[1] === "tab") return page.getByRole("tab", { name });
    if (m[1] === "btn") return page.getByRole("button", { name });
    return page.getByRole("link", { name }); // nav/role/text-ish
  }
  if (/^[a-z0-9-]+$/.test(sel)) return page.getByTestId(sel); // data-testid
  return null;
}

/** Selectors that render from access alone (no seeded record / interaction). */
function isLoadTime(sel: string): boolean {
  return (
    sel.startsWith("a[") ||
    /^(tab|nav):/.test(sel) ||
    /-filter-(reports|proposals)$/.test(sel) ||
    sel === "inbox-no-access"
  );
}

function autoRunnable(c: Case, status: string): boolean {
  const spec = STATUS[status];
  if (!spec) return false;
  const { dynamic } = routeOf(c.route);
  if (dynamic) return false;
  if (c.id.startsWith("nav-admin") && spec.kind === "hidden") return true; // redirect check
  const resolvables = (c.selectors || []).filter((s) => !s.includes("<") && resolveKind(s));
  if (!resolvables.length) return false;
  if (spec.kind === "hidden") return true;
  if (spec.kind === "enabled") return resolvables.some(isLoadTime);
  return false; // disabled/readonly/action → fixme in the skeleton
}
function resolveKind(sel: string): boolean {
  return /^(a\[|\[|\.|#|tab:|btn:|nav:|role:|text:)/.test(sel) || /^[a-z0-9-]+$/.test(sel);
}

async function assertCase(page: Page, c: Case, kind: string) {
  const { path } = routeOf(c.route);
  if (c.id.startsWith("nav-admin") && kind === "hidden") {
    await page.goto(path, { waitUntil: "domcontentloaded" });
    await page.waitForURL("**/dashboard", { timeout: 20_000 });
    expect(page.url()).toContain("/dashboard");
    return;
  }
  await page.goto(path, { waitUntil: "domcontentloaded" });
  const locs = (c.selectors || []).map((s) => resolve(page, s)).filter(Boolean);
  if (kind === "hidden") {
    for (const loc of locs) await expect(loc!).toHaveCount(0);
  } else if (kind === "enabled") {
    const lt = (c.selectors || []).find(isLoadTime);
    await expect(resolve(page, lt!)!.first()).toBeVisible();
  }
}

test.describe("Role-access matrix (case 20)", () => {
  test.beforeAll(async () => {
    await enableMatrixFlags();
  });

  for (const persona of CORE) {
    test.describe(persona, () => {
      for (const c of matrix.cases as Case[]) {
        const status = c.expect?.[persona];
        if (!status) continue;
        const spec = STATUS[status];
        const title = `${c.id} → expect ${status} [${spec?.kind}/${spec?.server}] · ${(c.selectors || []).join(", ") || "—"} · ${c.source}`;

        if (!autoRunnable(c, status)) {
          // Scaffold: implement the action/record flow, then assert server=${spec.server}.
          test.fixme(title, async () => {});
          continue;
        }

        test(title, async ({ browser }) => {
          const ctx = await contextFor(browser, persona);
          test.skip(!ctx, `no credentials configured for persona "${persona}" (set E2E_${persona.toUpperCase()}_EMAIL/_PASSWORD)`);
          const page = await ctx!.newPage();
          try {
            await assertCase(page, c, spec.kind);
          } finally {
            await ctx!.close();
          }
        });
      }
    });
  }

  // Team & Org role cases — need seeded team/org users + Settings navigation.
  test.describe("team & org roles", () => {
    for (const rc of matrix.roleCases as RoleCase[]) {
      for (const [role, status] of Object.entries(rc.roles)) {
        test.fixme(
          `${rc.id} · ${role} → expect ${status} [${STATUS[status]?.server}] · ${rc.route} · ${rc.source}`,
          async () => {},
        );
      }
    }
  });

  // Shared token/credential flows — implement against the auth pages.
  test.describe("shared flows", () => {
    for (const s of matrix.sharedFlows as { id: string; action: string; route: string; server: string; source: string }[]) {
      test.fixme(`${s.id} · ${s.action} → ${s.server} · ${s.route} · ${s.source}`, async () => {});
    }
  });

  // Gotchas — explicit regression checks worth their own dedicated tests.
  test.describe("gotchas", () => {
    for (const g of matrix.gotchas as { id: string; check: string; source: string }[]) {
      test.fixme(`${g.id} · ${g.check} · ${g.source}`, async () => {});
    }
  });
});
