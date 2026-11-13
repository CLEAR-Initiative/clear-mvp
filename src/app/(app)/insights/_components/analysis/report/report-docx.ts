import {
  BorderStyle,
  Document,
  ExternalHyperlink,
  Footer,
  Header,
  ImageRun,
  Packer,
  PageNumber,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TableLayoutType,
  TabStopType,
  TextRun,
  WidthType,
  type IBorderOptions,
  type ParagraphChild,
} from "docx";
import type { Analysis } from "~/server/api/mappers/analysis";
import type { SaBullet, SaSector } from "~/server/api/mappers/situation-analysis";
import { compactNumber } from "~/server/api/mappers/situation-analysis";
import { splitSubject, type KpiValues } from "~/lib/analysis-view";
import type { ReportMap, ReportSectionKey } from "~/lib/analysis-report";
import { distinctHeadings, readablePublisher, sourceHeading } from "../../situation/source-heading";
import { displacementBullets } from "../dark/displacement-story";

/**
 * Word can't read the app's CSS variables, so this mirrors the light-theme
 * design tokens from globals.css (a printed report is always light).
 */
const C = {
  ink: "171717", // --color-text-primary
  secondary: "525252", // --color-text-secondary
  muted: "737373", // --color-text-muted
  border: "E5E5E5", // --color-border
  borderDark: "D4D4D4", // --color-border-dark
  bgMuted: "F5F5F5", // --color-bg-muted
  accent: "E85D3D", // --color-accent
  accentLight: "FEF2F0", // --color-accent-light
  critical: "DC2626", // --color-critical
  warning: "D97706", // --color-warning
  info: "2563EB", // --color-info
  success: "059669", // --color-success
};

const SEVERITY_COLOR: Record<string, string> = { critical: C.critical, high: C.warning, medium: C.info, low: C.success };
const SEVERITY_RANK: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
const MAX_SECTOR_LINES = 3;

/** A4 in twips, with the same 40pt side margins as the screen layout. */
const PAGE = { width: 11906, height: 16838, side: 800, top: 1000, bottom: 1000 };
const CONTENT_WIDTH = PAGE.width - 2 * PAGE.side;
/** docx sizes images in pixels at 96 dpi; the map is laid out in points. */
const PT_TO_PX = 96 / 72;
/** The map is drawn at twice its size so it stays sharp when printed. */
const MAP_SCALE = 2;

/** Font sizes in half-points. */
const SIZE = { body: 20, small: 16, tiny: 14, h2: 22, h3: 18, title: 40, kpi: 32 };
const pt = (n: number) => n * 20; // points to twips

export interface ReportLabels {
  eyebrow: string;
  org: string;
  classification: string;
  disclaimer: string;
  scopeKind: string;
  period: string;
  versionOf: string;
  keyDevelopments: string;
  currentStatus: string;
  displaced: string;
  displacedSub: string;
  inNeed: string;
  inNeedSub: string;
  funding: string;
  fundingSub: string;
  notReported: string;
  map: string;
  mapScope: string;
  mapEvents: string;
  contexts: string;
  hazards: string;
  displacement: string;
  priorityNeeds: string;
  responseActivities: string;
  noResponse: string;
  outlook: string;
  mostLikely: string;
  bestCase: string;
  worstCase: string;
  sources: string;
  eventLabel: string;
  hapiFigure: string;
  provenance: string;
  footer: string;
  /** "Page {n} of {total}"; Word fills in the numbers, so this receives placeholders. */
  page: (n: string, total: string) => string;
  severity: (key: string) => string;
}

export interface ReportInput {
  /** Included sections, in the order the reader chose. */
  sections: ReportSectionKey[];
  data: Analysis;
  kpis: KpiValues;
  map: ReportMap | null;
  /** The map drawn as a PNG (see `drawReportMap`); null leaves the map out. */
  mapPng: Uint8Array | null;
  labels: ReportLabels;
  scopeName: string;
  generatedLabel: string;
}

const FONT = "Roboto";
/** Line height (240 = single): Word's single spacing reads cramped at body size. */
const LINE = 300;

/** Font, size and colour on every run: some viewers (Pages, Quick Look) ignore the document defaults. */
const run = (text: string, opts: Partial<{ bold: boolean; color: string; size: number; allCaps: boolean }> = {}) =>
  new TextRun({ text, font: FONT, size: SIZE.body, color: C.ink, ...opts });

function refs(list: number[]): TextRun[] {
  return list.length > 0 ? [run(` [${list.join(", ")}]`, { color: C.info, size: SIZE.tiny })] : [];
}

function bullet(children: ParagraphChild[], refList: number[] = []): Paragraph {
  return new Paragraph({ bullet: { level: 0 }, spacing: { line: LINE, after: pt(5) }, children: [...children, ...refs(refList)] });
}

const bullets = (items: SaBullet[]) => items.map((b) => bullet([run(b.text)], b.refs));

const para = (children: ParagraphChild[], after = 6) => new Paragraph({ spacing: { line: LINE, after: pt(after) }, children });

const h3 = (text: string) =>
  new Paragraph({
    spacing: { line: LINE, before: pt(8), after: pt(3) },
    children: [run(text, { bold: true, color: C.secondary, size: SIZE.h3, allCaps: true })],
  });

const line = (color: string, size = 6): IBorderOptions => ({ style: BorderStyle.SINGLE, size, color });
const NO_BORDER: IBorderOptions = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };

function kpiTable(cells: { label: string; value: string | null; sub: string }[]): Table {
  const width = Math.floor(CONTENT_WIDTH / cells.length);
  return new Table({
    width: { size: CONTENT_WIDTH, type: WidthType.DXA },
    layout: TableLayoutType.FIXED,
    columnWidths: cells.map(() => width),
    rows: [
      new TableRow({
        cantSplit: true,
        children: cells.map(
          (c) =>
            new TableCell({
              width: { size: width, type: WidthType.DXA },
              shading: { type: ShadingType.CLEAR, color: "auto", fill: "FAFAFA" },
              margins: { top: pt(6), bottom: pt(6), left: pt(8), right: pt(8) },
              borders: { top: line(C.accent, 18), bottom: line(C.border), left: line(C.border), right: line(C.border) },
              children: [
                para([run(c.label, { bold: true, color: C.secondary, size: SIZE.small, allCaps: true })], 2),
                para([run(c.value ?? "-", { bold: true, size: SIZE.kpi })], 2),
                para([run(c.sub, { color: C.secondary, size: SIZE.small })], 0),
              ],
            }),
        ),
      }),
    ],
  });
}

function sectorsBySeverity(sectors: SaSector[]) {
  return [...sectors]
    .filter((x) => x.severity)
    .sort((a, b) => (SEVERITY_RANK[a.severity!] ?? 9) - (SEVERITY_RANK[b.severity!] ?? 9));
}

type Block = Paragraph | Table;

/**
 * The situation report (PRD v5, R31) as a Word document: key developments,
 * current status, priority needs, response activities and the scope map,
 * with the version stamp and sources (R32) so every statement stays traceable.
 */
export function buildReportDocument({ sections, data, kpis, map, mapPng, labels, scopeName, generatedLabel }: ReportInput): Document {
  const needs = sectorsBySeverity(data.sectors).filter((x) => x.needs.length > 0);
  const response = data.sectors.filter((x) => x.interventions.length > 0);
  const fundingValue =
    kpis.fundingReceived != null
      ? `$${compactNumber(kpis.fundingReceived)}${kpis.fundingRequired != null ? ` / $${compactNumber(kpis.fundingRequired)}` : ""}`
      : kpis.fundingRequired != null
        ? `$${compactNumber(kpis.fundingRequired)}`
        : null;

  const renderSection = (key: ReportSectionKey): Block[] => {
    switch (key) {
      case "keyDevelopments":
        return [
          ...(data.summary ? [para([run(data.summary), ...refs(data.summaryRefs)])] : []),
          ...data.keyFindings.map((f) => {
            const { subject, body } = splitSubject(f.text);
            return bullet([...(subject ? [run(`${subject}: `, { bold: true })] : []), run(body)], f.refs);
          }),
        ];
      case "currentStatus":
        return [
          kpiTable([
            {
              label: labels.displaced,
              value: kpis.displacedTotal != null ? compactNumber(kpis.displacedTotal) : null,
              sub: kpis.displacedTotal != null ? labels.displacedSub : labels.notReported,
            },
            {
              label: labels.inNeed,
              value: kpis.inNeed ? compactNumber(kpis.inNeed.value) : null,
              sub: kpis.inNeed ? labels.inNeedSub : labels.notReported,
            },
            { label: labels.funding, value: fundingValue, sub: fundingValue ? labels.fundingSub : labels.notReported },
          ]),
        ];
      case "map":
        if (!map || !mapPng) return [];
        return [
          new Paragraph({
            spacing: { before: pt(6), after: pt(2) },
            keepNext: true,
            children: [
              new ImageRun({
                type: "png",
                data: mapPng,
                transformation: { width: Math.round(map.width * PT_TO_PX), height: Math.round(map.height * PT_TO_PX) },
                altText: { name: labels.map, title: labels.map, description: `${labels.mapScope}. ${labels.mapEvents}` },
              }),
            ],
          }),
          para([run(`${labels.mapScope} · ${labels.mapEvents}`, { color: C.secondary, size: SIZE.small })]),
        ];
      case "contexts":
        return data.contextRisks.flatMap((r) => [h3(r.label), ...r.items.map((item) => bullet([run(item)], r.lineRefs[item] ?? []))]);
      case "hazards":
        return bullets(data.hazards.hazards);
      case "displacement":
        return bullets(displacementBullets(data.displacement));
      case "priorityNeeds":
        return needs.flatMap((x) => [
          new Paragraph({
            spacing: { line: LINE, before: pt(6), after: pt(2) },
            keepNext: true,
            children: [
              run(labels.severity(x.severity!).toUpperCase(), { bold: true, size: SIZE.tiny, color: SEVERITY_COLOR[x.severity!] ?? C.muted }),
              run("  "),
              run(x.name, { bold: true }),
            ],
          }),
          ...x.needs.slice(0, MAX_SECTOR_LINES).map((n) => bullet([run(n)], x.lineRefs[n] ?? [])),
        ]);
      case "responseActivities":
        if (response.length === 0) return [para([run(labels.noResponse, { color: C.secondary })])];
        return response.flatMap((x) => [
          new Paragraph({ spacing: { line: LINE, before: pt(4), after: pt(2) }, keepNext: true, children: [run(x.name, { bold: true })] }),
          ...x.interventions.slice(0, MAX_SECTOR_LINES).map((n) => bullet([run(n)], x.lineRefs[n] ?? [])),
        ]);
      case "outlook": {
        const scenarios = data.scenarios;
        if (!scenarios) return [];
        const cases = (
          [
            [labels.mostLikely, scenarios.mostLikely],
            [labels.bestCase, scenarios.bestCase],
            [labels.worstCase, scenarios.worstCase],
          ] as const
        ).filter((entry): entry is [string, string] => !!entry[1]);
        if (!scenarios.description && cases.length === 0) return [];
        return [
          ...(scenarios.description ? [para([run(scenarios.description)])] : []),
          ...cases.flatMap(([label, text]) => [
            new Paragraph({ keepNext: true, spacing: { line: LINE }, children: [run(label, { bold: true })] }),
            para([run(text)]),
          ]),
          ...(scenarios.refs.length > 0 ? [para(refs(scenarios.refs))] : []),
        ];
      }
      case "sources": {
        const sourceLabels = { event: labels.eventLabel, hapiFigure: labels.hapiFigure };
        const headings = distinctHeadings(data.sources, sourceLabels, (iso) => iso.slice(0, 10));
        return data.sources.map((src, i) => {
          const plain = sourceHeading(src, sourceLabels);
          const heading = headings[i] ?? plain;
          const publisher = heading === plain ? readablePublisher(src.publisher) : null;
          const url = src.url?.startsWith("http") ? src.url : null;
          return new Paragraph({
            spacing: { line: LINE, after: pt(3) },
            indent: { left: pt(18), hanging: pt(18) },
            children: [
              run(`${i + 1}.\t`, { color: C.muted, size: SIZE.small }),
              run(`${heading}${publisher ? ` · ${publisher}` : ""}`, { size: SIZE.small }),
              ...(url
                ? [
                    run(" · ", { size: SIZE.small }),
                    new ExternalHyperlink({ link: url, children: [new TextRun({ text: url, font: FONT, size: SIZE.small, color: C.info, underline: {} })] }),
                  ]
                : []),
            ],
            tabStops: [{ type: TabStopType.LEFT, position: pt(18) }],
          });
        });
      }
    }
  };

  const titled: Record<ReportSectionKey, string> = {
    keyDevelopments: labels.keyDevelopments,
    currentStatus: labels.currentStatus,
    map: labels.map,
    contexts: labels.contexts,
    hazards: labels.hazards,
    displacement: labels.displacement,
    priorityNeeds: labels.priorityNeeds,
    responseActivities: labels.responseActivities,
    outlook: labels.outlook,
    sources: labels.sources,
  };
  const blocks = sections.flatMap((key) => {
    const body = renderSection(key);
    return body.length > 0 ? [{ key, body }] : [];
  });

  const shaded = (children: ParagraphChild[], after = 0) =>
    new Paragraph({ shading: { type: ShadingType.CLEAR, color: "auto", fill: C.bgMuted }, spacing: { line: LINE, after: pt(after) }, children });

  // Word fills in the page numbers: split the translated label around placeholders.
  const [beforeN = "", rest = ""] = labels.page("\u0001", "\u0002").split("\u0001");
  const [between = "", afterTotal = ""] = rest.split("\u0002");

  const body: Block[] = [
    para([run(labels.eyebrow, { bold: true, color: C.accent, size: SIZE.small, allCaps: true })], 2),
    para([run(scopeName, { bold: true, size: SIZE.title })], 4),
    para([run(`${labels.scopeKind} · ${labels.period}`, { color: C.secondary, size: SIZE.small })], 2),
    new Paragraph({
      border: { bottom: line(C.border) },
      spacing: { line: LINE, after: pt(10) },
      children: [run(labels.versionOf, { color: C.secondary, size: SIZE.small })],
    }),
    ...blocks.flatMap((block, i) => [
      new Paragraph({
        keepNext: true,
        spacing: { line: LINE, before: pt(14), after: pt(6) },
        children: [run(`${i + 1}. ${titled[block.key]}`, { bold: true, size: SIZE.h2 })],
      }),
      ...block.body,
    ]),
    new Paragraph({ spacing: { line: LINE, before: pt(16) }, children: [] }),
    shaded([run(labels.provenance, { bold: true, size: SIZE.small })]),
    shaded([run(labels.disclaimer, { color: C.secondary, size: SIZE.small })]),
    shaded([run(generatedLabel, { color: C.secondary, size: SIZE.small })]),
    shaded([run(`${labels.versionOf} · ID ${data.id}`, { color: C.secondary, size: SIZE.small })]),
  ];

  return new Document({
    title: `${labels.eyebrow}: ${scopeName}`,
    creator: "CLEAR",
    styles: { default: { document: { run: { font: FONT, size: SIZE.body, color: C.ink }, paragraph: { spacing: { line: LINE } } } } },
    sections: [
      {
        properties: {
          page: {
            size: { width: PAGE.width, height: PAGE.height },
            margin: { top: PAGE.top, bottom: PAGE.bottom, left: PAGE.side, right: PAGE.side, header: pt(14), footer: pt(20) },
          },
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                border: { top: line(C.accent, 24), bottom: NO_BORDER },
                tabStops: [{ type: TabStopType.RIGHT, position: CONTENT_WIDTH }],
                children: [
                  run(labels.org, { bold: true, color: C.muted, size: SIZE.tiny, allCaps: true }),
                  run("\t"),
                  run(labels.classification, { bold: true, color: C.muted, size: SIZE.tiny, allCaps: true }),
                ],
              }),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                tabStops: [{ type: TabStopType.RIGHT, position: CONTENT_WIDTH }],
                children: [
                  run(labels.footer, { color: C.muted, size: SIZE.tiny }),
                  new TextRun({ children: ["\t", beforeN, PageNumber.CURRENT, between, PageNumber.TOTAL_PAGES, afterTotal], font: FONT, color: C.muted, size: SIZE.tiny }),
                ],
              }),
            ],
          }),
        },
        children: body,
      },
    ],
  });
}

/** The report as a .docx file. */
export function buildReportDocx(input: ReportInput): Promise<Blob> {
  return Packer.toBlob(buildReportDocument(input));
}

/**
 * Draw the scope map onto a canvas and return it as PNG bytes. Null where the
 * browser can't draw it (no canvas or Path2D, as in tests) or drawing throws;
 * the report then leaves the map out rather than failing.
 */
export async function drawReportMap(map: ReportMap): Promise<Uint8Array | null> {
  if (typeof document === "undefined" || typeof Path2D === "undefined") return null;
  try {
    const canvas = document.createElement("canvas");
    canvas.width = map.width * MAP_SCALE;
    canvas.height = map.height * MAP_SCALE;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    const hex = (c: string) => `#${c}`;
    ctx.scale(MAP_SCALE, MAP_SCALE);
    ctx.fillStyle = hex(C.bgMuted);
    ctx.fillRect(0, 0, map.width, map.height);
    ctx.beginPath();
    ctx.rect(0, 0, map.width, map.height);
    ctx.clip();
    if (map.country) {
      const country = new Path2D(map.country);
      ctx.fillStyle = "#FFFFFF";
      ctx.fill(country);
      ctx.strokeStyle = hex(C.borderDark);
      ctx.lineWidth = 0.8;
      ctx.stroke(country);
    }
    for (const d of map.areas) {
      const area = new Path2D(d);
      ctx.fillStyle = hex(C.accentLight);
      ctx.fill(area);
      ctx.strokeStyle = hex(C.accent);
      ctx.lineWidth = 1.2;
      ctx.stroke(area);
    }
    ctx.globalAlpha = 0.85;
    for (const dot of map.dots) {
      const sev = dot.severity ?? 0;
      ctx.fillStyle = hex(sev >= 4 ? C.critical : sev >= 3 ? C.warning : C.info);
      ctx.beginPath();
      ctx.arc(dot.x, dot.y, 2.2, 0, Math.PI * 2);
      ctx.fill();
    }
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
    return blob ? new Uint8Array(await blob.arrayBuffer()) : null;
  } catch {
    // A blocked or failing canvas costs the map, not the report.
    return null;
  }
}
