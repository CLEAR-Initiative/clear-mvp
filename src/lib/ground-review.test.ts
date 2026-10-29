import { describe, expect, it } from "vitest";
import { canReviewSource } from "./ground-review";

// Client-side mirror of clear-api's V1 ground review policy. The backend
// is authoritative; these tests pin the UI's gating table to it.

describe("canReviewSource", () => {
  const reviewerRoles = ["admin", "analyst"];

  it("always passes platform admins", () => {
    expect(canReviewSource("admin", ["some_other_role"])).toBe(true);
  });

  it("passes roles listed on the source policy record", () => {
    expect(canReviewSource("analyst", reviewerRoles)).toBe(true);
  });

  it("rejects roles not on the policy record", () => {
    expect(canReviewSource("viewer", reviewerRoles)).toBe(false);
    expect(canReviewSource("pending", reviewerRoles)).toBe(false);
  });

  it("rejects missing roles", () => {
    expect(canReviewSource(null, reviewerRoles)).toBe(false);
    expect(canReviewSource(undefined, reviewerRoles)).toBe(false);
    expect(canReviewSource("", reviewerRoles)).toBe(false);
  });

  it("lets an ERM triage any source regardless of its reviewerRoles", () => {
    // An ERM carries the global `viewer` role, which is not on the policy.
    expect(canReviewSource("viewer", ["admin", "analyst"], true)).toBe(true);
    expect(canReviewSource("viewer", [], true)).toBe(true);
  });
});
