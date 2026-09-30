import { Circle, ClipPath, Defs, Document, G, Link, Page, Path, Rect, StyleSheet, Svg, Text, View } from "@react-pdf/renderer";
import type { Analysis } from "~/server/api/mappers/analysis";
import type { SaBullet, SaSector } from "~/server/api/mappers/situation-analysis";
import { compactNumber } from "~/server/api/mappers/situation-analysis";
import { splitSubject, type KpiValues } from "~/lib/analysis-view";
import { pdfSafe, type ReportMap, type ReportSectionKey } from "~/lib/analysis-report";

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
  page: { paddingTop: 36, paddingBottom: 48, paddingHorizontal: 40, fontSize: 9.5, color: C.ink, fontFamily: "Helvetica", lineHeight: 1.45 },
  eyebrow: { fontSize: 8, color: C.accent, fontFamily: "Helvetica-Bold", letterSpacing: 1, textTransform: "uppercase" },
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
  kpis: { flexDirection: "row", gap: 8, marginTop: 4 },
  kpi: { flex: 1, borderWidth: 1, borderColor: C.border, padding: 8 },
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
  provenance: { marginTop: 14, padding: 8, backgroundColor: C.bgMuted, fontSize: 7.5, color: C.secondary },
  footer: { position: "absolute", bottom: 20, left: 40, right: 40, flexDirection: "row", justifyContent: "space-between", fontSize: 7, color: C.muted },
});

export interface ReportLabels {
  eyebrow: string;
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
  sources: string;
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
            <Text style={s.h2}>{labels.keyDevelopments}</Text>
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
            <Text style={s.h2}>{labels.currentStatus}</Text>
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
            <Text style={s.h2}>{labels.map}</Text>
            <ScopeMapSvg map={map} labels={labels} />
          </>
        ) : null;
      case "contexts":
        if (data.contextRisks.length === 0) return null;
        return (
          <>
            <Text style={s.h2}>{labels.contexts}</Text>
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
            <Text style={s.h2}>{labels.hazards}</Text>
            <Bullets items={data.hazards.hazards} />
          </>
        );
      case "displacement":
        if (data.displacement.push.length === 0) return null;
        return (
          <>
            <Text style={s.h2}>{labels.displacement}</Text>
            <Bullets items={data.displacement.push} />
          </>
        );
      case "priorityNeeds":
        if (needs.length === 0) return null;
        return (
          <>
            <Text style={s.h2}>{labels.priorityNeeds}</Text>
            {needs.map((x) => (
              <View key={x.id} style={s.sector} wrap={false}>
                <View style={s.sectorHead}>
                  <Text style={s.sectorName}>{clean(x.name)}</Text>
                  <Text style={[s.pill, { backgroundColor: SEVERITY_COLOR[x.severity!] ?? C.muted }]}>
                    {labels.severity(x.severity!)}
                  </Text>
                </View>
                {x.needs.slice(0, MAX_SECTOR_LINES).map((n, i) => (
                  <Bullet key={i} refs={x.lineRefs[n] ?? []}>
                    {clean(n)}
                  </Bullet>
                ))}
              </View>
            ))}
          </>
        );
      case "responseActivities":
        return (
          <>
            <Text style={s.h2}>{labels.responseActivities}</Text>
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
      case "outlook":
        return data.scenarios?.mostLikely ? (
          <>
            <Text style={s.h2}>{labels.outlook}</Text>
            <Text style={s.para}>
              {clean(data.scenarios.mostLikely)}
              <Refs refs={data.scenarios.refs} />
            </Text>
          </>
        ) : null;
      case "sources":
        if (data.sources.length === 0) return null;
        return (
          <>
            <Text style={s.h2}>{labels.sources}</Text>
            {data.sources.map((src, i) => (
              <View key={src.id} style={s.source} wrap={false}>
                <Text style={s.sourceNo}>{i + 1}.</Text>
                <Text style={{ flex: 1 }}>
                  {clean(src.title)}
                  {src.publisher ? ` · ${clean(src.publisher)}` : ""}
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
            ))}
          </>
        );
    }
  };

  return (
    <Document title={clean(`${labels.eyebrow}: ${scopeName}`)} author="CLEAR" creator="CLEAR" producer="CLEAR">
      <Page size="A4" style={s.page}>
        <Text style={s.eyebrow}>{labels.eyebrow}</Text>
        <Text style={s.title}>{clean(scopeName)}</Text>
        <Text style={s.meta}>
          {labels.scopeKind} · {labels.period} · {labels.versionOf}
        </Text>
        <View style={s.rule} />

        {sections.map((key) => (
          <View key={key}>{renderSection(key)}</View>
        ))}

        <View style={s.provenance} wrap={false}>
          <Text style={s.bold}>{labels.provenance}</Text>
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
