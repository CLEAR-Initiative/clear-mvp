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
    const sectorId = SECTOR_ID[key];
    const sector = sectorId === "food_security" ? food : byId.get(sectorId);
    return {
      key,
      sectorId,
      label: sector?.name ?? FIXED_LABEL[key],
      severity: sector?.severity ?? null,
      pin: stockPin(figures, sectorId),
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
    }));
  // A fixed row with no grade and no figure is an empty cell, not a sector of this analysis.
  return [...fixed, ...extra].filter((row) => row.severity != null || row.pin != null);
}
