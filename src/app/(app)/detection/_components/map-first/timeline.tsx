"use client";

import { useRef, useState } from "react";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import { IconCalendar, IconChevronDown, IconChevronUp } from "@tabler/icons-react";
import {
  DATE_PRESETS,
  TIMELINE_DAYS,
  barHeights,
  moveHandle,
  nearestHandle,
  type BarRange,
  type DateKey,
} from "../../_lib/detection-model";
import css from "./map-first.module.css";

interface TimelineProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Per-day counts, oldest first, TIMELINE_DAYS long (all zeros while loading). */
  counts: number[];
  /** First day of the window (UTC midnight, ms); bar 0. */
  windowStartMs: number;
  /** The selected bars, or null when the date filter lies outside the window. */
  range: BarRange | null;
  /** Days in the window for a rolling range ("last N days"), else null. */
  windowDays: number | null;
  /** The current date key, when it is a preset or custom "last N days". */
  dateKey: DateKey | null;
  /** Label for a calendar month filter ("Oct 2026"). */
  fixedLabel: string | null;
  total: number;
  noun: string;
  isDefault: boolean;
  onPreset: (key: DateKey) => void;
  /** A from-to picked with the handles; applied on release. */
  onRangeCommit: (range: BarRange) => void;
  onDragChange: (dragging: boolean) => void;
}

const DAY_MS = 86_400_000;

type Draft = { range: BarRange; handle: "start" | "end" };

/**
 * The date filter: a pill at the map's bottom start, or the 90-day bar
 * timeline with presets and a from and a to handle.
 */
export function Timeline({
  open, onOpenChange, counts, windowStartMs, range, windowDays, dateKey, fixedLabel, total, noun, isDefault,
  onPreset, onRangeCommit, onDragChange,
}: TimelineProps) {
  const t = useTranslations("detection.mapFirst");
  const format = useFormatter();
  const locale = useLocale();
  const barsRef = useRef<HTMLDivElement>(null);
  // While a handle is dragged the selection is local; the filter changes on
  // release. The ref is what the pointer handlers read, so a release never
  // acts on a stale draft.
  const [draft, setDraftState] = useState<Draft | null>(null);
  const draftRef = useRef<Draft | null>(null);
  const setDraft = (next: Draft | null) => {
    draftRef.current = next;
    setDraftState(next);
  };
  /** End a drag, applying the picked range unless cancelled. Safe to call twice. */
  const finish = (apply: boolean) => {
    const d = draftRef.current;
    if (!d) return;
    setDraft(null);
    onDragChange(false);
    if (apply) onRangeCommit(d.range);
  };
  const shown = draft?.range ?? range;

  const fmt = new Intl.DateTimeFormat(locale === "en" ? "en-GB" : locale, { day: "numeric", month: "short", timeZone: "UTC" });
  const dayOf = (i: number) => fmt.format(new Date(windowStartMs + i * DAY_MS));
  const spanLabel = (r: BarRange) => (r[0] === r[1] ? dayOf(r[0]) : `${dayOf(r[0])} – ${dayOf(r[1])}`);

  // A draft (or a custom range) reads as dates; a rolling range keeps "Last N days".
  const rangeLabel = draft
    ? spanLabel(draft.range)
    : (fixedLabel ?? (windowDays === 1 ? t("last24h") : windowDays != null ? t("lastDays", { count: windowDays }) : range ? spanLabel(range) : ""));
  const inRange = (i: number) => shown != null && i >= shown[0] && i <= shown[1];

  const indexAt = (clientX: number) => {
    const el = barsRef.current;
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const rtl = getComputedStyle(el).direction === "rtl";
    const x = rtl ? r.right - clientX : clientX - r.left;
    return Math.floor((x / r.width) * TIMELINE_DAYS);
  };

  const heights = barHeights(counts, 0.03);
  const sparkHeights = barHeights(counts, 0.08);

  if (!open) {
    return (
      <button type="button" className={`${css.frost} ${css.timelinePill}`} title={t("showTimeline")} onClick={() => onOpenChange(true)}>
        <IconCalendar size={15} color={isDefault ? "var(--color-text-secondary)" : "var(--color-accent)"} />
        <span className={css.timelineRange}>{rangeLabel}</span>
        <span className={css.timelineCount}>{t("totalNoun", { total: format.number(total), noun })}</span>
        <span className={css.spark} aria-hidden>
          {sparkHeights.map((h, i) => (
            <span key={i} data-in={inRange(i) || undefined} style={{ height: `${h * 100}%` }} />
          ))}
        </span>
        <IconChevronUp size={14} color="var(--color-text-muted)" />
      </button>
    );
  }

  const summaryRange = draft || windowDays == null ? rangeLabel : windowDays === 1 ? t("last24h") : range ? spanLabel(range) : rangeLabel;
  const pct = (i: number) => `${(i / TIMELINE_DAYS) * 100}%`;

  return (
    <div className={`${css.frost} ${css.timeline}`}>
      <div className={css.timelineTop}>
        {DATE_PRESETS.map((key) => (
          <button
            key={key}
            type="button"
            className={css.preset}
            data-active={(!draft && dateKey === key) || undefined}
            onClick={() => {
              finish(false);
              onPreset(key);
            }}
          >
            {t(`presets.${key}`)}
          </button>
        ))}
        <span className={css.timelineSummary}>
          {t.rich("timelineSummary", { range: summaryRange, total: format.number(total), noun, b: (c) => <b>{c}</b> })}
        </span>
        <button type="button" className={css.collapse} title={t("hideTimeline")} aria-label={t("hideTimeline")} onClick={() => onOpenChange(false)}>
          <IconChevronDown size={15} />
        </button>
      </div>
      <div
        ref={barsRef}
        className={css.bars}
        onPointerDown={(e) => {
          // Only the main button drags: a right or ctrl click opens the
          // context menu, which swallows the release.
          if (e.button !== 0) return;
          const i = indexAt(e.clientX);
          if (i == null) return;
          const base = range ?? ([i, i] as BarRange);
          const handle = nearestHandle(base, i);
          e.currentTarget.setPointerCapture(e.pointerId);
          onDragChange(true);
          setDraft({ range: moveHandle(base, handle, i), handle });
        }}
        onPointerMove={(e) => {
          const d = draftRef.current;
          if (!d) return;
          const i = indexAt(e.clientX);
          if (i == null) return;
          const next = moveHandle(d.range, d.handle, i);
          if (next[0] !== d.range[0] || next[1] !== d.range[1]) setDraft({ range: next, handle: d.handle });
        }}
        onPointerUp={(e) => {
          if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
          finish(true);
        }}
        // The release doesn't always reach the bars (let go outside the
        // window, a system gesture); losing the capture still ends the drag.
        onLostPointerCapture={() => finish(true)}
        onPointerCancel={() => finish(false)}
      >
        {heights.map((h, i) => (
          <span key={i} data-in={inRange(i) || undefined} style={{ height: `${h * 100}%` }} />
        ))}
        {shown && (
          <>
            <span className={css.handle} style={{ insetInlineStart: pct(shown[0]) }} />
            <span className={css.handle} style={{ insetInlineStart: pct(shown[1] + 1) }} />
          </>
        )}
      </div>
      <div className={css.axis}>
        <span>{dayOf(0)}</span>
        <span>{dayOf(TIMELINE_DAYS - 61)}</span>
        <span>{dayOf(TIMELINE_DAYS - 31)}</span>
        <span>{t("today")}</span>
      </div>
    </div>
  );
}
