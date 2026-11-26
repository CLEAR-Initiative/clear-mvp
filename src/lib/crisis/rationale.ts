/**
 * The rationale clear-api requires to create a crisis or add an event to one
 * (clear-api ADR-0024). It is kept in the decision log with who decided and
 * when, so it should say why, not what.
 */
export const CRISIS_RATIONALE_MAX = 4000;

/** True when the text, trimmed, is a rationale clear-api accepts. */
export function isValidCrisisRationale(text: string): boolean {
  const trimmed = text.trim();
  return trimmed.length > 0 && trimmed.length <= CRISIS_RATIONALE_MAX;
}
