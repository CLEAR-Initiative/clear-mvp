import { describe, expect, it } from "vitest";
import { canEditOrg } from "./can-edit-org";

const members = [
  { role: "org_admin", user: { id: "first-admin" } },
  { role: "member", user: { id: "plain-member" } },
  { role: "org_admin", user: { id: "second-admin" } },
];

describe("canEditOrg", () => {
  it("matches the signed-in user, not the first member in the list", () => {
    expect(canEditOrg({ userRole: "member", userId: "plain-member", members })).toBe(false);
    expect(canEditOrg({ userRole: "member", userId: "second-admin", members })).toBe(true);
  });

  it("refuses a user who is not in the org", () => {
    expect(canEditOrg({ userRole: "member", userId: "outsider", members })).toBe(false);
  });

  it("refuses while the user id or members are unknown", () => {
    expect(canEditOrg({ userRole: "member", userId: undefined, members })).toBe(false);
    expect(canEditOrg({ userRole: "member", userId: "second-admin", members: undefined })).toBe(false);
  });

  it("lets a platform admin edit without being a member", () => {
    expect(canEditOrg({ userRole: "admin", userId: "outsider", members: [] })).toBe(true);
  });
});
