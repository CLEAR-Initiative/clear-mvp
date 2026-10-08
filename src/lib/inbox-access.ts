import { canDecideCaseProposals, canReadContent, isPlatformAdmin } from "~/lib/roles";

/**
 * Who sees the Inbox, and which of its Review-item kinds (one rule for the
 * page gate and the nav entry, so the door and the room agree):
 *
 *   hotline threads  — platform admins, with `hotline_inbox` on
 *   proposed signals — deciders (admins and analysts), with
 *                      `impact_prior_review` on: the web Worker's cases
 *                      (clear-api CaseProposals), decided one by one
 *   my requests      — any content reader (admin, analyst, viewer), with
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
 * Whether this reader decides proposed signals in the UI: a decider (admin
 * or analyst) with `impact_prior_review` on. The one rule for every door —
 * the Inbox's Review items, the nav badge, the Event page's decision
 * controls.
 */
export function canReviewCaseProposals(input: {
  role: string | null | undefined;
  impactPriorReview: boolean;
}): boolean {
  return input.impactPriorReview && canDecideCaseProposals(input.role);
}

export function inboxAccess(input: {
  role: string | null | undefined;
  hotlineInbox: boolean;
  impactPriorReview: boolean;
  eventEnrichment: boolean;
}): InboxAccess {
  const hotline = input.hotlineInbox && isPlatformAdmin(input.role);
  const proposals = canReviewCaseProposals(input);
  const requests = input.eventEnrichment && canReadContent(input.role);
  return { hotline, proposals, requests, any: hotline || proposals || requests };
}
