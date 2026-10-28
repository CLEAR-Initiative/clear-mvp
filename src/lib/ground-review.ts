/**
 * Whether a user may review threads of a source with `reviewerRoles`.
 * Platform admins always pass; an emergency_response_manager may triage any
 * source they can see (Phase 1 — Phase 2 scopes them to their team's
 * subscribed numbers); everyone else needs their global role on the source's
 * policy record. Mirrors clear-api's `reviewGroundThread` gate; the backend
 * stays the authority, this only decides which controls to show.
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
