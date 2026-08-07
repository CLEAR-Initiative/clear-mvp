import type { GroundReviewDecision } from "./ground-review";

/**
 * Hover/focus → help-panel selection for the ground review actions
 * (ground-thread-drawer.tsx). Pure logic so the drawer wiring stays
 * declarative and the show/hide rules are testable without a DOM.
 *
 * Rules:
 *  - Pointer hover wins over keyboard focus when both are present
 *    (the pointer is the more recent, deliberate signal).
 *  - Keyboard focus alone shows help too — focus is hover for
 *    accessibility.
 *  - A leave/blur only clears the help it still owns: a stale leave
 *    event must never clobber a newer enter (unmounts and programmatic
 *    focus can reorder events, so we don't trust ordering).
 */

/** Which action's help to show, if any. */
export function activeReviewHelp(
  hovered: GroundReviewDecision | null,
  focused: GroundReviewDecision | null,
): GroundReviewDecision | null {
  return hovered ?? focused;
}

/**
 * Result of leaving/blurring `leaving` while `current` is shown.
 * Clears only when the shown help still belongs to the action left.
 */
export function clearedReviewHelp(
  current: GroundReviewDecision | null,
  leaving: GroundReviewDecision,
): GroundReviewDecision | null {
  return current === leaving ? null : current;
}

/** Message leaf under `detection.groundIntel.review.help.*` for a decision. */
export function reviewHelpMessageKey(
  decision: GroundReviewDecision,
): "approvePrivate" | "approvePublic" | "reject" {
  switch (decision) {
    case "approve_private":
      return "approvePrivate";
    case "approve_public":
      return "approvePublic";
    case "reject":
      return "reject";
  }
}
