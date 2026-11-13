import { describe, expect, it } from "vitest";
import { Packer } from "docx";
import type { Analysis } from "~/server/api/mappers/analysis";
import { REPORT_SECTIONS, projectReportMap } from "~/lib/analysis-report";
import { buildReportDocument, type ReportLabels } from "./report-docx";

const square = (x: number, y: number, d = 1) => ({
  type: "Polygon",
  coordinates: [[[x, y], [x + d, y], [x + d, y + d], [x, y + d], [x, y]]],
});

const data = {
  id: "a2",
  scope: { locationIds: ["bara"], name: "Bara, North Kordofan, Sudan", windowStart: "2026-07-01T00:00:00Z", windowEnd: null },
  crisis: {
    country: "Sudan", year: "2026", generatedAt: "2026-09-29T19:52:00Z", generatedByModel: "m", schemaVersion: "v4",
    reportCount: 5, qualityScore: 0.7, freshestSourceAt: "2026-09-25T00:00:00Z",
  },
  summary: "Fighting around Bara displaced thousands in September. Cholera and measles spread in the locality. Access for aid remains constrained.",
  summaryRefs: [1, 2],
  summaryLineRefs: {},
  stats: [],
  figures: { displaced: 414252, affected: null, inNeed: 200000, returnees: null, fundingRequired: 4.2e9, fundingReceived: 1.1e9 },
  contextRisks: [{ key: "security", label: "Security", items: ["SAF and RSF clashes around al-Mazroub, 17 to 19 Sep.", "Drone strike on Mazrub on 25 Sep."], refs: [2], lineRefs: {} }],
  hazards: { hazards: [{ text: "Cholera: 45 cases in Bara.", refs: [1] }], vulnerabilities: [] },
  displacement: { push: [{ text: "Attacks on civilians in Um Dibban.", refs: [2] }], return: [], summary: null, findings: [], dataCheck: null, flows: [], mapSince: null },
  sectors: [
    { id: "health", code: "HE", name: "Health", severity: "critical", impact: [], humanitarian: [], atRisk: [], needs: ["Cholera treatment capacity", "Measles vaccination"], interventions: ["WHO supplied cholera kits to Bara hospital."], coverage: [], refs: [1], lineRefs: {}, reportCount: 2, evidenceScope: "sector" },
    { id: "wash", code: "WA", name: "WASH", severity: "high", impact: [], humanitarian: [], atRisk: [], needs: ["Safe water in El Fāshir camps"], interventions: [], coverage: [], refs: [], lineRefs: {}, reportCount: 1, evidenceScope: "sector" },
  ],
  sources: [
    { id: "r1", title: "WHO Sudan cholera update", url: "https://reliefweb.int/r1", publishedAt: null, publisher: "WHO" },
    { id: "event:e1", title: "Drone strike on Mazrub", url: "/event/e1", publishedAt: null, publisher: "CLEAR" },
  ],
  changes: { comparedTo: null, notes: {} },
  scenarios: { description: null, mostLikely: "Insecurity keeps access constrained.", bestCase: null, worstCase: null, refs: [2] },
  eventSourceIds: ["event:e1"],
  keyFindings: [{ text: "Security: Drone strike on Mazrub killed up to 9 on 25 Sep.", refs: [2] }],
} as unknown as Analysis;

const labels: ReportLabels = {
  eyebrow: "Situation report", org: "Norwegian Refugee Council", classification: "Internal use and private sharing only",
  disclaimer: "For planning. Figures come from the sources listed and are not a field assessment.",
  scopeKind: "Created analysis", period: "Covers 1 Jul 2026 to date", versionOf: "Analysis version of 29 Sep 2026, 21:52",
  keyDevelopments: "Key developments", currentStatus: "Current status", displaced: "Displaced", displacedSub: "people displaced",
  inNeed: "In need", inNeedSub: "people in need", funding: "Funding", fundingSub: "received / required", notReported: "Not reported",
  map: "Scope map", mapScope: "Shaded: analysis area", mapEvents: "Dots: 2 events since 1 Jul 2026", contexts: "Context", hazards: "Hazards",
  displacement: "What is forcing people out", priorityNeeds: "Priority needs", responseActivities: "Response activities",
  noResponse: "None reported.", outlook: "Outlook", mostLikely: "Most likely", bestCase: "Best case", worstCase: "Worst case",
  sources: "Sources", eventLabel: "Event", hapiFigure: "HAPI figure", provenance: "Provenance", footer: "CLEAR · Bara",
  page: (n, total) => `Page ${n} of ${total}`, severity: (k) => k,
};

/** A 1x1 PNG, standing in for the drawn map (tests have no canvas). */
const PNG = Uint8Array.from(atob("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="), (c) => c.charCodeAt(0));

const kpis = { inside: 414252, abroad: null, displacedTotal: 414252, returned: null, inNeed: { value: 200000, low: null, high: null, newestAt: null }, fundingReceived: 1.1e9, fundingRequired: 4.2e9 };

/** The .docx bytes as a binary string: file names in a zip are stored uncompressed. */
async function build(overrides: Partial<Parameters<typeof buildReportDocument>[0]> = {}) {
  const map = projectReportMap({
    country: square(22, 9, 16),
    areas: [square(30, 13)],
    events: [{ point: [30.5, 13.5], severity: 5 }],
    width: 515,
    height: 250,
  });
  const doc = buildReportDocument({
    sections: [...REPORT_SECTIONS],
    data,
    kpis,
    map,
    mapPng: PNG,
    labels,
    scopeName: "Bara, North Kordofan, Sudan",
    generatedLabel: "Report created 29 Sep 2026 by admin@clearinitiative.io",
    ...overrides,
  });
  const buf = await Packer.toBuffer(doc);
  return { buf, names: buf.toString("latin1") };
}

describe("buildReportDocument", () => {
  it("builds a Word file with the map image", async () => {
    const { buf, names } = await build();
    expect(buf.subarray(0, 2).toString()).toBe("PK");
    expect(names).toContain("word/document.xml");
    expect(names).toContain("word/footer");
    expect(names).toMatch(/word\/media\/[^"]+\.png/);
  }, 30_000);

  it("leaves the map out when it could not be drawn", async () => {
    const { names } = await build({ mapPng: null });
    expect(names).not.toMatch(/word\/media\//);
  }, 30_000);

  it("builds a Sudan-sized report in time", async () => {
    const sentence = "Fighting, displacement and disease continue across Sudan. ";
    const paragraph = (label: string) => `${label}: ${sentence.repeat(12)}`;
    const lines = (n: number, label: string) => Array.from({ length: n }, (_, i) => paragraph(`${label} ${i}`));
    const sector = (i: number) => ({
      id: `s${i}`,
      code: "HE",
      name: `Sector ${i}`,
      severity: i % 2 === 0 ? "critical" : "high",
      impact: [],
      humanitarian: [],
      atRisk: [],
      needs: lines(3, `Need ${i}`),
      interventions: lines(3, `Response ${i}`),
      coverage: [],
      refs: [1],
      lineRefs: {},
      reportCount: 4,
      evidenceScope: "sector" as const,
    });
    const sudan = {
      ...data,
      scope: { locationIds: ["sdn"], name: "Sudan", windowStart: "2026-01-01T00:00:00Z", windowEnd: null },
      summary: paragraph("Summary"),
      summaryRefs: [1, 2, 3],
      keyFindings: lines(12, "Security").map((text) => ({ text: `Security: ${text}`, refs: [2] })),
      contextRisks: Array.from({ length: 6 }, (_, i) => ({
        key: `c${i}`,
        label: `Context ${i}`,
        items: lines(4, `Context ${i}`),
        refs: [1],
        lineRefs: {},
      })),
      hazards: { hazards: lines(8, "Hazard").map((text) => ({ text, refs: [1] })), vulnerabilities: [] },
      displacement: { push: lines(8, "Displacement").map((text) => ({ text, refs: [2] })), return: [], summary: null, findings: [], dataCheck: null, flows: [], mapSince: null },
      sectors: Array.from({ length: 8 }, (_, i) => sector(i)),
      sources: Array.from({ length: 40 }, (_, i) => ({
        id: `r${i}`,
        title: `OCHA Sudan update ${i}`,
        url: `https://reliefweb.int/sudan/${i}`,
        publishedAt: "2026-09-01T00:00:00Z",
        publisher: "OCHA",
      })),
      scenarios: {
        description: paragraph("Outlook"),
        mostLikely: paragraph("Most likely"),
        bestCase: paragraph("Best case"),
        worstCase: paragraph("Worst case"),
        refs: [2],
      },
      eventSourceIds: ["event:e1"],
    } as unknown as Analysis;
    const map = projectReportMap({
      country: square(22, 9, 16),
      areas: [],
      events: Array.from({ length: 40 }, (_, i) => ({ point: [24 + (i % 10), 10 + Math.floor(i / 10)] as [number, number], severity: (i % 5) + 1 })),
      width: 515,
      height: 250,
    });
    const kpis = {
      inside: 8.6e6,
      abroad: 2.8e6,
      displacedTotal: 11.4e6,
      returned: null,
      inNeed: { value: 30.4e6, low: 19e6, high: 30.4e6, newestAt: "2026-09-01" },
      fundingReceived: 1.1e9,
      fundingRequired: 4.2e9,
    };
    const started = Date.now();
    const doc = buildReportDocument({
      sections: [...REPORT_SECTIONS],
      data: sudan,
      kpis,
      map,
      mapPng: PNG,
      labels: { ...labels, scopeKind: "Country analysis", footer: "CLEAR · Sudan" },
      scopeName: "Sudan",
      generatedLabel: "Report created 27 Oct 2026 by analyst@clearinitiative.io",
    });
    const buf = await Packer.toBuffer(doc);
    expect(Date.now() - started).toBeLessThan(25_000);
    expect(buf.byteLength).toBeGreaterThan(1000);
    expect(buf.subarray(0, 2).toString()).toBe("PK");
  }, 30_000);
});
