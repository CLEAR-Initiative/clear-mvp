import type { SaSeverity } from "~/server/api/fixtures/situation-analysis";

const LABELS: Record<NonNullable<SaSeverity>, string> = {
  critical: "CRIT",
  severe: "SEV",
  serious: "SER",
};

/** Compact severity badge for the sectors list. `null` → neutral dash. */
export function SevBadge({ level }: { level: SaSeverity }) {
  if (!level) return <span className="sevb none">—</span>;
  return <span className={`sevb ${level}`}>{LABELS[level]}</span>;
}
