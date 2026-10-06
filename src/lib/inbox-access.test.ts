import { describe, expect, it } from "vitest";
import { canReviewImpactPriors, inboxAccess } from "./inbox-access";

describe("inboxAccess", () => {
  it.each([
    ["admin with both flags", "admin", true, true, { hotline: true, priors: true, any: true }],
    ["admin, review off", "admin", true, false, { hotline: true, priors: false, any: true }],
    ["admin, hotline off", "admin", false, true, { hotline: false, priors: true, any: true }],
    ["analyst with both flags", "analyst", true, true, { hotline: false, priors: true, any: true }],
    ["analyst, review off", "analyst", true, false, { hotline: false, priors: false, any: false }],
    ["viewer with both flags", "viewer", true, true, { hotline: false, priors: false, any: false }],
    ["no role", undefined, true, true, { hotline: false, priors: false, any: false }],
  ])("%s", (_label, role, hotlineInbox, impactPriorReview, expected) => {
    expect(inboxAccess({ role, hotlineInbox, impactPriorReview })).toEqual(expected);
  });
});

describe("canReviewImpactPriors", () => {
  it.each([
    ["admin", true, true],
    ["analyst", true, true],
    ["analyst", false, false],
    ["viewer", true, false],
    ["pending", true, false],
    [undefined, true, false],
  ])("%s with review %s → %s", (role, impactPriorReview, expected) => {
    expect(canReviewImpactPriors({ role, impactPriorReview })).toBe(expected);
  });
});
