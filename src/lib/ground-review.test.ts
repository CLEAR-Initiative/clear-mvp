import { describe, expect, it } from "vitest";
import { allowedReviewDecisions, canReviewSource } from "./ground-review";

// Client-side mirror of clear-api's V1 ground review policy. The backend
// is authoritative; these tests pin the UI's gating table to it.

describe("allowedReviewDecisions", () => {
  it("allows every decision from unverified", () => {
    expect(allowedReviewDecisions("unverified")).toEqual([
      "approve_private",
      "approve_public",
      "reject",
    ]);
  });

  it("allows escalate or reject from approved_private", () => {
    expect(allowedReviewDecisions("approved_private")).toEqual([
      "approve_public",
      "reject",
    ]);
  });

  it("makes rejection reversible", () => {
    expect(allowedReviewDecisions("rejected")).toEqual([
      "approve_private",
      "approve_public",
    ]);
  });

  it("treats approved_public as terminal (promotion has fired)", () => {
    expect(allowedReviewDecisions("approved_public")).toEqual([]);
  });

  it("allows nothing for unknown states", () => {
    expect(allowedReviewDecisions("bogus")).toEqual([]);
  });
});

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
});
