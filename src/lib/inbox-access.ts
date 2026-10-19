import { canDecideCaseProposals, canReadContent, isPlatformAdmin } from "~/lib/roles";

/**
 * Who sees the Inbox, and which of its Review-item kinds (one rule for the
 * page gate and the nav entry, so the door and the room agree):
 *
 *   hotline threads  — platform admins and emergency_response_managers,
 *                      with `hotline_inbox` on (Phase 2 scopes an ERM to the
 *                      numbers their team subscribes to)
 *   proposed signals — deciders only (admins and team analysts), with
 *                      `impact_prior_review` on: the web Worker's cases
 *                      (clear-api CaseProposals), decided one by one. ERMs do
 *                      NOT see or decide case proposals — that is the hotline
 *                      door, which they reach via `hotline` above.
 *   my requests      — any content reader (admin or member), with
 *                      `event_enrichment` on: the Tasks they asked for. Not
 *                      a Review item; it only widens who reaches the page.
 *
 * UI-only: clear-api's ground, caseProposals and myTasks guards are the
 * enforcement (myTasks is scoped to the caller there).
 */
export interface InboxAccess {
  hotline: boolean;
  proposals: boolean;
  requests: boolean;
  /** Any kind at all: the page and the nav entry show. */
  any: boolean;
}

/**
 * Whether this reader decides proposed signals in the UI: a decider — admin or
 * a team analyst — with `impact_prior_review` on. The one rule for every door:
 * the Inbox's Review items, the nav badge, the Event page's decision controls.
 * `analyst` is a TEAM role, so pass `teamMemberships`. ERMs do NOT decide case
 * proposals — clear-api's `requireCaseProposalInboxAccess` admits only admins
 * (unscoped) and team analysts (team-scoped); an ERM reaches the Inbox through
 * the hotline door instead.
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
  /** The caller's team memberships — a team analyst decides proposed signals. */
  teamMemberships?: { role: string }[] | null;
  /** True when the caller is an emergency_response_manager on any team. */
  isErm?: boolean;
  hotlineInbox: boolean;
  impactPriorReview: boolean;
  eventEnrichment: boolean;
}): InboxAccess {
  const hotline = input.hotlineInbox && (isPlatformAdmin(input.role) || !!input.isErm);
  const proposals = canReviewCaseProposals(input);
  const requests = input.eventEnrichment && canReadContent(input.role);
  return { hotline, proposals, requests, any: hotline || proposals || requests };
}
