import { Document, Link, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { pdfSafe } from "~/lib/analysis-report";
import { parseMarkdownLite, type InlineSpan } from "~/lib/brief/markdown-lite";
import type { BriefView, CountRow, SeverityKey, ViewItem } from "~/lib/brief/view";
import type { BriefTextLabels } from "~/lib/brief/clipboard";

/**
 * The PDF can't read the app's CSS variables, so this mirrors the light-theme
 * design tokens from globals.css, as the Insights report does (a printed
 * Brief is always light).
 */
const C = {
  ink: "#171717", // --color-text-primary
  secondary: "#525252", // --color-text-secondary
  muted: "#737373", // --color-text-muted
  border: "#E5E5E5", // --color-border
  bgMuted: "#F5F5F5", // --color-bg-muted
  accent: "#E85D3D", // --color-accent
  critical: "#DC2626", // --color-critical
  warning: "#D97706", // --color-warning
  info: "#2563EB", // --color-info
  success: "#059669", // --color-success
};

const SEVERITY_COLOR: Record<SeverityKey, string> = {
  critical: C.critical,
  high: C.warning,
  medium: C.warning,
  low: C.success,
  unknown: C.muted,
};

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
  h3: { fontSize: 9, fontFamily: "Helvetica-Bold", color: C.secondary, textTransform: "uppercase", letterSpacing: 0.6, marginTop: 8, marginBottom: 4 },
  para: { marginBottom: 6 },
  empty: { color: C.muted },
  bulletRow: { flexDirection: "row", marginBottom: 3 },
  bulletDot: { width: 10, color: C.muted },
  bulletText: { flex: 1 },
  bold: { fontFamily: "Helvetica-Bold" },
  italic: { fontFamily: "Helvetica-Oblique" },
  countRow: { flexDirection: "row", borderTopWidth: 1, borderTopColor: C.border, paddingVertical: 5 },
  countLabel: { width: 70, fontFamily: "Helvetica-Bold" },
  countTotal: { width: 36, fontFamily: "Helvetica-Bold", textAlign: "right", marginRight: 10 },
  countDetail: { flex: 1, color: C.secondary },
  item: { marginBottom: 6, padding: 8, backgroundColor: C.bgMuted, borderLeftWidth: 3, borderLeftColor: C.accent },
  itemTitle: { fontFamily: "Helvetica-Bold", fontSize: 10, color: C.ink, textDecoration: "none" },
  itemMeta: { fontSize: 8, color: C.secondary, marginTop: 2 },
  earlier: { fontSize: 8, color: C.info, fontFamily: "Helvetica-Bold" },
  note: { marginTop: 4 },
  // An explicit height keeps the fixed footer from growing page after page (see report-document.tsx).
  footer: { position: "absolute", bottom: 20, left: 40, right: 40, height: 12, flexDirection: "row", justifyContent: "space-between", fontSize: 7, color: C.muted },
});

/** The section wording shared with the clipboard copy, plus the PDF's own chrome. */
export interface BriefDocumentLabels extends BriefTextLabels {
  /** "Daily Brief". */
  eyebrow: string;
  org: string;
  classification: string;
  footer: string;
  generated: string;
  page: (n: number, total: number) => string;
}

const clean = (t: string) => pdfSafe(t);

function Spans({ spans }: { spans: InlineSpan[] }) {
  return (
    <>
      {spans.map((span, i) => {
        const style = [span.bold ? s.bold : {}, span.italic ? s.italic : {}];
        return span.href ? (
          <Link key={i} src={span.href} style={[...style, { color: C.info }]}>
            {clean(span.text)}
          </Link>
        ) : (
          <Text key={i} style={style}>
            {clean(span.text)}
          </Text>
        );
      })}
    </>
  );
}

/** Markdown-lite in the PDF: the same parse as the composer preview and the clipboard copy. */
function Markdown({ text, none }: { text: string; none?: string }) {
  const blocks = parseMarkdownLite(text);
  if (blocks.length === 0) return none ? <Text style={[s.para, s.empty]}>{none}</Text> : null;
  return (
    <>
      {blocks.map((block, i) =>
        block.type === "paragraph" ? (
          <Text key={i} style={s.para}>
            {block.lines.map((line, j) => (
              <Text key={j}>
                {j > 0 ? "\n" : ""}
                <Spans spans={line} />
              </Text>
            ))}
          </Text>
        ) : (
          <View key={i} style={{ marginBottom: 6 }}>
            {block.items.map((item, j) => (
              <View key={j} style={s.bulletRow} wrap={false}>
                <Text style={s.bulletDot}>•</Text>
                <Text style={s.bulletText}>
                  <Spans spans={item} />
                </Text>
              </View>
            ))}
          </View>
        ),
      )}
    </>
  );
}

function Counts({ rows, labels }: { rows: CountRow[]; labels: BriefDocumentLabels }) {
  return (
    <View>
      {rows.map((row) => {
        const severity = row.bySeverity.map((b) => `${b.label} ${b.count}`).join(", ");
        const types = row.byType.map((b) => `${b.label} ${b.count}`).join(", ") + (row.moreTypes > 0 ? `, ${labels.more(row.moreTypes)}` : "");
        return (
          <View key={row.kind} style={s.countRow} wrap={false}>
            <Text style={s.countLabel}>{clean(row.label)}</Text>
            <Text style={s.countTotal}>{row.total}</Text>
            <Text style={s.countDetail}>
              {severity ? clean(severity) : labels.none}
              {row.byType.length > 0 ? `\n${row.kind === "signal" ? labels.sources : labels.types}: ${clean(types)}` : ""}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

function Item({ item }: { item: ViewItem }) {
  const meta = [item.locationName, item.types.join(", ") || null, item.occurredLabel].filter(Boolean).join(" · ");
  return (
    <View style={s.item} wrap={false}>
      {item.url.startsWith("http") ? (
        <Link src={item.url} style={s.itemTitle}>
          {clean(item.title)}
        </Link>
      ) : (
        <Text style={s.itemTitle}>{clean(item.title)}</Text>
      )}
      <Text style={s.itemMeta}>
        <Text style={{ color: SEVERITY_COLOR[item.severity], fontFamily: "Helvetica-Bold" }}>{clean(item.severityLabel.toUpperCase())}</Text>
        {meta ? ` · ${clean(meta)}` : ""}
        {item.earlier ? <Text style={s.earlier}> · {clean(item.earlier)}</Text> : null}
      </Text>
      {item.note && (
        <View style={s.note}>
          <Markdown text={item.note} />
        </View>
      )}
    </View>
  );
}

/**
 * A Brief as a PDF: the same sections and items as the composer and the
 * email, in the same order, from `toBriefView`. A4, Helvetica, laid out like
 * the Insights situation report (band, running header, numbered sections,
 * page n of total).
 */
export function BriefDocument({ view, labels }: { view: BriefView; labels: BriefDocumentLabels }) {
  return (
    <Document title={clean(view.title)} author="CLEAR" creator="CLEAR" producer="CLEAR">
      <Page size="A4" style={s.page}>
        <View style={s.band} fixed />
        <View style={s.running} fixed>
          <Text style={s.runningText}>{labels.org}</Text>
          <Text style={s.runningText}>{labels.classification}</Text>
        </View>
        <Text style={s.eyebrow}>{labels.eyebrow}</Text>
        <Text style={s.title}>{clean(view.title)}</Text>
        <Text style={s.meta}>
          {clean(view.areaName)} · {clean(view.windowLabel)}
        </Text>
        <View style={s.rule} />

        <Text style={s.h2}>1. {labels.summary}</Text>
        <Markdown text={view.summary} none={labels.none} />

        <Text style={s.h2}>2. {labels.counts}</Text>
        <Counts rows={view.counts} labels={labels} />

        <Text style={s.h2}>3. {labels.items}</Text>
        {view.groups.map((group) => (
          <View key={group.kind}>
            <Text style={s.h3}>
              {clean(group.label)} ({group.items.length})
            </Text>
            {group.items.length === 0 ? (
              <Text style={[s.para, s.empty]}>{labels.none}</Text>
            ) : (
              group.items.map((item) => <Item key={item.id} item={item} />)
            )}
          </View>
        ))}

        <Text style={s.h2}>4. {labels.closingNotes}</Text>
        <Markdown text={view.closingNotes} none={labels.none} />

        <Text style={[s.meta, { marginTop: 16 }]}>{labels.generated}</Text>

        <View style={s.footer} fixed>
          <Text>{labels.footer}</Text>
          <Text render={({ pageNumber, totalPages }) => labels.page(pageNumber, totalPages)} />
        </View>
      </Page>
    </Document>
  );
}
