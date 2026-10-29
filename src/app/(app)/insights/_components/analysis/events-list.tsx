"use client";

import { eventHref } from "~/lib/analytics/event-source";
import Link from "next/link";
import { useFormatter, useTranslations } from "next-intl";
import { severityColor } from "~/lib/types/graphql";
import type { AnalysisEvents } from "~/server/api/mappers/analysis";
import styles from "./dark/analysis-dark.module.css";

export function EventsList({ events }: { events: AnalysisEvents | undefined }) {
  const t = useTranslations("analysis.events");
  const format = useFormatter();
  const items = events?.items ?? [];

  return (
    <div className={styles.eventsCard} data-testid="analysis-events" data-surface="page">
      <div className={styles.eventsHead}>
        <span className={styles.eventsTitle}>{t("title")}</span>
        {events && events.totalCount > 0 && (
          <span className={styles.eventsMeta}>{t("count", { shown: items.length, total: events.totalCount })}</span>
        )}
      </div>
      {items.length === 0 ? (
        <p className={styles.eventsEmpty}>{t("empty")}</p>
      ) : (
        items.map((e) => (
          <Link key={e.id} href={eventHref(e.id, "analysis")} className={styles.eventRow} data-testid="analysis-event-row">
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                flexShrink: 0,
                background: severityColor(e.severity),
              }}
              aria-label={e.severity != null ? t("severity", { value: e.severity }) : undefined}
            />
            <span className={styles.eventWhen}>
              {format.dateTime(new Date(e.startedAt), { day: "numeric", month: "short" })}
            </span>
            <span className={styles.eventTitle}>{e.title ?? t("untitled")}</span>
            {e.locationName && <span className={styles.eventPlace}>{e.locationName}</span>}
          </Link>
        ))
      )}
    </div>
  );
}
