import { describe, it, expect } from "vitest";
import {
  mapSituationAnalysis,
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
