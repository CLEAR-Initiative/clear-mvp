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

export function inboxAccess(input: {
  role: string | null | undefined;
  hotlineInbox: boolean;
  impactPriorReview: boolean;
}): InboxAccess {
  const hotline = input.hotlineInbox && isPlatformAdmin(input.role);
  const priors = input.impactPriorReview && canDecideImpactPriors(input.role);
  return { hotline, priors, any: hotline || priors };
}
