"use client";

import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { useFormatter, useNow, useTranslations } from "next-intl";
import {
  IconAlertTriangle,
  IconArrowBarRight,
  IconChevronDown,
  IconClock,
  IconCopy,
  IconInfoCircle,
  IconShield,
  IconSparkles,
  IconTimeline,
  IconWorld,
  IconX,
} from "@tabler/icons-react";
import { compactNumber, type SaBullet, type SaSource } from "~/server/api/mappers/situation-analysis";
import type { Analysis, AnalysisEvents, AnalysisFigures } from "~/server/api/mappers/analysis";
import { fundingSplit, kpiValues, splitSubject, timelineLayout } from "~/lib/analysis-view";
import { Citations } from "../../situation/citations";
import { planSentenceSegments, planSummaryParagraphs, leadSentences } from "../../situation/summary-citations";
import { ScopeMap } from "../scope-map";
import { SectionChange } from "../../situation/section-change";
import styles from "./analysis-dark.module.css";
import { CHANGE_ANCHOR, type ChangeSection } from "./change-notes";

const PREVIEW = 4;

function Updated({ label }: { label: string }) {
  return (
    <span className={styles.updated}>
      <span className={styles.freshDot} style={{ background: "var(--sa-accent)", boxShadow: "inset 0 0 0 1.5px var(--sa-accent)" }} />
      {label}
    </span>
  );
}

export function AnalysisHeader({
  eyebrow,
  name,
  updated,
  stale,
  staleLabel,
  period,
  asOf,
  builtFrom,
  chips,
  loose,
  seen,
  onDismiss,
  onJump,
  onOpenSources,
  actions,
}: {
  eyebrow: string;
  name: string;
  updated: string;
  stale: boolean;
  staleLabel: string;
  period: string;
  asOf: string | null;
  builtFrom: string;
  chips: { section: ChangeSection; note: string }[];
  loose: { key: string; note: string }[];
  seen: boolean;
  onDismiss: () => void;
  onJump: (section: ChangeSection) => void;
  onOpenSources: () => void;
  actions: ReactNode;
}) {
  const t = useTranslations("analysis.layout");
  const showChanges = !seen && (chips.length > 0 || loose.length > 0);

  return (
    <header className={styles.header}>
      <div className={styles.eyebrowRow}>
        <span className={styles.eyebrow}>{eyebrow}</span>
        <div className={styles.actions}>{actions}</div>
      </div>
      <h1 className={styles.title}>{name}</h1>
      <div className={styles.meta} data-testid="analysis-meta">
        <span className={stale ? `${styles.fresh} ${styles.stale}` : styles.fresh}>
          <span className={styles.freshDot} />
          {updated}
        </span>
        {stale && (
          <span className={`${styles.fresh} ${styles.stale}`} data-testid="analysis-stale">
            {staleLabel}
          </span>
        )}
        <span>{period}</span>
        {asOf && <span>{asOf}</span>}
        <button type="button" className={styles.link} onClick={onOpenSources}>
          {builtFrom}
        </button>
      </div>
      {showChanges && (
        <section className={styles.changes} aria-label={t("changes")} data-testid="analysis-changes">
          <div className={styles.changesHead}>
            <span className={styles.kicker}>{t("changes")}</span>
            <button type="button" className={styles.iconButton} aria-label={t("dismissChanges")} onClick={onDismiss}>
              <IconX size={15} />
            </button>
          </div>
          {chips.length > 0 && (
            <div className={styles.chips}>
              {chips.map((chip) => (
                <button key={chip.section} type="button" className={styles.chip} title={chip.note} onClick={() => onJump(chip.section)}>
                  {t(`sections.${chip.section}`)}
                </button>
              ))}
            </div>
          )}
          {loose.map((row) => (
            <p key={row.key} className={styles.loose}>
              {row.note}
            </p>
          ))}
        </section>
      )}
    </header>
  );
}

function Fold({
  id,
  title,
  meta,
  icon,
  defaultOpen,
  updated,
  updatedLabel,
  testId,
  className,
  flush,
  children,
}: {
  id: string;
  title: string;
  meta: string;
  icon: ReactNode;
  defaultOpen: boolean;
  updated?: boolean;
  updatedLabel: string;
  testId: string;
  className?: string;
  /** Drop the body inset so a split panel can reach the card edges. */
  flush?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section id={id} className={className ?? styles.card} data-testid={testId}>
      <button type="button" className={styles.sectionButton} aria-expanded={open} onClick={() => setOpen((value) => !value)}>
        <span className={styles.sectionIcon}>{icon}</span>
        <span style={{ display: "flex", flexDirection: "column", gap: 2, flex: 1, minWidth: 0 }}>
          <span style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
            <span className={styles.sectionTitle}>{title}</span>
            {updated && <Updated label={updatedLabel} />}
          </span>
          <span className={styles.sectionMeta}>{meta}</span>
        </span>
        <span className={styles.chev} style={{ transform: open ? "rotate(180deg)" : undefined }}>
          <IconChevronDown size={16} />
        </span>
      </button>
      {open && <div className={flush ? styles.sectionBodyFlush : styles.sectionBody}>{children}</div>}
    </section>
  );
}

function Cited({
  text,
  refs,
  sources,
  onOpen,
}: {
  text: string;
  refs: number[];
  sources: SaSource[];
  onOpen: () => void;
}) {
  return (
    <>
      {text}
      {refs.length > 0 && (
        <>
          {" "}
          <Citations refs={refs} sources={sources} onOpen={onOpen} variant="inline" />
        </>
      )}
    </>
  );
}

function BulletList({
  items,
  sources,
  onOpen,
}: {
  items: SaBullet[];
  sources: SaSource[];
  onOpen: () => void;
}) {
  const t = useTranslations("analysis.findings");
  const [all, setAll] = useState(false);
  const shown = all ? items : items.slice(0, PREVIEW);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div className={styles.itemGrid}>
        {shown.map((item, i) => {
          const { subject, body } = splitSubject(item.text);
          return (
            <div key={i} className={styles.item}>
              <div>
                <div className={styles.itemTitle}>{subject ?? item.text}</div>
                {subject && (
                  <div className={styles.itemText}>
                    <Cited text={body} refs={item.refs} sources={sources} onOpen={onOpen} />
                  </div>
                )}
                {!subject && item.refs.length > 0 && (
                  <div className={styles.itemText}>
                    <Citations refs={item.refs} sources={sources} onOpen={onOpen} variant="inline" />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {items.length > PREVIEW && (
        <button type="button" className={styles.more} aria-expanded={all} onClick={() => setAll((value) => !value)}>
          {all ? t("showLess") : t("showAll", { count: items.length })}
          <IconChevronDown size={14} style={{ transform: all ? "rotate(180deg)" : undefined }} />
        </button>
      )}
    </div>
  );
}

export function AnalysisOverview({
  data,
  figures,
  events,
  scopeName,
  countryId,
  countryName,
  areaIds,
  isCountry,
  onOpenSources,
  noteFor,
}: {
  data: Analysis;
  figures: AnalysisFigures | undefined;
  events: AnalysisEvents | undefined;
  scopeName: string;
  countryId: string;
  countryName: string;
  areaIds: string[];
  isCountry: boolean;
  onOpenSources: () => void;
  noteFor: (section: ChangeSection) => string | undefined;
}) {
  const t = useTranslations("analysis");
  const format = useFormatter();
  const now = useNow({ updateInterval: 60_000 });
  const [sumOpen, setSumOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [needInfo, setNeedInfo] = useState(false);
  const [displacedInfo, setDisplacedInfo] = useState(false);
  const [riskKey, setRiskKey] = useState<string | null>(null);
  const updatedLabel = t("layout.updated");

  const values = kpiValues(data, figures);
  const pct = (n: number) => format.number(n, { style: "percent" });
  const pin = values.inNeed;
  const hasBand = !!pin && pin.low != null && pin.high != null && pin.high > pin.low;
  const sectorRows = (figures?.pinBySector ?? []).map((row) => ({
    label: t(`kpis.sectors.${row.sector}`),
    value: row.figure.value,
  }));
  const sectorMax = Math.max(pin?.value ?? 0, ...sectorRows.map((row) => row.value), 1);
  const split = fundingSplit(values.fundingReceived, values.fundingRequired);

  const preview = data.summary ? leadSentences(data.summary, 2) : null;
  const summaryText = data.summary && preview && !sumOpen && preview.truncated ? preview.lead : data.summary;
  const findings = data.keyFindings;

  const risks = data.contextRisks;
  const selected = risks.find((risk) => risk.key === riskKey) ?? risks[0];
  const findingCount = risks.reduce((n, risk) => n + risk.items.length, 0);

  const timeline = useMemo(() => {
    if (isCountry || !events) return null;
    return timelineLayout(events.items, new Date(data.scope.windowStart), now);
  }, [isCountry, events, data.scope.windowStart, now]);

  const copySummary = async () => {
    if (!data.summary) return;
    try {
      await navigator.clipboard.writeText(data.summary);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className={styles.stack}>
      {(data.summary || findings.length > 0) && (
        <section id={CHANGE_ANCHOR.summary} className={styles.summary} data-testid="analysis-summary">
          <div className={styles.summaryGrid}>
            <div className={styles.summaryBody}>
              <div className={styles.summaryTop}>
                <span style={{ display: "inline-flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  <span className={styles.badge}>
                    <IconSparkles size={12} />
                    {t("layout.summary")}
                  </span>
                  {noteFor("summary") && <Updated label={updatedLabel} />}
                </span>
                {data.summary && (
                  <button type="button" className={styles.iconButton} aria-label={t("layout.copySummary")} onClick={() => void copySummary()}>
                    <IconCopy size={15} />
                  </button>
                )}
              </div>
              {copied && <span className={styles.sectionMeta}>{t("layout.copied")}</span>}
              {summaryText &&
                planSummaryParagraphs(summaryText, data.summaryLineRefs).map((para, i) => {
                  const segments = planSentenceSegments(para, data.summaryLineRefs);
                  return (
                    <p key={i} className={i === 0 && !sumOpen ? styles.lead : styles.prose}>
                      {segments
                        ? segments.map((seg, j) =>
                            seg.kind === "text" ? (
                              seg.text
                            ) : (
                              <Citations key={j} refs={seg.refs} sources={data.sources} onOpen={onOpenSources} variant="inline" />
                            ),
                          )
                        : para}
                    </p>
                  );
                })}
              {sumOpen && <SectionChange note={noteFor("summary")} />}
            </div>
            {findings.length > 0 && (
              <aside className={styles.rail} aria-label={t("layout.highlights")} data-testid="analysis-highlights">
                <span className={styles.railLabel}>{t("layout.highlights")}</span>
                {findings.map((finding, i) => {
                  const { subject, body } = splitSubject(finding.text);
                  return (
                    <div key={i}>
                      <div className={styles.railButton}>
                        <span className={styles.dot} />
                        <span className={styles.railTitle}>{subject ?? finding.text}</span>
                      </div>
                      {sumOpen && (
                        <div className={styles.railContext}>
                          <Cited text={subject ? body : finding.text} refs={finding.refs} sources={data.sources} onOpen={onOpenSources} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </aside>
            )}
          </div>
          {(preview?.truncated || findings.length > 0) && (
            <div className={styles.expandRow}>
              <button type="button" className={styles.expand} data-testid="summary-toggle" aria-expanded={sumOpen} onClick={() => setSumOpen((open) => !open)}>
                {sumOpen ? t("layout.collapseSummary") : t("layout.expandSummary")}
                <IconChevronDown size={14} style={{ transform: sumOpen ? "rotate(180deg)" : undefined }} />
              </button>
            </div>
          )}
        </section>
      )}

      {(values.displacedTotal != null ||
        values.returned != null ||
        pin != null ||
        values.fundingReceived != null ||
        values.fundingRequired != null ||
        sectorRows.length > 0) && (
      <section id={CHANGE_ANCHOR.figures} aria-label={t("layout.sections.figures")} data-testid="analysis-figures">
        <div className={styles.figures}>
        <article className={styles.figure}>
          <div className={styles.figureHead}>
            <span className={styles.figureLabel}>{t("kpis.displaced")}</span>
            {values.inside != null && values.abroad != null && (
              <button type="button" className={styles.iconButton} aria-expanded={displacedInfo} aria-label={t("layout.howToRead")} onClick={() => setDisplacedInfo((open) => !open)}>
                <IconInfoCircle size={15} />
              </button>
            )}
          </div>
          {displacedInfo && <div className={styles.note}>{t("kpis.differentDates")}</div>}
          {values.displacedTotal != null ? (
            <>
              <div>
                <div className={styles.headline}>{compactNumber(values.displacedTotal)}</div>
                <div className={styles.sub}>
                  {values.abroad != null ? t("kpis.displacedTotalSub", { scope: scopeName }) : t("kpis.displacedSub")}
                </div>
              </div>
              {values.inside != null && values.abroad != null && (
                <>
                  <div className={styles.split}>
                    <div className={styles.splitA} style={{ width: `${(values.inside / values.displacedTotal) * 100}%` }} />
                    <div className={styles.splitB} style={{ width: `${(values.abroad / values.displacedTotal) * 100}%` }} />
                  </div>
                  <div className={styles.legend}>
                    <span>
                      <i className={styles.swatch} style={{ background: "var(--sa-accent)" }} />
                      {t("kpis.inside", { scope: scopeName })} {compactNumber(values.inside)} {pct(values.inside / values.displacedTotal)}
                    </span>
                    <span>
                      <i className={styles.swatch} style={{ background: "var(--sa-split-b)" }} />
                      {t("kpis.abroad")} {compactNumber(values.abroad)} {pct(values.abroad / values.displacedTotal)}
                    </span>
                  </div>
                </>
              )}
            </>
          ) : (
            <div className={styles.sub}>{t("kpis.notReported")}</div>
          )}
          {values.returned != null && (
            <div className={styles.subsection}>
              <span className={styles.figureLabel}>{t("kpis.returned")}</span>
              <div>
                <span className={styles.count}>{compactNumber(values.returned)}</span>
                <div className={styles.sub}>{t("kpis.returnedSub")}</div>
              </div>
            </div>
          )}
        </article>

        <article className={styles.figure}>
          <div className={styles.figureHead}>
            <span className={styles.figureLabel}>{t("kpis.inNeed")}</span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              {noteFor("figures") && <Updated label={updatedLabel} />}
              <button type="button" className={styles.iconButton} aria-expanded={needInfo} aria-label={t("layout.howToRead")} onClick={() => setNeedInfo((open) => !open)}>
                <IconInfoCircle size={15} />
              </button>
            </span>
          </div>
          {needInfo && <div className={styles.note}>{t("kpis.sectorOverlap", { total: pin ? compactNumber(pin.value) : "" })}</div>}
          {pin ? (
            <>
              <div>
                <div className={styles.headline}>{compactNumber(pin.value)}</div>
                <div className={styles.sub}>{t("kpis.inNeedSub")}</div>
              </div>
              {hasBand && (
                <>
                  <div className={styles.track} style={{ position: "relative", height: 8 }}>
                    <div
                      style={{
                        position: "absolute",
                        left: `${((pin.low ?? pin.value) / (pin.high! * 1.05)) * 100}%`,
                        right: `${100 - (pin.high! / (pin.high! * 1.05)) * 100}%`,
                        top: 0,
                        bottom: 0,
                        borderRadius: 999,
                        background:
                          "linear-gradient(90deg, color-mix(in srgb, var(--sa-accent) 25%, transparent), color-mix(in srgb, var(--sa-accent) 60%, transparent))",
                      }}
                    />
                  </div>
                  <div className={styles.legend}>
                    <span>
                      {t("kpis.rangeLabel")} {compactNumber(pin.low!)} – {compactNumber(pin.high!)}
                    </span>
                    <span>{t("kpis.headline")}</span>
                  </div>
                </>
              )}
            </>
          ) : (
            <div className={styles.sub}>{t("kpis.notReported")}</div>
          )}
          {sectorRows.length > 0 && (
            <div className={styles.subsection}>
              <span className={styles.figureLabel}>{t("kpis.bySector")}</span>
              {sectorRows.map((row) => (
                <div key={row.label} className={styles.barRow}>
                  <span style={{ color: "var(--sa-secondary)" }}>{row.label}</span>
                  <div className={styles.track}>
                    <div className={styles.bar} style={{ width: `${Math.min(row.value / sectorMax, 1) * 100}%` }} />
                  </div>
                  <span>{compactNumber(row.value)}</span>
                </div>
              ))}
            </div>
          )}
        </article>

        <article className={styles.figure}>
          <div className={styles.figureHead}>
            <span className={styles.figureLabel}>{t("kpis.funding")}</span>
          </div>
          {values.fundingReceived != null ? (
            <div>
              <div className={styles.headline}>
                ${compactNumber(values.fundingReceived)}{" "}
                {values.fundingRequired != null && (
                  <span className={styles.suffix}>{t("kpis.fundingOf", { required: `$${compactNumber(values.fundingRequired)}` })}</span>
                )}
              </div>
              <div className={styles.sub}>{t("kpis.fundingSub")}</div>
            </div>
          ) : values.fundingRequired != null ? (
            <div>
              <div className={styles.headline}>${compactNumber(values.fundingRequired)}</div>
              <div className={styles.sub}>{t("kpis.fundingRequiredSub")}</div>
            </div>
          ) : (
            <div className={styles.sub}>{t("kpis.notReported")}</div>
          )}
          {split && values.fundingReceived != null && (
            <>
              <div className={styles.split}>
                <div className={styles.splitA} style={{ width: `${split.receivedShare * 100}%` }} />
                <div className={styles.gapFill} style={{ width: `${split.gapShare * 100}%` }} />
              </div>
              <div className={styles.legend}>
                <span>
                  {t("kpis.received")} ${compactNumber(values.fundingReceived)} {pct(split.receivedShare)}
                </span>
                <span>
                  {t("kpis.gap")} ${compactNumber(split.gap)} {pct(split.gapShare)}
                </span>
              </div>
            </>
          )}
        </article>
        </div>
        <SectionChange note={noteFor("figures")} />
      </section>
      )}

      <ScopeMap
        countryId={countryId}
        countryName={countryName}
        scopeName={scopeName}
        areaIds={areaIds}
        since={data.scope.windowStart}
        events={events}
      />

      {!isCountry && timeline && timeline.dots.length > 0 && (
        <Fold
          id="analysis-timeline"
          title={t("timeline.title")}
          meta={t("map.areaEvents", { count: events?.totalCount ?? timeline.dots.length })}
          icon={<IconTimeline size={18} />}
          defaultOpen
          updatedLabel={updatedLabel}
          testId="analysis-section-timeline"
        >
          <div dir="ltr" data-testid="analysis-timeline" style={{ position: "relative", height: 72 }}>
              <div style={{ position: "absolute", left: 0, right: 0, top: 22, height: 2, background: "var(--sa-timeline)" }} />
              {timeline.months.map((month) => (
                <span
                  key={month.label.toISOString()}
                  style={{ position: "absolute", left: `${month.x * 100}%`, top: 32, fontSize: 11, color: "var(--sa-muted)" }}
                >
                  {format.dateTime(month.label, { month: "short" })}
                </span>
              ))}
              <span style={{ position: "absolute", right: 0, top: 32, fontSize: 11, color: "var(--sa-accent)" }}>{t("timeline.today")}</span>
              {timeline.dots.map(({ event, x }) => (
                <Link
                  key={event.id}
                  href={`/event/${event.id}`}
                  aria-label={event.title ?? t("events.untitled")}
                  style={{
                    position: "absolute",
                    left: `${x * 100}%`,
                    top: 17,
                    width: 10,
                    height: 10,
                    borderRadius: "50%",
                    transform: "translateX(-50%)",
                    background: "var(--sa-card)",
                    border: "2px solid var(--sa-accent)",
                  }}
                />
              ))}
          </div>
          {timeline.highlights.length > 0 && (
            <div className={styles.itemGrid} style={{ marginTop: 16 }}>
              {timeline.highlights.map(({ event }) => (
                <Link key={event.id} href={`/event/${event.id}`} className={styles.finding} style={{ textDecoration: "none" }}>
                  <span className={styles.tag}>
                    {format.dateTime(new Date(event.startedAt), { day: "numeric", month: "short" })}
                  </span>
                  <span className={styles.findingText}>{event.title ?? t("events.untitled")}</span>
                </Link>
              ))}
            </div>
          )}
        </Fold>
      )}

      {risks.length > 0 && selected && (
        <Fold
          id={CHANGE_ANCHOR.contexts}
          title={t("contexts.title")}
          meta={t("contexts.meta", { categories: risks.length, findings: findingCount })}
          icon={<IconWorld size={18} />}
          defaultOpen
          updated={!!noteFor("contexts")}
          updatedLabel={updatedLabel}
          testId="analysis-section-contexts"
          flush
        >
          <div className={styles.catLayout}>
            <div className={styles.catList} role="tablist" aria-label={t("contexts.title")}>
              {risks.map((risk) => (
                <button
                  key={risk.key}
                  type="button"
                  role="tab"
                  aria-selected={risk.key === selected.key}
                  className={styles.catButton}
                  data-testid={`analysis-risk-${risk.key}`}
                  onClick={() => setRiskKey(risk.key)}
                >
                  <span style={{ flex: 1 }}>{risk.label}</span>
                  <span className={styles.countPill}>{risk.items.length}</span>
                </button>
              ))}
            </div>
            <div className={styles.findings} role="tabpanel">
              <div>
                <div className={styles.sectionTitle}>{selected.label}</div>
                <div className={styles.sectionMeta}>{t("contexts.findings", { count: selected.items.length })}</div>
              </div>
              <div className={styles.findingGrid}>
                {selected.items.map((item, i) => {
                  const { subject, body } = splitSubject(item);
                  const refs = selected.lineRefs[item.trim()] ?? (Object.keys(selected.lineRefs).length > 0 ? [] : selected.refs);
                  return (
                    <div key={i} className={styles.finding}>
                      {subject && <span className={styles.tag}>{subject}</span>}
                      <div className={styles.findingText}>
                        <Cited text={subject ? body : item} refs={refs} sources={data.sources} onOpen={onOpenSources} />
                      </div>
                    </div>
                  );
                })}
              </div>
              <SectionChange note={noteFor("contexts")} />
            </div>
          </div>
        </Fold>
      )}

      {data.hazards.hazards.length > 0 && (
        <Fold
          id={CHANGE_ANCHOR.hazards}
          title={t("findings.hazards")}
          meta={t("findings.count", { count: data.hazards.hazards.length })}
          icon={<IconAlertTriangle size={18} />}
          defaultOpen={false}
          updated={!!noteFor("hazards")}
          updatedLabel={updatedLabel}
          testId="analysis-section-hazards"
        >
          <BulletList items={data.hazards.hazards} sources={data.sources} onOpen={onOpenSources} />
          <SectionChange note={noteFor("hazards")} />
        </Fold>
      )}

      {data.hazards.vulnerabilities.length > 0 && (
        <Fold
          id={CHANGE_ANCHOR.vulnerabilities}
          title={t("findings.vulnerabilities")}
          meta={t("layout.vulnerabilitiesMeta", { count: data.hazards.vulnerabilities.length })}
          icon={<IconShield size={18} color="var(--sa-warning-text)" />}
          defaultOpen={false}
          updated={!!noteFor("vulnerabilities")}
          updatedLabel={updatedLabel}
          testId="analysis-section-vulnerabilities"
        >
          <BulletList items={data.hazards.vulnerabilities} sources={data.sources} onOpen={onOpenSources} />
          <SectionChange note={noteFor("vulnerabilities")} />
        </Fold>
      )}

      {(data.displacement.push.length > 0 || data.displacement.return.length > 0) && (
        <Fold
          id={CHANGE_ANCHOR.displacement}
          title={t("findings.displacement")}
          meta={t("findings.count", { count: data.displacement.push.length + data.displacement.return.length })}
          icon={<IconArrowBarRight size={18} color="var(--sa-info)" />}
          defaultOpen={false}
          updated={!!noteFor("displacement")}
          updatedLabel={updatedLabel}
          testId="analysis-section-displacement"
        >
          <ol className={styles.story}>
            {[...data.displacement.push, ...data.displacement.return].map((item, i) => {
              const { subject, body } = splitSubject(item.text);
              return (
                <li key={i}>
                  <span className={styles.num}>{i + 1}</span>
                  <div>
                    <div className={styles.itemTitle}>
                      {subject ?? t(i < data.displacement.push.length ? "findings.push" : "findings.return")}
                    </div>
                    <div className={styles.findingText}>
                      <Cited text={subject ? body : item.text} refs={item.refs} sources={data.sources} onOpen={onOpenSources} />
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
          <SectionChange note={noteFor("displacement")} />
        </Fold>
      )}

      {data.scenarios && (data.scenarios.description || data.scenarios.mostLikely || data.scenarios.bestCase || data.scenarios.worstCase) && (
        <Fold
          id={CHANGE_ANCHOR.forecast}
          title={t("findings.forecast")}
          meta={t("findings.forecastNote")}
          icon={<IconClock size={18} color="var(--sa-ai)" />}
          defaultOpen
          updated={!!noteFor("forecast")}
          updatedLabel={updatedLabel}
          testId="analysis-section-forecast"
          className={styles.forecast}
        >
          <span className={styles.badge}>{t("findings.forecastTag")}</span>
          {data.scenarios.description && <p className={styles.prose}>{data.scenarios.description}</p>}
          {(
            [
              ["mostLikely", data.scenarios.mostLikely],
              ["bestCase", data.scenarios.bestCase],
              ["worstCase", data.scenarios.worstCase],
            ] as const
          )
            .filter((entry): entry is [(typeof entry)[0], string] => !!entry[1])
            .map(([key, text]) => (
              <div key={key} className={styles.scenario}>
                <div className={styles.itemTitle}>{t(`findings.${key}`)}</div>
                <div className={styles.findingText}>{text}</div>
              </div>
            ))}
          {data.scenarios.refs.length > 0 && (
            <Citations refs={data.scenarios.refs} sources={data.sources} onOpen={onOpenSources} />
          )}
          <SectionChange note={noteFor("forecast")} />
        </Fold>
      )}
    </div>
  );
}
