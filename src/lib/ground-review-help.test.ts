import { describe, expect, it } from "vitest";
import {
  activeReviewHelp,
  clearedReviewHelp,
  reviewHelpMessageKey,
} from "./ground-review-help";

// Show/hide + key-selection logic for the review-action help panel in
// the ground thread drawer. Synthetic states only — no DOM involved.

describe("activeReviewHelp", () => {
  it("shows nothing when nothing is hovered or focused", () => {
    expect(activeReviewHelp(null, null)).toBeNull();
  });

  it("shows the hovered action", () => {
    expect(activeReviewHelp("approve_private", null)).toBe("approve_private");
  });

  it("treats keyboard focus as hover (accessibility)", () => {
    expect(activeReviewHelp(null, "reject")).toBe("reject");
  });

  it("lets pointer hover win over keyboard focus", () => {
    expect(activeReviewHelp("approve_public", "reject")).toBe("approve_public");
  });
});

describe("clearedReviewHelp", () => {
  it("clears the help it owns", () => {
    expect(clearedReviewHelp("approve_private", "approve_private")).toBeNull();
  });

  it("never clobbers a newer target with a stale leave", () => {
    // Left approve_private after approve_public already took over.
    expect(clearedReviewHelp("approve_public", "approve_private")).toBe(
      "approve_public",
    );
  });

  it("is a no-op when nothing is shown", () => {
    expect(clearedReviewHelp(null, "reject")).toBeNull();
  });
});

describe("reviewHelpMessageKey", () => {
  it("maps every decision to its message leaf", () => {
    expect(reviewHelpMessageKey("approve_private")).toBe("approvePrivate");
    expect(reviewHelpMessageKey("approve_public")).toBe("approvePublic");
    expect(reviewHelpMessageKey("reject")).toBe("reject");
  });
});
