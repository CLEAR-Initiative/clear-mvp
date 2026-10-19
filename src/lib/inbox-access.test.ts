import { describe, expect, it } from "vitest";
import { canReviewCaseProposals, inboxAccess } from "./inbox-access";

const analystTeam = [{ role: "analyst" }];
const ermTeam = [{ role: "emergency_response_manager" }];

describe("inboxAccess", () => {
  it.each([
    ["admin with both flags", "admin", undefined, true, true, { hotline: true, proposals: true, requests: false, any: true }],
    ["admin, review off", "admin", undefined, true, false, { hotline: true, proposals: false, requests: false, any: true }],
    ["admin, hotline off", "admin", undefined, false, true, { hotline: false, proposals: true, requests: false, any: true }],
    ["team analyst with both flags", "member", analystTeam, true, true, { hotline: false, proposals: true, requests: false, any: true }],
    ["team analyst, review off", "member", analystTeam, true, false, { hotline: false, proposals: false, requests: false, any: false }],
    ["member with both flags", "member", undefined, true, true, { hotline: false, proposals: false, requests: false, any: false }],
    ["no role", undefined, undefined, true, true, { hotline: false, proposals: false, requests: false, any: false }],
  ])("%s (event_enrichment off)", (_label, role, teamMemberships, hotlineInbox, impactPriorReview, expected) => {
    expect(inboxAccess({ role, teamMemberships, hotlineInbox, impactPriorReview, eventEnrichment: false })).toEqual(expected);
  });

  describe("ERM: an emergency_response_manager (global member) sees the whole inbox", () => {
    it("gets the hotline when the flag is on", () => {
      const access = inboxAccess({
        role: "member",
        isErm: true,
        hotlineInbox: true,
        impactPriorReview: false,
        eventEnrichment: false,
      });
      expect(access).toEqual({ hotline: true, proposals: false, requests: false, any: true });
    });

    it("still does NOT get case proposals even with impact_prior_review on (ERMs don't decide proposals)", () => {
      const access = inboxAccess({
        role: "member",
        isErm: true,
        hotlineInbox: true,
        impactPriorReview: true,
        eventEnrichment: false,
      });
      // clear-api requireCaseProposalInboxAccess admits admin + team analyst only.
      expect(access).toEqual({ hotline: true, proposals: false, requests: false, any: true });
    });

    it("gets nothing when the hotline flag is off", () => {
      const access = inboxAccess({
        role: "member",
        isErm: true,
        hotlineInbox: false,
        impactPriorReview: false,
        eventEnrichment: false,
      });
      expect(access.hotline).toBe(false);
      expect(access.any).toBe(false);
    });

    it("does not grant the hotline to a plain member who is not an ERM", () => {
      const access = inboxAccess({
        role: "member",
        isErm: false,
        hotlineInbox: true,
        impactPriorReview: false,
        eventEnrichment: false,
      });
      expect(access.hotline).toBe(false);
    });
  });

  describe("My requests: any content reader with event_enrichment on", () => {
    it.each([
      ["admin", "admin", true],
      ["member", "member", true],
      ["a (now team) analyst global role", "analyst", false],
      ["a legacy viewer", "viewer", false],
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
      expect(inboxAccess({ role: "member", hotlineInbox: true, impactPriorReview: true, eventEnrichment: false }).requests).toBe(false);
    });
  });
});

describe("canReviewCaseProposals", () => {
  it("admits an admin when impact_prior_review is on", () => {
    expect(canReviewCaseProposals({ role: "admin", impactPriorReview: true })).toBe(true);
    expect(canReviewCaseProposals({ role: "admin", impactPriorReview: false })).toBe(false);
  });

  it("admits a team analyst when impact_prior_review is on", () => {
    expect(canReviewCaseProposals({ role: "member", teamMemberships: analystTeam, impactPriorReview: true })).toBe(true);
    expect(canReviewCaseProposals({ role: "member", teamMemberships: analystTeam, impactPriorReview: false })).toBe(false);
  });

  it("refuses a plain member and an unknown role", () => {
    expect(canReviewCaseProposals({ role: "member", impactPriorReview: true })).toBe(false);
    expect(canReviewCaseProposals({ role: "pending", impactPriorReview: true })).toBe(false);
    expect(canReviewCaseProposals({ role: undefined, impactPriorReview: true })).toBe(false);
  });

  it("does NOT admit an ERM who is not also a team analyst (ERMs don't decide case proposals)", () => {
    // An ERM reaches the Inbox via the hotline door, not the proposals door —
    // clear-api rejects ERM on caseProposals. `isErm` is no longer a factor here.
    expect(canReviewCaseProposals({ role: "member", teamMemberships: ermTeam, impactPriorReview: true })).toBe(false);
  });
});
