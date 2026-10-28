import { describe, expect, it } from "vitest";
import { canReviewCaseProposals, inboxAccess } from "./inbox-access";

const analystTeam = [{ role: "analyst" }];
const ermTeam = [{ role: "emergency_response_manager" }];
const teamAdminTeam = [{ role: "team_admin" }];

describe("inboxAccess", () => {
  it.each([
    ["admin with both flags", "admin", undefined, true, true, { hotline: true, proposals: true, any: true }],
    ["admin, review off", "admin", undefined, true, false, { hotline: true, proposals: false, any: true }],
    ["admin, hotline off", "admin", undefined, false, true, { hotline: false, proposals: true, any: true }],
    ["team analyst with both flags", "member", analystTeam, true, true, { hotline: false, proposals: true, any: true }],
    ["team analyst, review off", "member", analystTeam, true, false, { hotline: false, proposals: false, any: false }],
    ["team admin with both flags", "member", teamAdminTeam, true, true, { hotline: true, proposals: true, any: true }],
    ["team admin, review off", "member", teamAdminTeam, true, false, { hotline: true, proposals: false, any: true }],
    ["team admin, hotline off", "member", teamAdminTeam, false, true, { hotline: false, proposals: true, any: true }],
    ["member with both flags", "member", undefined, true, true, { hotline: false, proposals: false, any: false }],
    ["no role", undefined, undefined, true, true, { hotline: false, proposals: false, any: false }],
  ])("%s", (_label, role, teamMemberships, hotlineInbox, impactPriorReview, expected) => {
    expect(inboxAccess({ role, teamMemberships, hotlineInbox, impactPriorReview })).toEqual(expected);
  });

  describe("ERM: an emergency_response_manager (global member) sees the community signals only", () => {
    it("gets the hotline when the flag is on", () => {
      const access = inboxAccess({
        role: "member",
        isErm: true,
        hotlineInbox: true,
        impactPriorReview: false,
      });
      expect(access).toEqual({ hotline: true, proposals: false, any: true });
    });

    it("still does NOT get case proposals even with impact_prior_review on (ERMs don't decide proposals)", () => {
      const access = inboxAccess({
        role: "member",
        isErm: true,
        hotlineInbox: true,
        impactPriorReview: true,
      });
      // clear-api requireCaseProposalInboxAccess admits admin, team analyst and team admin only.
      expect(access).toEqual({ hotline: true, proposals: false, any: true });
    });

    it("gets nothing when the hotline flag is off", () => {
      const access = inboxAccess({
        role: "member",
        isErm: true,
        hotlineInbox: false,
        impactPriorReview: false,
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
      });
      expect(access.hotline).toBe(false);
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

  it("admits a team admin when impact_prior_review is on", () => {
    expect(canReviewCaseProposals({ role: "member", teamMemberships: teamAdminTeam, impactPriorReview: true })).toBe(true);
    expect(canReviewCaseProposals({ role: "member", teamMemberships: teamAdminTeam, impactPriorReview: false })).toBe(false);
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
