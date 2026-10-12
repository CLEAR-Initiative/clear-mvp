/**
 * Client-side mirror of clear-api's ground review policy
 * (clear-api src/services/ground-review.ts). The backend remains the
 * authority — these helpers only decide which controls to SHOW, so users
 * never see an action that is guaranteed to fail for them.
 *
 * V1 transition policy:
 *   - unverified        → approve_private | approve_public | reject
 *   - approved_private  → approve_public | reject
 *   - rejected          → approve_private | approve_public
 *   - approved_public   → TERMINAL (promotion into the signals graph fired)
 */

export const GROUND_REVIEW_DECISIONS = [
  "approve_private",
  "approve_public",
  "reject",
] as const;
export type GroundReviewDecision = (typeof GROUND_REVIEW_DECISIONS)[number];

const ALLOWED: Record<string, readonly GroundReviewDecision[]> = {
  unverified: GROUND_REVIEW_DECISIONS,
  approved_private: ["approve_public", "reject"],
  rejected: ["approve_private", "approve_public"],
  approved_public: [],
};

/** Decisions available from a review state. Unknown states allow nothing. */
export function allowedReviewDecisions(reviewState: string): readonly GroundReviewDecision[] {
  return ALLOWED[reviewState] ?? [];
}

/**
 * Whether a user may review threads of a source with `reviewerRoles`.
 * Platform admins always pass; an emergency_response_manager may triage any
 * source they can see (Phase 1 — Phase 2 scopes them to their team's
 * subscribed numbers); everyone else needs their global role on the source's
 * policy record. Mirrors clear-api's `reviewGroundThread` gate.
 */
export function canReviewSource(
  role: string | null | undefined,
  reviewerRoles: string[],
  isErm = false,
): boolean {
  if (isErm) return true;
  if (!role) return false;
  if (role === "admin") return true;
  return reviewerRoles.includes(role);
}
