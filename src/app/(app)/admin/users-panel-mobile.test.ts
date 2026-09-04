/**
 * Contract: Admin Users is a stacked card list on phones, table on desktop.
 *
 * The original bug: UsersPanel always rendered the six-column <Table>,
 * so phones had to pan sideways to see Role / Email / Org / Team / Status.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const here = dirname(fileURLToPath(import.meta.url));
const page = readFileSync(join(here, "page.tsx"), "utf8");

describe("Users tab mobile card stack", () => {
  it("keeps the six-column table at sm and up", () => {
    expect(page).toMatch(/visibleFrom="sm"/);
    expect(page).toMatch(/data-testid="admin-users-table"/);
    expect(page).toMatch(/\["user", "role", "email", "org", "team", "status"\]/);
  });

  it("renders a full-width half-viewport user card stack below sm", () => {
    expect(page).toMatch(/hiddenFrom="sm"/);
    expect(page).toMatch(/data-testid="admin-users-mobile-list"/);
    expect(page).toMatch(/data-testid="admin-user-card"/);
    expect(page).toMatch(/minHeight:\s*"50dvh"/);
  });

  it("puts the same six fields in tappable inner cards", () => {
    expect(page).toMatch(/function UserFieldCard/);
    expect(page).toMatch(/data-testid="admin-user-field-card"/);
    expect(page).toMatch(/label=\{t\("columns\.user"\)\}/);
    expect(page).toMatch(/label=\{t\("columns\.role"\)\}/);
    expect(page).toMatch(/label=\{t\("columns\.email"\)\}/);
    expect(page).toMatch(/label=\{t\("columns\.org"\)\}/);
    expect(page).toMatch(/label=\{t\("columns\.team"\)\}/);
    expect(page).toMatch(/label=\{t\("columns\.status"\)\}/);
    expect(page).toMatch(/FIELD_CONTROL_SELECTOR/);
  });

  it("still wires role change and activate through the mobile cards", () => {
    expect(page).toMatch(/handleRoleSelect\(user, val\)/);
    expect(page).toMatch(/handleActivate\(user\)/);
    expect(page).toMatch(/onActivate=\{\s*user\.role === "pending"/);
  });
});
