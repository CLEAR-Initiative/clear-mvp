import type { AnalysisFigures } from "~/server/api/mappers/analysis";
import type { SaSector, SaSeverity } from "~/server/api/mappers/situation-analysis";

/** Needs-table row → analysis sector id. Food is the one pair whose ids differ. */
const SECTOR_ID = {
  shelter: "shelter",
  wash: "wash",
  protection: "protection",
  health: "health",
  food: "food_security",
  education: "education",
} as const;

export type AnalysisNeedsKey = keyof typeof SECTOR_ID;

export interface AnalysisNeedsRow {
  /** Needs-table key for the fixed six, or the analysis sector id for any other sector. */
  key: string;
  sectorId: string;
  label: string;
  severity: SaSeverity;
  /** Stock people-in-need figure. Null when the overview payload has no figure for this sector. */
  pin: number | null;
}

const FIXED_LABEL: Record<AnalysisNeedsKey, string> = {
  shelter: "Shelter",
  wash: "WASH",
  protection: "Protection",
  health: "Health",
  food: "Food Security",
  education: "Education",
};

/** Pipeline sector ids that share one stock key. `food` and `food_security` are the same figure. */
const STOCK_KEYS: Record<string, readonly string[]> = {
  food: ["food_security", "food"],
  food_security: ["food_security", "food"],
};

function stockPin(figures: AnalysisFigures | undefined, sectorId: string): number | null {
  const keys = STOCK_KEYS[sectorId] ?? [sectorId];
  for (const key of keys) {
    const hit = figures?.pinBySector.find((row) => row.sector === key);
    if (hit) return hit.figure.value;
  }
  return null;
}

/**
 * Needs rows for an analysis. People in need is the overview stock figure for
 * that sector. Severity is the analysis grade, untouched.
 */
export function analysisNeedsRows(sectors: readonly SaSector[], figures: AnalysisFigures | undefined): AnalysisNeedsRow[] {
  const byId = new Map(sectors.map((sector) => [sector.id, sector]));
  // The pipeline grades "food"; the stock figure is keyed "food_security".
  const food = byId.get("food_security") ?? byId.get("food");
  const fixed = (Object.keys(SECTOR_ID) as AnalysisNeedsKey[]).map((key) => {
    const stockId = SECTOR_ID[key];
    const sector = stockId === "food_security" ? food : byId.get(stockId);
    // Details are looked up by the sector's own id. `food` is not `food_security`.
    const sectorId = sector?.id ?? stockId;
    return {
      key,
      sectorId,
      label: sector?.name ?? FIXED_LABEL[key],
      severity: sector?.severity ?? null,
      pin: stockPin(figures, sectorId),
      present: !!sector,
    };
  });
  const fixedIds = new Set<string>([...Object.values(SECTOR_ID), "food"]);
  const extra = sectors
    .filter((sector) => !fixedIds.has(sector.id))
    .map((sector) => ({
      key: sector.id,
      sectorId: sector.id,
      label: sector.name,
      severity: sector.severity,
      pin: stockPin(figures, sector.id),
      present: true,
    }));
  // A fixed row with no sector behind it is a placeholder. A sector the analysis
  // actually contains stays, including one that has findings but no grade and no figure.
  return [...fixed, ...extra]
    .filter((row) => row.present || row.pin != null)
    .map(({ present: _present, ...row }) => row);
}
