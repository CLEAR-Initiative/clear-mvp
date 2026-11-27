"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { UnstyledButton } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { IconChevronDown, IconChevronUp } from "@tabler/icons-react";
import { useLocale, useTranslations } from "next-intl";
import { reportHandledError } from "~/lib/report-handled-error";
import { useTimeframe } from "../hooks/use-timeframe";
import { useDetectionLevel } from "../hooks/use-detection-level";
import { useDetectionsForMap } from "../hooks/use-detections-for-map";
import {
  PRESETS,
  TIMELINE_DAYS,
  barsToTimeframe,
  dateOfBar,
  presetOf,
  presetTimeframe,
  timeframeBars,
  timelineExtent,
  type BarRange,
} from "../timeframe/model";
import { Bars } from "./bars";
import { useDailyCounts } from "./use-daily-counts";
import classes from "./timeline.module.css";

const KEY_COMMIT_DELAY_MS = 400;
const OPEN_QUERY = "(min-width: 62em)";

const bold = (chunks: ReactNode) => <b>{chunks}</b>;

type TimelineProps = {
  onHeightChange: (px: number, open: boolean) => void;
  insetStart?: number;
};

export function Timeline({ onHeightChange, insetStart = 0 }: TimelineProps) {
  const t = useTranslations("mapV2.timeline");
  const locale = useLocale();
  const wide = useMediaQuery(OPEN_QUERY, undefined, { getInitialValueInEffect: false }) ?? false;
  const [openWhenWide, setOpenWhenWide] = useState(true);
  const open = wide && openWhenWide;

  const [extent] = useState(() => timelineExtent(new Date()));
  const [timeframe, setTimeframe] = useTimeframe();
  const range = useMemo(() => timeframeBars(timeframe, extent), [timeframe, extent]);
  const { level } = useDetectionLevel();
  const { counts, status } = useDailyCounts(extent, level);
  const mapDetections = useDetectionsForMap(level);
  const mapStatus = !level
    ? "none"
    : mapDetections.isError
      ? "error"
      : mapDetections.isPending || mapDetections.isPlaceholderData
        ? "loading"
        : "ready";
  useEffect(() => {
    if (mapDetections.error) {
      reportHandledError(mapDetections.error, { feature: "map-v2-timeframe", stage: "map-count" });
    }
  }, [mapDetections.error]);

  const [draft, setDraftState] = useState<BarRange | null>(null);
  const draftRef = useRef<BarRange | null>(null);
  const setDraft = (next: BarRange | null) => {
    draftRef.current = next;
    setDraftState(next);
  };
  const keyTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(keyTimer.current), []);

  const commit = (next: BarRange) => {
    clearTimeout(keyTimer.current);
    setDraft(null);
    setTimeframe(barsToTimeframe(next, extent));
  };

  const shown = draft ?? range;

  const formats = useMemo(() => {
    const tag = locale === "en" ? "en-GB" : locale;
    return {
      short: new Intl.DateTimeFormat(tag, { day: "numeric", month: "short", timeZone: "UTC" }),
      long: new Intl.DateTimeFormat(tag, { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }),
    };
  }, [locale]);
  const shortDay = (index: number) => formats.short.format(dateOfBar(index, extent));
  const longDay = (index: number) => formats.long.format(dateOfBar(index, extent));
  const dates = shown[0] === shown[1] ? shortDay(shown[0]) : `${shortDay(shown[0])} – ${shortDay(shown[1])}`;

  const fromMap = !draft && timeframe.kind === "rolling";
  const total = fromMap
    ? (mapDetections.data?.length ?? 0)
    : counts.slice(shown[0], shown[1] + 1).reduce((sum, count) => sum + count, 0);
  const countStatus = fromMap ? mapStatus : status;
  const insetStyle = { "--map-timeline-inset-start": `${insetStart}px` } as CSSProperties;
  const count = !level
    ? t.rich("countNone", { b: bold })
    : countStatus === "ready"
      ? t.rich(`count.${level}`, { total, b: bold })
      : t.rich(`countPending.${level}`, { b: bold });

  const rootRef = useRef<HTMLElement>(null);
  const onHeightChangeRef = useRef(onHeightChange);
  onHeightChangeRef.current = onHeightChange;
  useLayoutEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const report = () => {
      const parent = el.offsetParent as HTMLElement | null;
      onHeightChangeRef.current(parent ? parent.clientHeight - el.offsetTop : el.offsetHeight, open);
    };
    report();
    const observer = new ResizeObserver(report);
    observer.observe(el);
    return () => observer.disconnect();
  }, [open]);

  if (!open) {
    const label =
      draft || timeframe.kind === "fixed"
        ? dates
        : timeframe.days === 1
          ? t("last24h")
          : t("lastDays", { count: timeframe.days });
    const content = (
      <>
        <span>{label}</span>
        <span aria-hidden>·</span>
        <span className={classes.count}>{count}</span>
      </>
    );
    return (
      <section ref={rootRef} aria-label={t("label")} className={classes.pillRoot}>
        {wide ? (
          <UnstyledButton className={classes.pill} aria-label={t("show")} onClick={() => setOpenWhenWide(true)}>
            {content}
            <IconChevronUp size={16} />
          </UnstyledButton>
        ) : (
          <div className={classes.pill}>{content}</div>
        )}
      </section>
    );
  }

  const activePreset = draft ? null : presetOf(timeframe);

  return (
    <section ref={rootRef} aria-label={t("label")} className={classes.root} style={insetStyle}>
      <div className={classes.top}>
        <div className={classes.presets}>
          {PRESETS.map((preset) => (
            <UnstyledButton
              key={preset}
              className={classes.preset}
              data-active={activePreset === preset || undefined}
              aria-pressed={activePreset === preset}
              onClick={() => {
                clearTimeout(keyTimer.current);
                setDraft(null);
                setTimeframe(presetTimeframe(preset));
              }}
            >
              {t(`presets.${preset}`)}
            </UnstyledButton>
          ))}
        </div>
        <span className={classes.summary}>
          <span>{dates}</span>
          <span aria-hidden>·</span>
          <span className={classes.count}>{count}</span>
        </span>
        <UnstyledButton className={classes.collapse} aria-label={t("hide")} onClick={() => setOpenWhenWide(false)}>
          <IconChevronDown size={16} />
        </UnstyledButton>
      </div>
      <Bars
        counts={counts}
        range={range}
        draft={draft}
        longDay={longDay}
        onDraft={(next) => {
          clearTimeout(keyTimer.current);
          setDraft(next);
        }}
        onDragEnd={(apply) => {
          const next = draftRef.current;
          if (apply && next) commit(next);
          else setDraft(null);
        }}
        onKeyStep={(next) => {
          setDraft(next);
          clearTimeout(keyTimer.current);
          keyTimer.current = setTimeout(() => commit(next), KEY_COMMIT_DELAY_MS);
        }}
      />
      <div className={classes.axis} aria-hidden>
        <span>{shortDay(0)}</span>
        <span>{shortDay(TIMELINE_DAYS - 61)}</span>
        <span>{shortDay(TIMELINE_DAYS - 31)}</span>
        <span>{t("today")}</span>
      </div>
    </section>
  );
}
