"use client";

import { eventHref } from "~/lib/analytics/event-source";
import Link from "next/link";
import { useFormatter, useTranslations } from "next-intl";
import { severityColor } from "~/lib/types/graphql";
import { eventIdFromCitation, type AnalysisEvent } from "~/server/api/mappers/analysis";
import type { SaSource } from "~/server/api/mappers/situation-analysis";
import styles from "./dark/analysis-dark.module.css";

/**
 * The events the analysis cites, in citation order and under the same numbers
 * as the in-text `[n]` chips. `sources` is the whole numbered list; `events`
 * adds severity and place to the events whose lookup succeeded.
 */
export function CitedEvents({ sources, events }: { sources: SaSource[]; events: AnalysisEvent[] }) {
  const t = useTranslations("analysis.events");
  const format = useFormatter();
  const byId = new Map(events.map((e) => [e.id, e]));
  const rows = sources.flatMap((source, i) => {
    const id = eventIdFromCitation(source.id);
    return id ? [{ n: i + 1, id, source, event: byId.get(id) }] : [];
  });

  return (
    <div className={styles.eventsCard} data-testid="analysis-events" data-surface="page">
      <div className={styles.eventsHead}>
        <span className={styles.eventsTitle}>{t("title")}</span>
        {rows.length > 0 && <span className={styles.eventsMeta}>{t("count", { count: rows.length })}</span>}
      </div>
      {rows.length === 0 ? (
        <p className={styles.eventsEmpty}>{t("empty")}</p>
      ) : (
        rows.map(({ n, id, source, event }) => {
          const when = event?.startedAt ?? source.publishedAt;
          return (
            <Link key={id} href={eventHref(id, "analysis")} className={styles.eventRow} data-testid="analysis-event-row">
              <span className={styles.eventRef}>{n}.</span>
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  flexShrink: 0,
                  background: severityColor(event?.severity),
                }}
                aria-label={event?.severity != null ? t("severity", { value: event.severity }) : undefined}
              />
              <span className={styles.eventWhen}>
                {when ? format.dateTime(new Date(when), { day: "numeric", month: "short" }) : null}
              </span>
              <span className={styles.eventTitle}>{event?.title ?? t("untitled")}</span>
              {event?.locationName && <span className={styles.eventPlace}>{event.locationName}</span>}
            </Link>
          );
        })
      )}
    </div>
  );
}
