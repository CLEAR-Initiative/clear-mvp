import { Circle, ClipPath, Defs, Document, G, Link, Page, Path, Rect, StyleSheet, Svg, Text, View } from "@react-pdf/renderer";
import type { Analysis } from "~/server/api/mappers/analysis";
import type { SaBullet, SaSector } from "~/server/api/mappers/situation-analysis";
import { compactNumber } from "~/server/api/mappers/situation-analysis";
import { splitSubject, type KpiValues } from "~/lib/analysis-view";
import { pdfSafe, type ReportMap, type ReportSectionKey } from "~/lib/analysis-report";
import { distinctHeadings, readablePublisher, sourceHeading } from "../../situation/source-heading";

/**
 * The PDF can't read the app's CSS variables, so this mirrors the light-theme
 * design tokens from globals.css (a printed report is always light).
 */
const C = {
  ink: "#171717", // --color-text-primary
  secondary: "#525252", // --color-text-secondary
  muted: "#737373", // --color-text-muted
  border: "#E5E5E5", // --color-border
  borderDark: "#D4D4D4", // --color-border-dark
  bgMuted: "#F5F5F5", // --color-bg-muted
  accent: "#E85D3D", // --color-accent
  accentLight: "#FEF2F0", // --color-accent-light
  critical: "#DC2626", // --color-critical
  warning: "#D97706", // --color-warning
  info: "#2563EB", // --color-info
  success: "#059669", // --color-success
};

const SEVERITY_COLOR: Record<string, string> = { critical: C.critical, high: C.warning, medium: C.info, low: C.success };
const SEVERITY_RANK: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
const MAX_SECTOR_LINES = 3;

const s = StyleSheet.create({
  page: { paddingTop: 42, paddingBottom: 52, paddingHorizontal: 40, fontSize: 9.5, color: C.ink, fontFamily: "Helvetica", lineHeight: 1.5 },
  band: { position: "absolute", top: 0, left: 0, right: 0, height: 5, backgroundColor: C.accent },
  running: { position: "absolute", top: 14, left: 40, right: 40, flexDirection: "row", justifyContent: "space-between" },
  runningText: { fontSize: 7, color: C.muted, fontFamily: "Helvetica-Bold", letterSpacing: 0.4, textTransform: "uppercase" },
  eyebrow: { fontSize: 8, color: C.accent, fontFamily: "Helvetica-Bold", letterSpacing: 1.1, textTransform: "uppercase" },
  title: { fontSize: 20, fontFamily: "Helvetica-Bold", marginTop: 4, lineHeight: 1.2 },
  meta: { fontSize: 8.5, color: C.secondary, marginTop: 6 },
  rule: { borderBottomWidth: 1, borderBottomColor: C.border, marginVertical: 14 },
  h2: { fontSize: 11, fontFamily: "Helvetica-Bold", marginBottom: 6, marginTop: 14 },
  h3: { fontSize: 9, fontFamily: "Helvetica-Bold", color: C.secondary, textTransform: "uppercase", letterSpacing: 0.6, marginTop: 8, marginBottom: 3 },
  para: { marginBottom: 6 },
  bulletRow: { flexDirection: "row", marginBottom: 3 },
  bulletDot: { width: 10, color: C.muted },
  bulletText: { flex: 1 },
  bold: { fontFamily: "Helvetica-Bold" },
  refs: { fontSize: 7, color: C.info },
  kpis: { flexDirection: "row", gap: 8, marginTop: 2 },
  kpi: { flex: 1, borderWidth: 1, borderColor: C.border, borderTopWidth: 3, borderTopColor: C.accent, padding: 8, backgroundColor: "#FAFAFA" },
  kpiLabel: { fontSize: 7.5, color: C.secondary, fontFamily: "Helvetica-Bold", textTransform: "uppercase", letterSpacing: 0.6 },
  kpiValue: { fontSize: 16, fontFamily: "Helvetica-Bold", marginTop: 3 },
  kpiSub: { fontSize: 7.5, color: C.secondary, marginTop: 2 },
  mapBox: { marginTop: 10, borderWidth: 1, borderColor: C.border },
  mapLegend: { flexDirection: "row", gap: 12, fontSize: 7.5, color: C.secondary, paddingHorizontal: 8, paddingVertical: 5, borderTopWidth: 1, borderTopColor: C.border },
  sector: { marginBottom: 8 },
  sectorHead: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 2 },
  sectorName: { fontFamily: "Helvetica-Bold" },
  pill: { fontSize: 7, fontFamily: "Helvetica-Bold", color: "#FFFFFF", paddingHorizontal: 4, paddingVertical: 1.5 },
  source: { flexDirection: "row", marginBottom: 3, fontSize: 8 },
  sourceNo: { width: 18, color: C.muted },
  provenance: { marginTop: 16, padding: 8, backgroundColor: C.bgMuted, fontSize: 7.5, color: C.secondary },
  gapGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  gapCard: { width: "48%", borderWidth: 1, borderColor: C.border, padding: 8 },
  gapTag: { fontSize: 7, fontFamily: "Helvetica-Bold", letterSpacing: 0.5, marginBottom: 3 },
  // An explicit height keeps a long report's fixed footer from growing without
  // bound (each extra page was multiplying its box until PDFKit rejected it).
  footer: { position: "absolute", bottom: 20, left: 40, right: 40, height: 12, flexDirection: "row", justifyContent: "space-between", fontSize: 7, color: C.muted },
});

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
  page: (n: number, total: number) => string;
  severity: (key: string) => string;
}

const clean = (t: string) => pdfSafe(t);

function Refs({ refs }: { refs: number[] }) {
  if (refs.length === 0) return null;
  return <Text style={s.refs}> [{refs.join(", ")}]</Text>;
}

function Bullet({ children, refs = [] }: { children: React.ReactNode; refs?: number[] }) {
  return (
    <View style={s.bulletRow} wrap={false}>
      <Text style={s.bulletDot}>•</Text>
      <Text style={s.bulletText}>
        {children}
        <Refs refs={refs} />
      </Text>
    </View>
  );
}

function Bullets({ items }: { items: SaBullet[] }) {
  return (
    <>
      {items.map((b, i) => (
        <Bullet key={i} refs={b.refs}>
          {clean(b.text)}
        </Bullet>
      ))}
    </>
  );
}

function Kpi({ label, value, sub }: { label: string; value: string | null; sub: string }) {
  return (
    <View style={s.kpi}>
      <Text style={s.kpiLabel}>{label}</Text>
      <Text style={s.kpiValue}>{value ?? "-"}</Text>
      <Text style={s.kpiSub}>{sub}</Text>
    </View>
  );
}

function ScopeMapSvg({ map, labels }: { map: ReportMap; labels: ReportLabels }) {
  return (
    <View style={s.mapBox} wrap={false}>
      <Svg width={map.width} height={map.height} viewBox={`0 0 ${map.width} ${map.height}`}>
        <Defs>
          <ClipPath id="frame">
            <Rect x={0} y={0} width={map.width} height={map.height} />
          </ClipPath>
        </Defs>
        <Rect x={0} y={0} width={map.width} height={map.height} fill={C.bgMuted} />
        <G clipPath="url(#frame)">
          {map.country && <Path d={map.country} fill="#FFFFFF" stroke={C.borderDark} strokeWidth={0.8} />}
          {map.areas.map((d, i) => (
            <Path key={i} d={d} fill={C.accentLight} stroke={C.accent} strokeWidth={1.2} />
          ))}
          {map.dots.map((d, i) => (
            <Circle
              key={i}
              cx={d.x}
              cy={d.y}
              r={2.2}
              fill={(d.severity ?? 0) >= 4 ? C.critical : (d.severity ?? 0) >= 3 ? C.warning : C.info}
              fillOpacity={0.85}
            />
          ))}
        </G>
      </Svg>
      <View style={s.mapLegend}>
        <Text>{labels.mapScope}</Text>
        <Text>{labels.mapEvents}</Text>
      </View>
    </View>
  );
}

function sectorsBySeverity(sectors: SaSector[]) {
  return [...sectors]
    .filter((x) => x.severity)
    .sort((a, b) => (SEVERITY_RANK[a.severity!] ?? 9) - (SEVERITY_RANK[b.severity!] ?? 9));
}

/**
 * The situation report (PRD v5, R31): key developments, current status,
 * priority needs, response activities and the scope map, with the version
 * stamp and sources (R32) so every statement stays traceable.
 */
export function ReportDocument({
  data,
  kpis,
  map,
  labels,
  scopeName,
  generatedLabel,
  sections,
}: {
  /** Included sections, in the order the reader chose. */
  sections: ReportSectionKey[];
  data: Analysis;
  kpis: KpiValues;
  map: ReportMap | null;
  labels: ReportLabels;
  scopeName: string;
  generatedLabel: string;
}) {
  const needs = sectorsBySeverity(data.sectors).filter((x) => x.needs.length > 0);
  const response = data.sectors.filter((x) => x.interventions.length > 0);
  const fundingValue =
    kpis.fundingReceived != null
      ? `$${compactNumber(kpis.fundingReceived)}${kpis.fundingRequired != null ? ` / $${compactNumber(kpis.fundingRequired)}` : ""}`
      : kpis.fundingRequired != null
        ? `$${compactNumber(kpis.fundingRequired)}`
        : null;

  const renderSection = (key: ReportSectionKey): React.ReactNode => {
    switch (key) {
      case "keyDevelopments":
        if (!data.summary && data.keyFindings.length === 0) return null;
        return (
          <>
            {data.summary && (
              <Text style={s.para}>
                {clean(data.summary)}
                <Refs refs={data.summaryRefs} />
              </Text>
            )}
            {data.keyFindings.map((f, i) => {
              const { subject, body } = splitSubject(f.text);
              return (
                <Bullet key={i} refs={f.refs}>
                  {subject && <Text style={s.bold}>{clean(subject)}: </Text>}
                  {clean(body)}
                </Bullet>
              );
            })}
          </>
        );
      case "currentStatus":
        return (
          <>
            <View style={s.kpis} wrap={false}>
              <Kpi
                label={labels.displaced}
                value={kpis.displacedTotal != null ? compactNumber(kpis.displacedTotal) : null}
                sub={kpis.displacedTotal != null ? labels.displacedSub : labels.notReported}
              />
              <Kpi
                label={labels.inNeed}
                value={kpis.inNeed ? compactNumber(kpis.inNeed.value) : null}
                sub={kpis.inNeed ? labels.inNeedSub : labels.notReported}
              />
              <Kpi label={labels.funding} value={fundingValue} sub={fundingValue ? labels.fundingSub : labels.notReported} />
            </View>
          </>
        );
      case "map":
        return map ? (
          <>
            <ScopeMapSvg map={map} labels={labels} />
          </>
        ) : null;
      case "contexts":
        if (data.contextRisks.length === 0) return null;
        return (
          <>
            {data.contextRisks.map((r) => (
              <View key={r.key}>
                <Text style={s.h3}>{clean(r.label)}</Text>
                {r.items.map((item, i) => (
                  <Bullet key={i} refs={r.lineRefs[item] ?? []}>
                    {clean(item)}
                  </Bullet>
                ))}
              </View>
            ))}
          </>
        );
      case "hazards":
        if (data.hazards.hazards.length === 0) return null;
        return (
          <>
            <Bullets items={data.hazards.hazards} />
          </>
        );
      case "displacement":
        if (data.displacement.push.length === 0) return null;
        return (
          <>
            <Bullets items={data.displacement.push} />
          </>
        );
      case "priorityNeeds":
        if (needs.length === 0) return null;
        return (
          <>
            <View style={s.gapGrid}>
              {needs.map((x) => (
                <View key={x.id} style={s.gapCard} wrap={false}>
                  <Text style={[s.gapTag, { color: SEVERITY_COLOR[x.severity!] ?? C.muted }]}>
                    {labels.severity(x.severity!).toUpperCase()}
                  </Text>
                  <Text style={s.sectorName}>{clean(x.name)}</Text>
                  {x.needs.slice(0, MAX_SECTOR_LINES).map((n, i) => (
                    <Bullet key={i} refs={x.lineRefs[n] ?? []}>
                      {clean(n)}
                    </Bullet>
                  ))}
                </View>
              ))}
            </View>
          </>
        );
      case "responseActivities":
        return (
          <>
            {response.length === 0 ? (
              <Text style={{ color: C.secondary }}>{labels.noResponse}</Text>
            ) : (
              response.map((x) => (
                <View key={x.id} style={s.sector} wrap={false}>
                  <Text style={s.sectorName}>{clean(x.name)}</Text>
                  {x.interventions.slice(0, MAX_SECTOR_LINES).map((n, i) => (
                    <Bullet key={i} refs={x.lineRefs[n] ?? []}>
                      {clean(n)}
                    </Bullet>
                  ))}
                </View>
              ))
            )}
          </>
        );
      case "outlook": {
        const scenarios = data.scenarios;
        if (!scenarios) return null;
        const cases = (
          [
            [labels.mostLikely, scenarios.mostLikely],
            [labels.bestCase, scenarios.bestCase],
            [labels.worstCase, scenarios.worstCase],
          ] as const
        ).filter((entry): entry is [string, string] => !!entry[1]);
        if (!scenarios.description && cases.length === 0) return null;
        return (
          <>
            {scenarios.description && <Text style={s.para}>{clean(scenarios.description)}</Text>}
            {cases.map(([label, text]) => (
              <View key={label}>
                <Text style={s.bold}>{label}</Text>
                <Text style={s.para}>{clean(text)}</Text>
              </View>
            ))}
            {scenarios.refs.length > 0 && <Refs refs={scenarios.refs} />}
          </>
        );
      }
      case "sources":
        if (data.sources.length === 0) return null;
        {
        const sourceLabels = { event: labels.eventLabel, hapiFigure: labels.hapiFigure };
        const headings = distinctHeadings(data.sources, sourceLabels, (iso) => iso.slice(0, 10));
        return (
          <>
            {data.sources.map((src, i) => {
              const plain = sourceHeading(src, sourceLabels);
              const heading = headings[i] ?? plain;
              const publisher = heading === plain ? readablePublisher(src.publisher) : null;
              return (
              <View key={src.id} style={s.source} wrap={false}>
                <Text style={s.sourceNo}>{i + 1}.</Text>
                <Text style={{ flex: 1 }}>
                  {clean(heading)}
                  {publisher ? ` · ${clean(publisher)}` : ""}
                  {src.url?.startsWith("http") ? (
                    <>
                      {" · "}
                      <Link src={src.url} style={{ color: C.info }}>
                        {clean(src.url)}
                      </Link>
                    </>
                  ) : null}
                </Text>
              </View>
              );
            })}
          </>
        );
        }
      }
  };

  const titled = (key: ReportSectionKey): string => {
    switch (key) {
      case "keyDevelopments":
        return labels.keyDevelopments;
      case "currentStatus":
        return labels.currentStatus;
      case "map":
        return labels.map;
      case "contexts":
        return labels.contexts;
      case "hazards":
        return labels.hazards;
      case "displacement":
        return labels.displacement;
      case "priorityNeeds":
        return labels.priorityNeeds;
      case "responseActivities":
        return labels.responseActivities;
      case "outlook":
        return labels.outlook;
      case "sources":
        return labels.sources;
    }
  };
  const blocks = sections.flatMap((key) => {
    const body = renderSection(key);
    return body ? [{ key, body }] : [];
  });

  return (
    <Document title={clean(`${labels.eyebrow}: ${scopeName}`)} author="CLEAR" creator="CLEAR" producer="CLEAR">
      <Page size="A4" style={s.page}>
        <View style={s.band} fixed />
        <View style={s.running} fixed>
          <Text style={s.runningText}>{labels.org}</Text>
          <Text style={s.runningText}>{labels.classification}</Text>
        </View>
        <Text style={s.eyebrow}>{labels.eyebrow}</Text>
        <Text style={s.title}>{clean(scopeName)}</Text>
        <Text style={s.meta}>
          {labels.scopeKind} · {labels.period}
        </Text>
        <Text style={s.meta}>{labels.versionOf}</Text>
        <View style={s.rule} />

        {blocks.map((block, i) => (
          <View key={block.key}>
            <Text style={s.h2}>
              {i + 1}. {titled(block.key)}
            </Text>
            {block.body}
          </View>
        ))}

        <View style={s.provenance} wrap={false}>
          <Text style={s.bold}>{labels.provenance}</Text>
          <Text>{labels.disclaimer}</Text>
          <Text>{generatedLabel}</Text>
          <Text>
            {labels.versionOf} · ID {data.id}
          </Text>
        </View>

        <View style={s.footer} fixed>
          <Text>{labels.footer}</Text>
          <Text render={({ pageNumber, totalPages }) => labels.page(pageNumber, totalPages)} />
        </View>
      </Page>
    </Document>
  );
}
