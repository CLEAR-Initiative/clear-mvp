import { describe, expect, it } from "vitest";
import { canReviewCaseProposals, inboxAccess } from "./inbox-access";

describe("inboxAccess", () => {
  it.each([
    ["admin with both flags", "admin", true, true, { hotline: true, proposals: true, requests: false, any: true }],
    ["admin, review off", "admin", true, false, { hotline: true, proposals: false, requests: false, any: true }],
    ["admin, hotline off", "admin", false, true, { hotline: false, proposals: true, requests: false, any: true }],
    ["analyst with both flags", "analyst", true, true, { hotline: false, proposals: true, requests: false, any: true }],
    ["analyst, review off", "analyst", true, false, { hotline: false, proposals: false, requests: false, any: false }],
    ["viewer with both flags", "viewer", true, true, { hotline: false, proposals: false, requests: false, any: false }],
    ["no role", undefined, true, true, { hotline: false, proposals: false, requests: false, any: false }],
  ])("%s (event_enrichment off)", (_label, role, hotlineInbox, impactPriorReview, expected) => {
    expect(inboxAccess({ role, hotlineInbox, impactPriorReview, eventEnrichment: false })).toEqual(expected);
  });

  describe("My requests: any content reader with event_enrichment on", () => {
    it.each([
      ["admin", "admin", true],
      ["analyst", "analyst", true],
      ["viewer", "viewer", true],
      ["a pending signup", "pending", false],
      ["the worker role", "worker", false],
      ["no role", undefined, false],
    ])("%s → %s", (_label, role, expected) => {
      const access = inboxAccess({ role, hotlineInbox: false, impactPriorReview: false, eventEnrichment: true });
      expect(access.requests).toBe(expected);
      // The page and the nav entry show for whoever has requests to see.
      expect(access.any).toBe(expected);
    });

    it("is off for everyone while event_enrichment is off", () => {
      expect(inboxAccess({ role: "viewer", hotlineInbox: true, impactPriorReview: true, eventEnrichment: false }).requests).toBe(false);
    });
  });
});

describe("canReviewCaseProposals", () => {
  it.each([
    ["admin", true, true],
    ["analyst", true, true],
    ["analyst", false, false],
    ["viewer", true, false],
    ["pending", true, false],
    [undefined, true, false],
  ])("%s with review %s → %s", (role, impactPriorReview, expected) => {
    expect(canReviewCaseProposals({ role, impactPriorReview })).toBe(expected);
  });
});
