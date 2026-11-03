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

describe("mapSituationAnalysis sources", () => {
  it("leaves a missing title empty for an event or HAPI citation", () => {
    const mapped = mapSituationAnalysis(
      {
        ...row({}),
        data: {
          sources: {
            reports: [
              { report_id: "event:e-missing" },
              { report_id: "api:sdn:hapi_humanitarian_needs:pin" },
              { report_id: "r-blank" },
            ],
          },
        },
      },
      "Sudan",
    );

    expect(mapped.sources.map((s) => [s.id, s.title])).toEqual([
      ["event:e-missing", ""],
      ["api:sdn:hapi_humanitarian_needs:pin", ""],
      ["r-blank", "Untitled report"],
    ]);
  });
});

describe("mapSituationAnalysis hazards", () => {
  it("reads the section summaries and leaves older analyses without them", () => {
    const base = row(undefined);
    const withSummaries: SaRow = {
      ...base,
      data: {
        hazards_and_vulnerabilities: {
          hazards: [{ description: "Cholera: 114 dead." }],
          hazards_summary: "  Conflict is the main hazard. ",
          vulnerabilities_summary: " ",
        },
      },
    };
    expect(mapSituationAnalysis(withSummaries, "Sudan").hazards).toMatchObject({
      hazards: [{ text: "Cholera: 114 dead." }],
      hazardsSummary: "Conflict is the main hazard.",
      vulnerabilitiesSummary: null,
    });
    expect(mapSituationAnalysis(base, "Sudan").hazards).toMatchObject({ hazardsSummary: null, vulnerabilitiesSummary: null });
  });

  it("reads aggravating and mitigating factors with their topic and scope", () => {
    const sa = mapSituationAnalysis(
      {
        ...row(undefined),
        data: {
          hazards_and_vulnerabilities: {
            aggravating_factors: [
              { description: "Currency collapse: pound down 89%.", topic: "economic_fragility", scope: " Sudan-wide " },
              { description: "  " },
            ],
            mitigating_factors: [{ description: "Cholera supplies: prepositioned.", topic: "" }],
          },
          sources: { reports: [{ report_id: "r1", report_title: "OCHA", source_url: null, published_at: null }] },
        },
        sourceReportIds: ["r1"],
      },
      "Sudan",
    );
    expect(sa.hazards.aggravating).toEqual([
      { text: "Currency collapse: pound down 89%.", refs: [], topic: "economic_fragility", scope: "Sudan-wide" },
    ]);
    expect(sa.hazards.mitigating).toEqual([{ text: "Cholera supplies: prepositioned.", refs: [], topic: "other", scope: null }]);
  });
});

describe("mapSituationAnalysis humanitarian access", () => {
  it("reads topic findings, the older two lists and the summary", () => {
    const sa = mapSituationAnalysis(
      {
        ...row(undefined),
        data: {
          humanitarian_access: {
            barriers: [{ description: "Blocked convoys.", source_report_ids: ["r1"] }],
            constraints: [],
            items: [{ description: "Airspace closed: four airports.", topic: "physical", source_report_ids: ["r1"] }],
            summary: " Fighting cuts aid off. ",
          },
          sources: { reports: [{ report_id: "r1", report_title: "OCHA", source_url: null, published_at: null }] },
        },
        sourceReportIds: ["r1"],
      },
      "Sudan",
    );
    expect(sa.access).toEqual({
      items: [{ text: "Airspace closed: four airports.", refs: [1], topic: "physical", scope: null }],
      barriers: [{ text: "Blocked convoys.", refs: [1] }],
      constraints: [],
      summary: "Fighting cuts aid off.",
    });
    expect(mapSituationAnalysis(row(undefined), "Sudan").access).toEqual({ items: [], barriers: [], constraints: [], summary: null });
  });
});

describe("mapSituationAnalysis displacement", () => {
  function withDisplacement(displacement: SaRow["data"]["displacement"]): SaRow {
    return {
      ...row(undefined),
      data: {
        displacement,
        sources: { reports: [{ report_id: "r1", report_title: "DTM", source_url: null, published_at: null }] },
      },
      sourceReportIds: ["r1"],
    };
  }

  it("keeps older analyses on push and return bullets", () => {
    const d = mapSituationAnalysis(
      withDisplacement({ push_factors: [{ description: "Conflict.", source_report_ids: ["r1"] }] }),
      "Sudan",
    ).displacement;
    expect(d.push).toEqual([{ text: "Conflict.", refs: [1] }]);
    expect(d).toMatchObject({ summary: null, findings: [], dataCheck: null, flows: [], mapSince: null });
  });

  it("maps edited findings, the data check, and flows", () => {
    const d = mapSituationAnalysis(
      withDisplacement({
        summary: " Conflict drives most movement. ",
        findings: [
          { label: "Uneven returns", callout: "59% vs <1%", description: "Khartoum.", direction: "back", group: "idp", as_of: "Jul 2026", source_report_ids: ["r1"] },
          { label: "", description: "dropped: no label" },
          { label: "Movement barriers", callout: "", description: "Rains.", direction: "sideways" },
        ],
        data_check: { description: "Returns imply 6.4M.", source_report_ids: ["r1"] },
        flows: [
          { direction: "out", to_location_id: "ssd", to_name: "South Sudan", label: "South Sudan >1.3M", people: 1_300_000, finding: 1 },
          { direction: "back", to_location_id: "khr", label: "Khartoum · 2.6M back", finding: 9, source_report_ids: ["event:ev-7", "r1"] },
          { direction: "teleport", label: "dropped" },
          { direction: "out", label: "" },
        ],
        map_since: "April 2023",
      }),
      "Sudan",
    ).displacement;
    expect(d.summary).toBe("Conflict drives most movement.");
    expect(d.findings).toEqual([
      { label: "Uneven returns", callout: "59% vs <1%", text: "Khartoum.", refs: [1], tone: "back", group: "idp", asOf: "Jul 2026", isNew: false },
      { label: "Movement barriers", callout: null, text: "Rains.", refs: [], tone: "neutral", group: null, asOf: null, isNew: false },
    ]);
    expect(d.dataCheck).toEqual({ text: "Returns imply 6.4M.", refs: [1] });
    expect(d.flows).toHaveLength(2);
    // No group from older answers: a flow to a known location stays inside the country, so IDP.
    expect(d.flows[0]).toMatchObject({ direction: "out", group: "idp", to: { id: "ssd", name: "South Sudan" }, people: 1_300_000, finding: 1 });
    // A finding number past the list is not a link.
    expect(d.flows[1]).toMatchObject({ direction: "back", group: "idp", people: null, finding: null, eventId: "ev-7", refs: [1] });
    expect(d.mapSince).toBe("April 2023");
  });

  it("keeps a flow on its finding when an earlier blank finding is dropped", () => {
    const d = mapSituationAnalysis(
      withDisplacement({
        findings: [
          { label: "", description: "dropped: no label" },
          { label: "Uneven returns", description: "Khartoum." },
        ],
        flows: [
          { direction: "back", label: "Khartoum", finding: 2 },
          { direction: "back", label: "Halfway", finding: 1.5 },
        ],
      }),
      "Sudan",
    ).displacement;
    expect(d.flows.map((f) => f.finding)).toEqual([1, null]);
  });
});
