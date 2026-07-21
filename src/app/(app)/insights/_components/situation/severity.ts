import type { SaSeverity } from "~/server/api/mappers/situation-analysis";

/**
 * Map the SAF severity scale onto the app's own scale, which is what
 * `SeverityBadge` and `severityColors` understand.
 *
 * SAF grades critical > severe > serious > moderate; the app carries
 * critical / high / medium / low. Collapsing severe and serious onto high and
 * medium keeps the module inside the app's existing colour language rather
 * than introducing a second palette for one screen.
 */
export function toAppSeverity(severity: SaSeverity): string {
  switch (severity) {
    case "critical":
      return "critical";
    case "severe":
    case "high":
      return "high";
    case "serious":
    case "moderate":
      return "medium";
    case "low":
      return "low";
    default:
      return "unknown";
  }
}
