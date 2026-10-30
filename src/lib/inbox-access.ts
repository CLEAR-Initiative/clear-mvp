import { canDecideCaseProposals, isPlatformAdmin, isTeamAdmin } from "~/lib/roles";
import { canDecideLocationChallenges } from "~/lib/location-challenge";

/**
 * Who sees the Inbox, and which of its tabs (one rule for the page gate and
 * the nav entry, so the door and the room agree):
 *
 *   community signals - hotline threads: platform admins, team admins and
 *                       emergency_response_managers, with `hotline_inbox` on
 *                       (Phase 2 scopes an ERM to the numbers their team
 *                       subscribes to)
 *   proposed signals  - deciders only (admins, team admins and team
 *                       analysts), with `impact_prior_review` on: the web
 *                       Worker's cases (clear-api CaseProposals), decided one
 *                       by one. ERMs do NOT see or decide case proposals -
 *                       they work the community signals only.
 *   location challenges - platform admins and team admins: analysts'
 *                       Location challenges on Signals, filed for a team the
 *                       reader administers (their own too), each accepted,
 *                       corrected or declined.
 *
 * UI-only: clear-api's ground, caseProposals and Location challenge guards
 * are the enforcement.
 */
export interface InboxAccess {
  hotline: boolean;
  proposals: boolean;
  locations: boolean;
  /** Any tab at all: the page and the nav entry show. */
  any: boolean;
}

/**
 * Whether this reader decides proposed signals in the UI: a decider - admin,
 * team admin or team analyst - with `impact_prior_review` on. The one rule for
 * every door: the Inbox's proposed signals, the nav badge, the Event page's
 * decision controls. Team roles live in `teamMemberships`, so pass them. ERMs
 * do NOT decide case proposals - clear-api's `requireCaseProposalInboxAccess`
 * admits only admins (unscoped) and team analysts / team admins
 * (team-scoped).
 */
export function canReviewCaseProposals(input: {
  role: string | null | undefined;
  teamMemberships?: { role: string }[] | null;
  impactPriorReview: boolean;
}): boolean {
  return input.impactPriorReview && canDecideCaseProposals(input.role, input.teamMemberships);
}

export function inboxAccess(input: {
  role: string | null | undefined;
  /** The caller's team memberships - team analysts and team admins decide
   * proposed signals; team admins also work the community signals. */
  teamMemberships?: { role: string }[] | null;
  /** True when the caller is an emergency_response_manager on any team. */
  isErm?: boolean;
  hotlineInbox: boolean;
  impactPriorReview: boolean;
}): InboxAccess {
  const hotline =
    input.hotlineInbox &&
    (isPlatformAdmin(input.role) || !!input.isErm || isTeamAdmin(input.teamMemberships));
  const proposals = canReviewCaseProposals(input);
  const locations = canDecideLocationChallenges(input.role, input.teamMemberships);
  return { hotline, proposals, locations, any: hotline || proposals || locations };
}
