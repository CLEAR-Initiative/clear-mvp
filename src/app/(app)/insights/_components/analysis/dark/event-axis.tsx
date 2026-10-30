"use client";

import Link from "next/link";
import type { AnalysisEvent } from "~/server/api/mappers/analysis";
import type { TimelineDot } from "~/lib/analysis-view";
import styles from "./analysis-dark.module.css";

export type TimelineTone = "gray" | "key" | "blue" | "orange";

export interface TimelineCard {
  x: number;
  above: boolean;
  alignEnd?: boolean;
  kicker: string;
  text: string;
  tone: TimelineTone;
  href?: string;
}

export interface TimelineSpan {
  x: number;
  width: number;
  tone: "neutral" | "move";
  label?: string;
}

export interface TimelineStory {
  /** Count shown in the section subtitle. The design sample counts the cluster as well as the cards. */
  keyCount: number;
  months: { at: string; x: number }[];
  cards: TimelineCard[];
  spans: TimelineSpan[];
}

const CROWD = 0.16;

export function eventTone(event: AnalysisEvent): TimelineTone {
  const text = `${event.title ?? ""} ${event.types.join(" ")}`.toLowerCase();
  if (/fund|hrp/.test(text)) return "orange";
  if (/displac|refugee|returnee|\breturn\b/.test(text)) return "blue";
  if ((event.severity ?? 0) >= 4) return "key";
  return "gray";
}

/** Place the notable events as callouts above and below the axis, keeping neighbours apart. */
export function cardsFromHighlights(
  highlights: TimelineDot[],
  label: (event: AnalysisEvent) => { kicker: string; text: string; href?: string },
): TimelineCard[] {
  const aboveXs: number[] = [];
  const belowXs: number[] = [];
  return highlights.map((dot, index) => {
    const crowded = (xs: number[]) => xs.some((x) => Math.abs(x - dot.x) < CROWD);
    let above = index % 2 === 0;
    if (above && crowded(aboveXs)) above = false;
    else if (!above && crowded(belowXs)) above = true;
    (above ? aboveXs : belowXs).push(dot.x);
    const named = label(dot.event);
    return {
      x: dot.x,
      above,
      alignEnd: dot.x > 0.55,
      kicker: named.kicker,
      text: named.text,
      tone: eventTone(dot.event),
      href: named.href,
    };
  });
}

function Callout({ card }: { card: TimelineCard }) {
  const body = (
    <>
      <span className={styles.axisKicker}>{card.kicker}</span>
      <span className={styles.axisText}>{card.text}</span>
    </>
  );
  if (card.href) {
    return (
      <Link href={card.href} className={styles.axisCard}>
        {body}
      </Link>
    );
  }
  return <div className={styles.axisCard}>{body}</div>;
}

/** Annotated axis from the handoff: callouts, stems, month ticks, and a today marker. */
export function EventAxis({
  today,
  months,
  cards,
  dots,
  spans = [],
}: {
  today: string;
  months: { x: number; label: string }[];
  cards: TimelineCard[];
  /** Every event on the axis. The design sample omits this and dots its cards. */
  dots?: { x: number; tone: TimelineTone }[];
  spans?: TimelineSpan[];
}) {
  const markers = dots ?? cards.map((card) => ({ x: card.x, tone: card.tone }));
  return (
    <div className={styles.axisScroll}>
      <div className={styles.axisCanvas} dir="ltr" data-testid="analysis-timeline">
        <div className={styles.axisLine} />
        {spans.map((span) => (
          <div key={`${span.tone}-${span.x}`}>
            <div
              className={span.tone === "move" ? styles.spanMove : styles.spanBand}
              style={{ left: `${span.x * 100}%`, width: `${span.width * 100}%` }}
            />
            {span.label && (
              <div className={styles.spanLabel} style={{ left: `${(span.x + span.width) * 100}%` }}>
                {span.label}
              </div>
            )}
          </div>
        ))}
        {months.map((month) => (
          <div key={`${month.label}-${month.x}`}>
            <span className={styles.tick} style={{ left: `${month.x * 100}%` }} />
            <span className={styles.tickLabel} style={{ left: `${month.x * 100}%` }}>
              {month.label}
            </span>
          </div>
        ))}
        <div className={styles.todayMark}>
          <span className={styles.todayLabel}>{today}</span>
          <span className={styles.todayBar} />
        </div>
        {markers.map((dot, index) => (
          <span key={`dot-${index}`} className={styles.axisDot} data-tone={dot.tone} style={{ left: `${dot.x * 100}%` }} />
        ))}
        {cards.map((card) => (
          <div
            key={`${card.kicker}-${card.x}-${card.text}`}
            className={card.above ? styles.pinUp : styles.pinDown}
            data-tone={card.tone}
            data-align={card.alignEnd ? "end" : "start"}
            style={card.alignEnd ? { right: `${(1 - card.x) * 100}%` } : { left: `${card.x * 100}%` }}
          >
            <Callout card={card} />
            <span className={styles.stem} />
          </div>
        ))}
      </div>
    </div>
  );
}
