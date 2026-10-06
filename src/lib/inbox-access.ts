import { canDecideImpactPriors, isPlatformAdmin } from "~/lib/roles";

/**
 * Who sees the Inbox, and which of its Review-item kinds (one rule for the
 * page gate and the nav entry, so the door and the room agree):
 *
 *   hotline threads  — platform admins, with `hotline_inbox` on
 *   impact priors    — deciders (admins and analysts), with
 *                      `impact_prior_review` on
 *
 * UI-only: clear-api's ground and impactPriors guards are the enforcement.
 */
export interface InboxAccess {
  hotline: boolean;
  priors: boolean;
  /** Any kind at all: the page and the nav entry show. */
  any: boolean;
}

/**
 * Whether this reader decides proposed ImpactPriors in the UI: a decider
 * (admin or analyst) with `impact_prior_review` on. The one rule for every
 * door — the Inbox's Review items, the nav badge, the Event page's
 * decision controls.
 */
export function canReviewImpactPriors(input: {
  role: string | null | undefined;
  impactPriorReview: boolean;
}): boolean {
  return input.impactPriorReview && canDecideImpactPriors(input.role);
}

export function inboxAccess(input: {
  role: string | null | undefined;
  hotlineInbox: boolean;
  impactPriorReview: boolean;
}): InboxAccess {
  const hotline = input.hotlineInbox && isPlatformAdmin(input.role);
  const priors = canReviewImpactPriors(input);
  return { hotline, priors, any: hotline || priors };
}
