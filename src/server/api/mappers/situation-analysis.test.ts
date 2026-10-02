import { describe, it, expect } from "vitest";
import {
  fillMissingKeyFigures,
  mapSituationAnalysis,
  needsYearlyFill,
  type SaRow,
} from "./situation-analysis";

function row(datapoints: SaRow["data"]["datapoints"]): SaRow {
  return {
    id: "sa-1",
    countryLocationId: "loc-1",
    windowStart: "2026-08-01T00:00:00.000Z",
    windowEnd: "2026-08-31T23:59:59.000Z",
    data: { datapoints },
    sourceReportIds: [],
    generatedByModel: "test",
    generatedAt: "2026-09-01T00:00:00.000Z",
    schemaVersion: "v1",
  };
}

describe("mapSituationAnalysis displaced KPI", () => {
  it("reads estimated_current_displacement.stock when present", () => {
    const mapped = mapSituationAnalysis(
      row({
        estimated_current_displacement: {
          t0: "2026-08-23T00:00:00.000Z",
          stock: 8_622_801,
          total: 8_622_801,
          flow_count: 0,
          flows_since: 0,
        },
      }),
      "Sudan",
    );

    expect(mapped.figures.displaced).toBe(8_622_801);
    expect(mapped.stats.find((s) => s.key === "displaced")).toEqual({
      key: "displaced",
      value: "8.6M",
      range: null,
      confidence: null,
      periodYear: null,
    });
  });

  it("falls back to estimated_current_displacement.total when stock is absent", () => {
    const mapped = mapSituationAnalysis(
      row({
        estimated_current_displacement: {
          total: 1_250_000,
        },
      }),
      "Sudan",
    );

    expect(mapped.figures.displaced).toBe(1_250_000);
    expect(mapped.stats.find((s) => s.key === "displaced")?.value).toBe("1.3M");
  });

  it("falls back to legacy population_displaced when estimated is missing", () => {
    const mapped = mapSituationAnalysis(
      row({
        population_displaced: {
          value: 500_000,
          low: 450_000,
          high: 550_000,
          confidence: 0.8,
        },
      }),
      "Sudan",
    );

    expect(mapped.figures.displaced).toBe(500_000);
    expect(mapped.stats.find((s) => s.key === "displaced")).toMatchObject({
      key: "displaced",
      value: "500K",
      range: "450K – 550K",
      confidence: 0.8,
    });
  });

  it("prefers estimated_current_displacement over legacy population_displaced", () => {
    const mapped = mapSituationAnalysis(
      row({
        population_displaced: { value: 100 },
        estimated_current_displacement: { stock: 9_000_000 },
      }),
      "Sudan",
    );

    expect(mapped.figures.displaced).toBe(9_000_000);
  });

  it("omits the displaced tile when neither field resolves", () => {
    const mapped = mapSituationAnalysis(
      row({
        population_in_need: { value: 2_000_000 },
      }),
      "Sudan",
    );

    expect(mapped.figures.displaced).toBeNull();
    expect(mapped.stats.find((s) => s.key === "displaced")).toBeUndefined();
  });
});

function yearly(datapoints: SaRow["data"]["datapoints"]): SaRow {
  return {
    ...row(datapoints),
    id: "sa-year",
    windowStart: "2026-01-01T00:00:00.000Z",
    windowEnd: "2026-12-31T23:59:59.000Z",
  };
}

describe("fillMissingKeyFigures", () => {
  const allYearly = yearly({
    estimated_current_displacement: { stock: 1_000_000 },
    population_affected: { value: 4_000_000 },
    population_in_need: { value: 3_000_000 },
    returnees: { value: 10_000 },
    funding_required_usd: { value: 200_000_000 },
    funding_received_usd: { value: 50_000_000 },
  });

  it("fills only missing figures and labels the borrowed tiles", () => {
    const monthly = mapSituationAnalysis(
      row({
        estimated_current_displacement: { stock: 800_000 },
        population_in_need: { value: 2_500_000 },
      }),
      "Venezuela",
    );
    const filled = fillMissingKeyFigures(
      monthly,
      mapSituationAnalysis(allYearly, "Venezuela"),
    );

    expect(filled.summary).toBe(monthly.summary);
    expect(filled.figures.displaced).toBe(800_000);
    expect(filled.figures.inNeed).toBe(2_500_000);
    expect(filled.figures.affected).toBe(4_000_000);
    expect(filled.stats.find((s) => s.key === "displaced")).toMatchObject({
      periodYear: null,
    });
    expect(filled.stats.find((s) => s.key === "affected")).toMatchObject({
      key: "affected",
      value: "4M",
      periodYear: "2026",
    });
  });

  it("does not overwrite a monthly zero", () => {
    const monthly = mapSituationAnalysis(
      row({ returnees: { value: 0 } }),
      "Venezuela",
    );
    const filled = fillMissingKeyFigures(
      monthly,
      mapSituationAnalysis(allYearly, "Venezuela"),
    );

    expect(filled.figures.returnees).toBe(0);
    expect(filled.stats.find((s) => s.key === "returnees")?.periodYear).toBeNull();
  });

  it("does not overwrite a low-confidence monthly figure", () => {
    const monthly = mapSituationAnalysis(
      row({
        population_affected: { value: 100_000, confidence: 0.1 },
      }),
      "Venezuela",
    );
    const filled = fillMissingKeyFigures(
      monthly,
      mapSituationAnalysis(allYearly, "Venezuela"),
    );

    expect(filled.figures.affected).toBe(100_000);
    expect(filled.stats.find((s) => s.key === "affected")).toMatchObject({
      confidence: 0.1,
      periodYear: null,
    });
  });

  it("omits a figure when yearly is also missing it", () => {
    const monthly = mapSituationAnalysis(
      row({ estimated_current_displacement: { stock: 800_000 } }),
      "Venezuela",
    );
    const thinYearly = mapSituationAnalysis(
      yearly({ estimated_current_displacement: { stock: 1_000_000 } }),
      "Venezuela",
    );
    const filled = fillMissingKeyFigures(monthly, thinYearly);

    expect(filled.figures.affected).toBeNull();
    expect(filled.stats.find((s) => s.key === "affected")).toBeUndefined();
  });

  it("needs a yearly fill only when a point estimate is absent", () => {
    const thin = mapSituationAnalysis(
      row({ estimated_current_displacement: { stock: 800_000 } }),
      "Venezuela",
    );
    const complete = mapSituationAnalysis(allYearly, "Venezuela");

    expect(needsYearlyFill(thin)).toBe(true);
    expect(needsYearlyFill(complete)).toBe(false);
  });
});
