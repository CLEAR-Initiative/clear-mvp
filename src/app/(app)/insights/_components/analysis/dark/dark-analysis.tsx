"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useFormatter, useNow, useTranslations } from "next-intl";
import {
  IconAlertTriangle,
  IconArrowBarRight,
  IconBuilding,
  IconCash,
  IconChevronDown,
  IconCloud,
  IconCopy,
  IconFlag,
  IconHeart,
  IconInfoCircle,
  IconPencil,
  IconScale,
  IconShield,
  IconSparkles,
  IconTimeline,
  IconUsers,
  IconWorld,
  IconX,
  type Icon,
} from "@tabler/icons-react";
import { compactNumber, type SaBullet, type SaSource } from "~/server/api/mappers/situation-analysis";
import type { Analysis, AnalysisEvents, AnalysisFigures } from "~/server/api/mappers/analysis";
import { fundingSplit, kpiValues, splitSubject, timelineLayout } from "~/lib/analysis-view";
import { leadingFigure } from "./leading-figure";
import { Citations } from "../../situation/citations";
import { planSentenceSegments, planSummaryParagraphs, leadSentences } from "../../situation/summary-citations";
import { ScopeMap } from "../scope-map";
import { SectionChange } from "../../situation/section-change";
import styles from "./analysis-dark.module.css";
import { CHANGE_ANCHOR, type ChangeSection } from "./change-notes";
import { summaryCollapseAnchor, summaryScrollDelta } from "../summary-scroll";
import { EventAxis, cardsFromHighlights, eventTone, type TimelineStory } from "./event-axis";

const PREVIEW = 4;

type HighlightTone = "conflict" | "health" | "move" | "access";

/** Design rail: conflict gray, health amber, movement blue, access green. */
function highlightTone(text: string): HighlightTone {
  const s = text.toLowerCase();
  if (/displac|refugee|returnee|\breturn\b|fled|migrat|nuba/.test(s)) return "move";
  if (/cholera|dengue|health|disease|outbreak|measles|malaria|famine|malnutri/.test(s)) return "health";
  if (/access|crossing|corridor|reopen|blockade|checkpoint/.test(s)) return "access";
  return "conflict";
}

const DOT_CLASS: Record<HighlightTone, string | undefined> = {
  conflict: undefined,
  health: styles.dotHealth,
  move: styles.dotMove,
  access: styles.dotAccess,
};

/** Short stat after the colon, shown at the right of a highlight. Sentences stay in the body. */
function highlightMetric(body: string): string | null {
  const value = body.trim();
  if (!value || value.length > 18 || /[.?!]/.test(value)) return null;
  return value;
}

function InfoTip({ label, text }: { label: string; text: string }) {
  return (
    <span className={styles.infoTip}>
      <button type="button" className={styles.iconButton} aria-label={label}>
        <IconInfoCircle size={15} />
      </button>
      <span className={styles.infoBubble} role="tooltip">
        <span>{text}</span>
      </span>
    </span>
  );
}

export type ChangeBoardLink = { section: ChangeSection | null; count?: number };

export type ChangeBoard = {
  added: ChangeBoardLink[];
  updated: ChangeBoardLink[];
};

/** One finding card in the context-risks panel. */
export type ContextCard = {
  tag: string;
  text: string;
  figure?: string;
  scope?: string;
  /** Scope chip uses the projection color. */
  projection?: boolean;
  isNew?: boolean;
  refs: number[];
};

export type ContextCategory = {
  key: string;
  label: string;
  items: ContextCard[];
};

const CATEGORY_ICON: Record<string, Icon> = {
  demographics: IconUsers,
  economy: IconCash,
  environment: IconCloud,
  infrastructure: IconBuilding,
  legal: IconScale,
  political: IconFlag,
  security: IconShield,
  society: IconHeart,
};

function categoryIcon(key: string): Icon {
  return CATEGORY_ICON[key] ?? IconWorld;
}

function cardsFromRisk(risk: { items: string[]; refs: number[]; lineRefs: Record<string, number[]> }): ContextCard[] {
  return risk.items.map((item) => {
    const { subject, body } = splitSubject(item);
    const source = subject ? body : item;
    const parsed = leadingFigure(source);
    return {
      tag: subject ?? "",
      text: parsed?.rest ?? source,
      figure: parsed?.figure,
      refs: risk.lineRefs[item.trim()] ?? (Object.keys(risk.lineRefs).length > 0 ? [] : risk.refs),
    };
  });
}

function Updated({ label }: { label: string }) {
  return (
    <span className={styles.updated}>
      <span className={styles.freshDot} style={{ background: "var(--sa-accent)", boxShadow: "inset 0 0 0 1.5px var(--sa-accent)" }} />
      {label}
    </span>
  );
}

/** The analysis name. Analysts can change it; the parent stores the result. */
export function AnalysisTitle({
  name,
  canRename = false,
  onRename,
}: {
  name: string;
  canRename?: boolean;
  onRename?: (title: string) => void;
}) {
  const t = useTranslations("analysis.layout");
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(name);

  useEffect(() => {
    setDraft(name);
    setEditing(false);
  }, [name]);

  const save = () => {
    const next = draft.trim();
    if (!next || next === name) {
      setDraft(name);
      setEditing(false);
      return;
    }
    onRename?.(next);
    setEditing(false);
  };

  if (editing) {
    return (
      <div className={styles.titleRow}>
        <input
          className={styles.titleInput}
          value={draft}
          aria-label={t("editTitle")}
          placeholder={t("titlePlaceholder")}
          data-testid="analysis-title-input"
          autoFocus
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") save();
            if (event.key === "Escape") {
              setDraft(name);
              setEditing(false);
            }
          }}
        />
        <button type="button" className={styles.expand} onClick={save}>
          {t("saveTitle")}
        </button>
        <button
          type="button"
          className={styles.iconButton}
          aria-label={t("cancelEdit")}
          onClick={() => {
            setDraft(name);
            setEditing(false);
          }}
        >
          <IconX size={15} />
        </button>
      </div>
    );
  }

  return (
    <div className={styles.titleRow}>
      <h1 className={styles.title} data-testid="analysis-title">
        {name}
      </h1>
      {canRename && (
        <button
          type="button"
          className={styles.iconButton}
          aria-label={t("editTitle")}
          data-testid="analysis-title-edit"
          onClick={() => {
            setDraft(name);
            setEditing(true);
          }}
        >
          <IconPencil size={16} />
        </button>
      )}
    </div>
  );
}

export function AnalysisHeader({
  eyebrow,
  name,
  updated,
  stale,
  staleLabel,
  period,
  builtFrom,
  chips,
  loose,
  board,
  changesStamp,
  seen,
  onDismiss,
  onJump,
  onOpenSources,
  onHome,
  actions,
  canRename = false,
  onRename,
}: {
  eyebrow: string;
  name: string;
  updated: string;
  stale: boolean;
  staleLabel: string;
  period: string;
  builtFrom: string;
  chips: { section: ChangeSection; note: string }[];
  loose: { key: string; note: string }[];
  /** Design rows: new findings with counts, then sections that were revised. */
  board?: ChangeBoard;
  /** Short date of the update, already formatted, shown after the kicker. */
  changesStamp?: string;
  seen: boolean;
  onDismiss: () => void;
  onJump: (section: ChangeSection) => void;
  onOpenSources: () => void;
  onHome: () => void;
  actions: ReactNode;
  /** Analysts can rename the analysis. The parent stores the new title. */
  canRename?: boolean;
  onRename?: (title: string) => void;
}) {
  const t = useTranslations("analysis.layout");
  const showChanges = !seen && (board != null || chips.length > 0 || loose.length > 0);
  const linkLabel = (section: ChangeSection | null) => (section ? t(`sections.${section}`) : t("nrcEvidence"));

  return (
    <header className={styles.header}>
      <AnalysisCrumbs name={name} onHome={onHome} />
      <div className={styles.eyebrowRow}>
        <span className={styles.eyebrow}>{eyebrow}</span>
        <div className={styles.actions}>{actions}</div>
      </div>
      <AnalysisTitle name={name} canRename={canRename} onRename={onRename} />
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
        <span>
          {period}
          {" · "}
          <button type="button" className={styles.metaLink} onClick={onOpenSources}>
            {builtFrom}
          </button>
        </span>
      </div>
      {showChanges && (
        <section className={styles.changes} aria-label={t("changes")} data-testid="analysis-changes">
          <div className={styles.changesHead}>
            <span className={styles.kicker}>
              <IconSparkles size={13} stroke={2} />
              {t("changes")}
              {changesStamp ? ` · ${changesStamp}` : null}
            </span>
            <button type="button" className={styles.iconButton} aria-label={t("dismissChanges")} onClick={onDismiss}>
              <IconX size={15} />
            </button>
          </div>
          {board ? (
            <div className={styles.changeGrid}>
              {board.added.length > 0 && (
                <>
                  <span className={styles.changeKind}>
                    <span className={styles.changeDot} />
                    {t("newCount", { count: board.added.reduce((sum, item) => sum + (item.count ?? 1), 0) })}
                  </span>
                  <div className={styles.chips}>
                    {board.added.map((item) => (
                      <button
                        key={item.section ?? "nrc"}
                        type="button"
                        className={`${styles.chip} ${styles.chipNew}`}
                        onClick={() => item.section && onJump(item.section)}
                      >
                        {linkLabel(item.section)}
                        {item.count != null && <span className={styles.chipCount}>{item.count}</span>}
                      </button>
                    ))}
                  </div>
                </>
              )}
              {board.updated.length > 0 && (
                <>
                  <span className={styles.changeKind}>
                    <span className={`${styles.changeDot} ${styles.changeDotHollow}`} />
                    {t("updatedCount", { count: board.updated.length })}
                  </span>
                  <div className={styles.chips}>
                    {board.updated.map((item) => (
                      <button
                        key={item.section ?? "updated"}
                        type="button"
                        className={styles.chip}
                        onClick={() => item.section && onJump(item.section)}
                      >
                        {linkLabel(item.section)}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          ) : (
            chips.length > 0 && (
              <div className={styles.chips}>
                {chips.map((chip) => (
                  <button key={chip.section} type="button" className={styles.chip} title={chip.note} onClick={() => onJump(chip.section)}>
                    {t(`sections.${chip.section}`)}
                  </button>
                ))}
              </div>
            )
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

/** CLEAR returns to the list. Insights opens the Insights page. */
export function AnalysisCrumbs({ name, onHome }: { name: string; onHome: () => void }) {
  const t = useTranslations("analysis.layout");
  const tNav = useTranslations("nav.items");
  return (
    <nav className={styles.crumb} aria-label={t("breadcrumb")}>
      <button type="button" className={styles.crumbBrand} onClick={onHome} data-testid="analysis-back">
        CLEAR
      </button>
      <span>/</span>
      <Link href="/insights" className={styles.crumbLink}>
        {tNav("insights")}
      </Link>
      <span>/</span>
      <span className={styles.crumbHere}>{name}</span>
    </nav>
  );
}

/** The element that actually scrolls, or the window when the page itself scrolls. */
function scrollParent(node: HTMLElement): HTMLElement | Window {
  let current = node.parentElement;
  while (current) {
    const overflow = getComputedStyle(current).overflowY;
    if ((overflow === "auto" || overflow === "scroll") && current.scrollHeight > current.clientHeight + 1) {
      return current;
    }
    current = current.parentElement;
  }
  return window;
}

const FOLD_MS = 280;

function prefersReducedMotion(): boolean {
  return typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Grows and shrinks with the text height. A grid row does not, inside the summary's flex column. */
function Collapse({ open, children, className }: { open: boolean; children: ReactNode; className?: string }) {
  const innerRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(open);
  const [height, setHeight] = useState<number | "auto">(open ? "auto" : 0);
  const skipOpen = useRef(open);

  useEffect(() => {
    if (open) {
      setMounted(true);
      return;
    }
    const node = innerRef.current;
    if (!node) return;
    if (prefersReducedMotion()) {
      setHeight(0);
      setMounted(false);
      return;
    }
    setHeight(node.scrollHeight);
    const frame = requestAnimationFrame(() => setHeight(0));
    const timer = window.setTimeout(() => setMounted(false), FOLD_MS);
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(timer);
    };
  }, [open]);

  useEffect(() => {
    if (!open || !mounted) return;
    if (skipOpen.current) {
      skipOpen.current = false;
      setHeight("auto");
      return;
    }
    const node = innerRef.current;
    if (!node) return;
    if (prefersReducedMotion()) {
      setHeight("auto");
      return;
    }
    setHeight(0);
    const frame = requestAnimationFrame(() => {
      const current = innerRef.current;
      if (current) setHeight(current.scrollHeight);
    });
    const timer = window.setTimeout(() => setHeight("auto"), FOLD_MS);
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(timer);
    };
  }, [open, mounted]);

  if (!mounted) return null;
  return (
    <div
      className={styles.foldHeight}
      style={{ height: height === "auto" ? "auto" : `${height}px` }}
      aria-hidden={open ? undefined : true}
      inert={open ? undefined : true}
    >
      <div ref={innerRef}>{className ? <div className={className}>{children}</div> : children}</div>
    </div>
  );
}

function Fold({
  id,
  title,
  meta,
  icon,
  iconTone = "accent",
  tag,
  defaultOpen,
  updated,
  freshLabel,
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
  /** Forecast uses the purple icon tile. */
  iconTone?: "accent" | "ai";
  /** Small pill beside the title, such as "Projections, not observed". */
  tag?: string;
  defaultOpen: boolean;
  updated?: boolean;
  /** "N new" pill. Takes the place of the updated chip when the handoff has a count. */
  freshLabel?: string;
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
        <span className={iconTone === "ai" ? styles.sectionIconAi : styles.sectionIcon}>{icon}</span>
        <span style={{ display: "flex", flexDirection: "column", gap: 2, flex: 1, minWidth: 0 }}>
          <span style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
            <span className={styles.sectionTitle}>{title}</span>
            {tag && <span className={styles.forecastTag}>{tag}</span>}
            {freshLabel ? <Updated label={freshLabel} /> : updated ? <Updated label={updatedLabel} /> : null}
          </span>
          <span className={styles.sectionMeta}>{meta}</span>
        </span>
        <span className={styles.chev} style={{ transform: open ? "rotate(180deg)" : undefined }}>
          <IconChevronDown size={16} />
        </span>
      </button>
      <Collapse open={open} className={flush ? styles.sectionBodyFlush : styles.sectionBody}>
        {children}
      </Collapse>
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
  const head = items.slice(0, PREVIEW);
  const tail = items.slice(PREVIEW);
  const renderItem = (item: SaBullet, i: number) => {
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
  };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div className={styles.itemGrid}>{head.map(renderItem)}</div>
      {tail.length > 0 && (
        <Collapse open={all}>
          <div className={styles.itemGrid}>{tail.map(renderItem)}</div>
        </Collapse>
      )}
      {items.length > PREVIEW && (
        <button type="button" className={styles.more} aria-expanded={all} onClick={() => setAll((value) => !value)}>
          {all ? t("showLess") : t("showAll", { count: items.length })}
          <IconChevronDown size={14} className={styles.twist} style={{ transform: all ? "rotate(180deg)" : undefined }} />
        </button>
      )}
    </div>
  );
}

export function AnalysisOverview({
  data,
  figures,
  events,
  eventsPending = false,
  eventsFailed = false,
  scopeName,
  countryId,
  countryName,
  areaIds,
  isCountry,
  showTimeline = false,
  story,
  contextBoard,
  freshLabel,
  onOpenSources,
  noteFor,
}: {
  data: Analysis;
  figures: AnalysisFigures | undefined;
  events: AnalysisEvents | undefined;
  /** The events query is in flight. A created analysis shows the timeline while it loads. */
  eventsPending?: boolean;
  /** The events query failed. The map says so instead of staying on loading. */
  eventsFailed?: boolean;
  scopeName: string;
  countryId: string;
  countryName: string;
  areaIds: string[];
  isCountry: boolean;
  /** Country analyses hide the timeline. The design preview turns it on. */
  showTimeline?: boolean;
  /** Handoff annotations. Real analyses build the same axis from their events. */
  story?: TimelineStory;
  /** Handoff context cards. Real analyses build the same cards from their bullets. */
  contextBoard?: ContextCategory[];
  /** "N new" on the context header. Present only while the update is unseen. */
  freshLabel?: string;
  onOpenSources: () => void;
  noteFor: (section: ChangeSection) => string | undefined;
}) {
  const t = useTranslations("analysis");
  const format = useFormatter();
  const now = useNow({ updateInterval: 60_000 });
  const [sumOpen, setSumOpen] = useState(false);
  const summaryRef = useRef<HTMLElement>(null);
  const collapseAnchor = useRef<number | null>(null);
  const toggleSummary = () => {
    const section = summaryRef.current;
    collapseAnchor.current = sumOpen && section ? summaryCollapseAnchor(section.getBoundingClientRect().top) : null;
    setSumOpen((open) => !open);
  };
  useLayoutEffect(() => {
    const anchor = collapseAnchor.current;
    collapseAnchor.current = null;
    const section = summaryRef.current;
    if (anchor == null || !section) return;
    const delta = summaryScrollDelta(section.getBoundingClientRect().top, anchor);
    if (Math.abs(delta) < 1) return;
    const scroller = scrollParent(section);
    if (scroller instanceof HTMLElement) scroller.scrollTop += delta;
    else scroller.scrollBy(0, delta);
  }, [sumOpen]);
  const [copied, setCopied] = useState(false);
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

  const summaryText = data.summary;
  const preview = summaryText ? leadSentences(summaryText, 2) : null;
  const leadText = preview?.truncated ? preview.lead : summaryText;
  const restText = preview?.truncated && summaryText ? summaryText.slice(preview.lead.length).trim() : "";
  const findings = data.keyFindings;

  const categories: ContextCategory[] = contextBoard ?? data.contextRisks.map((risk) => ({ key: risk.key, label: risk.label, items: cardsFromRisk(risk) }));
  const selected = categories.find((risk) => risk.key === riskKey) ?? categories[0];
  const findingCount = categories.reduce((n, risk) => n + risk.items.length, 0);
  const markNew = Boolean(freshLabel);
  const SelectedIcon = selected ? categoryIcon(selected.key) : null;

  const timeline = useMemo(() => {
    if ((!showTimeline && isCountry) || !events) return null;
    return timelineLayout(events.items, new Date(data.scope.windowStart), now, 6);
  }, [showTimeline, isCountry, events, data.scope.windowStart, now]);

  const axisCards = story
    ? story.cards
    : timeline
      ? cardsFromHighlights(timeline.highlights, (event) => ({
          kicker: format.dateTime(new Date(event.startedAt), { day: "numeric", month: "short" }),
          text: event.title ?? t("events.untitled"),
          href: event.id.startsWith("preview-") ? undefined : `/event/${event.id}`,
        }))
      : [];
  const axisMonths = story
    ? story.months.map((month) => ({ x: month.x, label: format.dateTime(new Date(month.at), { month: "short" }) }))
    : (timeline?.months ?? []).map((month) => ({ x: month.x, label: format.dateTime(month.label, { month: "short" }) }));
  const axisDots = story ? undefined : timeline?.dots.map((dot) => ({ x: dot.x, tone: eventTone(dot.event) }));
  const windowStartLabel = format.dateTime(new Date(data.scope.windowStart), { day: "numeric", month: "short", year: "numeric" });
  const summaryNote = noteFor("summary");

  const copySummary = async () => {
    if (!summaryText) return;
    try {
      await navigator.clipboard.writeText(summaryText);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className={styles.stack}>
      {(data.summary || findings.length > 0) && (
        <section ref={summaryRef} id={CHANGE_ANCHOR.summary} className={styles.summary} data-testid="analysis-summary">
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
                {summaryText && (
                  <span className={styles.summaryTools}>
                    <button type="button" className={styles.iconButton} aria-label={t("layout.copySummary")} onClick={() => void copySummary()}>
                      <IconCopy size={15} />
                    </button>
                  </span>
                )}
              </div>
              {copied && <span className={styles.sectionMeta}>{t("layout.copied")}</span>}
              {leadText &&
                planSummaryParagraphs(leadText, data.summaryLineRefs).map((para, i) => {
                  const segments = planSentenceSegments(para, data.summaryLineRefs);
                  return (
                    <p key={i} className={styles.lead}>
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
              {sumOpen && (restText || summaryNote) && (
                <div className={styles.summaryMore}>
                  {restText &&
                    planSummaryParagraphs(restText, data.summaryLineRefs).map((para, i) => {
                      const segments = planSentenceSegments(para, data.summaryLineRefs);
                      return (
                        <p key={i} className={styles.prose}>
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
                  <SectionChange note={summaryNote} />
                </div>
              )}
            </div>
            {findings.length > 0 && (
              <aside className={styles.rail} aria-label={t("layout.highlights")} data-testid="analysis-highlights">
                <span className={styles.railLabel}>{t("layout.highlights")}</span>
                {findings.map((finding, i) => {
                  const { subject, body } = splitSubject(finding.text);
                  const tone = highlightTone(finding.text);
                  const metric = highlightMetric(subject ? body : "");
                  const dotClass = DOT_CLASS[tone];
                  return (
                    <div key={i} className={styles.railButton}>
                      <span className={dotClass ? `${styles.dot} ${dotClass}` : styles.dot} />
                      <span className={styles.railTitle}>{subject ?? finding.text}</span>
                      {metric && (
                        <span className={tone === "access" ? styles.railValueAccess : styles.railValue}>{metric}</span>
                      )}
                    </div>
                  );
                })}
              </aside>
            )}
          </div>
          {(preview?.truncated || summaryNote) && (
            <div className={styles.expandRow}>
              <button type="button" className={styles.expand} data-testid="summary-toggle" aria-expanded={sumOpen} onClick={toggleSummary}>
                {sumOpen ? t("layout.collapseSummary") : t("layout.expandSummary")}
                <IconChevronDown size={14} className={styles.twist} style={{ transform: sumOpen ? "rotate(180deg)" : undefined }} />
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
            <InfoTip label={t("layout.howToRead")} text={t("kpis.differentDates")} />
          </div>
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
                  <div className={styles.legend} data-testid="displaced-split">
                    <span className={styles.splitNote}>{t("kpis.roundedParts")}</span>
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
              <InfoTip
                label={t("layout.howToRead")}
                text={t("kpis.sectorOverlap", { total: pin ? compactNumber(pin.value) : "" })}
              />
            </span>
          </div>
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
            <InfoTip label={t("layout.howToRead")} text={t("kpis.fundingHow")} />
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
        failed={eventsFailed}
      />

      {(showTimeline || !isCountry) && (story ? axisCards.length > 0 : eventsPending || !!events) && (
        <Fold
          id="analysis-timeline"
          title={t("timeline.title")}
          meta={
            story
              ? t("timeline.span", { start: windowStartLabel, count: story.keyCount })
              : eventsPending && !events
                ? t("timeline.loading")
                : t("timeline.live", { start: windowStartLabel, count: events?.totalCount ?? 0 })
          }
          icon={<IconTimeline size={18} />}
          defaultOpen
          updatedLabel={updatedLabel}
          testId="analysis-section-timeline"
        >
          {eventsPending && !events ? null : axisCards.length === 0 && !story ? (
            <p className={styles.sectionMeta}>{t("timeline.empty")}</p>
          ) : (
            <EventAxis today={t("timeline.today")} months={axisMonths} cards={axisCards} dots={axisDots} spans={story?.spans} />
          )}
        </Fold>
      )}

      {categories.length > 0 && selected && (
        <Fold
          id={CHANGE_ANCHOR.contexts}
          title={t("contexts.title")}
          meta={t("contexts.meta", { categories: categories.length, findings: findingCount })}
          icon={<IconWorld size={18} />}
          defaultOpen
          updated={!freshLabel && !!noteFor("contexts")}
          freshLabel={freshLabel}
          updatedLabel={updatedLabel}
          testId="analysis-section-contexts"
          flush
        >
          <div className={styles.catLayout}>
            <div className={styles.catList} role="tablist" aria-label={t("contexts.title")}>
              {categories.map((risk) => {
                const IconFor = categoryIcon(risk.key);
                const on = risk.key === selected.key;
                const hasNew = markNew && risk.items.some((item) => item.isNew);
                return (
                  <button
                    key={risk.key}
                    type="button"
                    role="tab"
                    aria-selected={on}
                    className={styles.catButton}
                    data-testid={`analysis-risk-${risk.key}`}
                    onClick={() => setRiskKey(risk.key)}
                  >
                    <span className={on ? styles.catIconOn : styles.catIcon}>
                      <IconFor size={16} />
                    </span>
                    <span style={{ flex: 1 }}>{risk.label}</span>
                    {hasNew && <span className={styles.catDot} />}
                    <span className={styles.countPill}>{risk.items.length}</span>
                  </button>
                );
              })}
            </div>
            <div className={styles.findings} role="tabpanel">
              <div className={styles.catHead}>
                <span className={styles.catHero}>{SelectedIcon && <SelectedIcon size={20} />}</span>
                <div>
                  <div className={styles.catName}>{selected.label}</div>
                  <div className={styles.sectionMeta}>{t("contexts.findings", { count: selected.items.length })}</div>
                </div>
              </div>
              <div className={styles.findingGrid}>
                {selected.items.map((item, i) => {
                  const isNew = markNew && item.isNew;
                  return (
                    <div key={i} className={styles.finding} data-new={isNew || undefined}>
                      {(item.tag || isNew || item.scope) && (
                        <div className={styles.findingTop}>
                          <span className={styles.findingTags}>
                            {item.tag && <span className={styles.tag}>{item.tag}</span>}
                            {isNew && <span className={styles.newMark}>● {t("layout.newMark")}</span>}
                          </span>
                          {item.scope && <span className={item.projection ? styles.scopeProjection : styles.scope}>{item.scope}</span>}
                        </div>
                      )}
                      {item.figure && <div className={styles.figureStat}>{item.figure}</div>}
                      <div className={styles.findingText}>
                        <Cited text={item.text} refs={item.refs} sources={data.sources} onOpen={onOpenSources} />
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

    </div>
  );
}
