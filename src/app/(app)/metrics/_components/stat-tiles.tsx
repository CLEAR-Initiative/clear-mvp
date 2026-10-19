"use client";

import { useFormatter, useTranslations } from "next-intl";
import { StatsGrid } from "~/components/ui";
import type { DetectionMetrics } from "~/lib/detection-metrics";
import { useShareFormat } from "./use-share-format";

const VALUE = "var(--color-text-primary)";
const SUB = "var(--color-text-muted)";

/** The headline numbers: the shares detected by next day and same day, the
 * share of events with an onset, and how many events were measured. */
export function StatTiles({ metrics }: { metrics: DetectionMetrics }) {
  const t = useTranslations("metrics.tiles");
  const format = useFormatter();
  const pct = useShareFormat();
  const { counted, eventsInRange } = metrics;

  return (
    <StatsGrid
      cols={4}
      mobileCols={2}
      mb={0}
      stats={[
        {
          label: t("byNextDay.label"),
          value: pct(metrics.shares.byNextDay),
          color: VALUE,
          sub: t("ofCounted", { n: metrics.byNextDay, counted }),
          subColor: SUB,
        },
        {
          label: t("sameDay.label"),
          value: pct(metrics.shares.sameDay),
          color: VALUE,
          sub: t("ofCounted", { n: metrics.sameDay, counted }),
          subColor: SUB,
        },
        {
          label: t("withOnset.label"),
          value: pct(metrics.shares.withOnset),
          color: VALUE,
          sub: t("ofInRange", { n: metrics.withOnset, total: eventsInRange }),
          subColor: SUB,
        },
        {
          label: t("counted.label"),
          value: format.number(counted),
          color: VALUE,
          sub: t("counted.detail", { total: eventsInRange }),
          subColor: SUB,
        },
      ]}
    />
  );
}
