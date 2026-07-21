import type { SaSeverity } from "~/server/api/mappers/situation-analysis";

/**
 * Map a situation-analysis severity onto the key `severityColors` uses.
 *
 * The pipeline's scale (critical / high / medium / low, see the `Severity`
 * Literal in `situation/schemas.py`) is already the app's scale, so this is a
 * pass-through plus the not-assessed case. It exists as a named seam because
 * the two scales are owned by different repos and are only incidentally
 * identical - if the pipeline's taxonomy moves, this is the one place to
 * reconcile it.
 */
export function toAppSeverity(severity: SaSeverity): string {
  return severity ?? "unknown";
}
