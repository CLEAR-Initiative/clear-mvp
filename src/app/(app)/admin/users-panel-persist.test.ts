/**
 * Contract tests so the Users tab cannot silently fake-persist again.
 *
 * The original bug: `handleConfirm` patched React state and never called
 * GraphQL. Refresh restored the DB role. These assertions fail if the
 * persist wiring is deleted while the dropdown UI remains.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { APPROVE_USER, UPDATE_USER_ROLE } from "~/server/api/routers/auth";

const here = dirname(fileURLToPath(import.meta.url));
const page = readFileSync(join(here, "page.tsx"), "utf8");

describe("Users tab persist wiring", () => {
  it("sends updateUserRole through GraphQL, not only setLocalUsers", () => {
    expect(UPDATE_USER_ROLE).toMatch(/mutation UpdateUserRole/);
    expect(UPDATE_USER_ROLE).toMatch(/updateUserRole\(userId: \$userId, role: \$role\)/);
    expect(page).toMatch(/api\.auth\.updateUserRole\.useMutation/);
    expect(page).toMatch(/updateUserRole\.mutate/);
  });

  it("approves pending users through approveUser", () => {
    expect(APPROVE_USER).toMatch(/mutation ApproveUser/);
    expect(page).toMatch(/api\.auth\.approveUser\.useMutation/);
    expect(page).toMatch(/approveUser\.mutate/);
  });

  it("treats pending as role === pending, not isActive === false", () => {
    expect(page).toMatch(/u\.role === "pending"/);
    expect(page).toMatch(/user\.role === "pending"/);
  });

  it("does not fake-delete users while no deleteUser mutation exists", () => {
    expect(page).not.toMatch(/handleDelete/);
    expect(page).toMatch(/deleteUnavailable/);
  });
});
