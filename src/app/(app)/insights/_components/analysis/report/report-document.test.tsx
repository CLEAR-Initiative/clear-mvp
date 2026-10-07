import { describe, expect, it } from "vitest";
import { renderToBuffer } from "@react-pdf/renderer";
import type { Analysis } from "~/server/api/mappers/analysis";
import { REPORT_SECTIONS, projectReportMap } from "~/lib/analysis-report";
import { ReportDocument, type ReportLabels } from "./report-document";

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
  displacement: { push: [{ text: "Attacks on civilians in Um Dibban.", refs: [2] }], return: [] },
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
  eyebrow: "Situation report", scopeKind: "Created analysis", period: "Covers 1 Jul 2026 to date", versionOf: "Analysis version of 29 Sep 2026, 21:52",
  keyDevelopments: "Key developments", currentStatus: "Current status", displaced: "Displaced", displacedSub: "people displaced",
  inNeed: "In need", inNeedSub: "people in need", funding: "Funding", fundingSub: "received / required", notReported: "Not reported",
  map: "Scope map", mapScope: "Shaded: analysis area", mapEvents: "Dots: 2 events since 1 Jul 2026", contexts: "Context", hazards: "Hazards",
  displacement: "What is forcing people out", priorityNeeds: "Priority needs", responseActivities: "Response activities",
  noResponse: "None reported.", outlook: "Outlook", sources: "Sources", provenance: "Provenance", footer: "CLEAR · Bara",
  page: (n, t) => `Page ${n} of ${t}`, severity: (k) => k,
};

describe("ReportDocument", () => {
  it("renders a PDF with the map, figures and sources", async () => {
    const map = projectReportMap({
      country: square(22, 9, 16),
      areas: [square(30, 13)],
      events: [{ point: [30.5, 13.5], severity: 5 }, { point: [45, 40], severity: 2 }],
      width: 515,
      height: 250,
    });
    expect(map?.dots).toHaveLength(1);
    const kpis = { inside: 414252, abroad: null, displacedTotal: 414252, returned: null, inNeed: { value: 200000, low: null, high: null, newestAt: null }, fundingReceived: 1.1e9, fundingRequired: 4.2e9 };
    const buf = await renderToBuffer(
      <ReportDocument sections={[...REPORT_SECTIONS]} data={data} kpis={kpis} map={map} labels={labels} scopeName="Bara, North Kordofan, Sudan" generatedLabel="Report created 29 Sep 2026 by admin@clearinitiative.io" />,
    );
    expect(buf.subarray(0, 5).toString()).toBe("%PDF-");
  }, 30_000);
});
