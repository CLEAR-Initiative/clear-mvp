import { describe, expect, it } from "vitest";
import type { AnalysisFigures, PinSector } from "~/server/api/mappers/analysis";
import type { SaSector, SaSeverity } from "~/server/api/mappers/situation-analysis";
import { analysisNeedsRows } from "./analysis-needs-rows";

function sector(id: string, severity: SaSeverity, name = id): SaSector {
  return {
    id,
    code: id.slice(0, 2).toUpperCase(),
    name,
    severity,
    impact: [],
    humanitarian: [],
    atRisk: [],
    needs: ["water points"],
    interventions: [],
    coverage: [],
    refs: [],
    lineRefs: {},
    reportCount: 1,
    evidenceScope: "sector",
  };
}

function figures(pin: { sector: PinSector; value: number }[]): AnalysisFigures {
  return {
    idpStock: null,
    refugees: null,
    returneeStock: null,
    overallPin: null,
    pinBySector: pin.map((row) => ({
      sector: row.sector,
      figure: { value: row.value, low: null, high: null, newestAt: null },
    })),
  };
}

describe("analysis needs rows", () => {
  it("shows the overview stock figure on the matching needs row and keeps the analysis severity", () => {
    const rows = analysisNeedsRows([sector("wash", "critical", "WASH")], figures([{ sector: "wash", value: 25_500_000 }]));

    expect(rows.find((row) => row.sectorId === "wash")).toMatchObject({
      pin: 25_500_000,
      severity: "critical",
    });
  });

  it("lists a sector that is in the analysis and outside the six fixed rows", () => {
    const rows = analysisNeedsRows(
      [sector("wash", "critical", "WASH"), sector("nutrition", "high", "Nutrition")],
      figures([{ sector: "wash", value: 25_500_000 }]),
    );

    expect(rows.find((row) => row.sectorId === "nutrition")).toMatchObject({
      label: "Nutrition",
      severity: "high",
    });
  });

  it("shows no number when that sector has no stock figure", () => {
    const rows = analysisNeedsRows([sector("health", "low", "Health")], figures([]));

    expect(rows.find((row) => row.sectorId === "health")).toMatchObject({
      pin: null,
      severity: "low",
    });
  });

  it("omits a fixed sector the analysis did not grade and has no figure for", () => {
    const rows = analysisNeedsRows([sector("wash", "high", "WASH")], figures([]));

    expect(rows.map((row) => row.sectorId)).toEqual(["wash"]);
  });

  it("puts the food-security stock on a sector graded as food", () => {
    const rows = analysisNeedsRows([sector("food", "critical", "Food")], figures([{ sector: "food_security", value: 8_600_000 }]));

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ key: "food", label: "Food", severity: "critical", pin: 8_600_000 });
  });

  it("shows an agriculture stock figure on the agriculture row", () => {
    const rows = analysisNeedsRows(
      [sector("agriculture", "critical", "Agriculture")],
      figures([{ sector: "agriculture", value: 3_100_000 }]),
    );

    expect(rows.find((row) => row.sectorId === "agriculture")).toMatchObject({
      severity: "critical",
      pin: 3_100_000,
    });
  });

  it("puts the food security stock figure on the food row", () => {
    const rows = analysisNeedsRows(
      [sector("food_security", "high", "Food Security")],
      figures([{ sector: "food_security", value: 4_200_000 }]),
    );

    expect(rows.find((row) => row.key === "food")).toMatchObject({
      sectorId: "food_security",
      pin: 4_200_000,
      severity: "high",
    });
  });
});
