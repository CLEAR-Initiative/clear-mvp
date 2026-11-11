"use client";

import { useFormatter, useTranslations } from "next-intl";
import { StatsGrid, type StatItem } from "~/components/ui";
import { deltaPoints, type DetectionMetrics } from "~/lib/detection-metrics";
import { useShareFormat } from "./use-share-format";

const VALUE = "var(--color-text-primary)";
const SUB = "var(--color-text-muted)";

/** Every tile is a share where higher is better, so up is good news. */
function deltaColor(points: number): string {
  if (points > 0) return "var(--color-success)";
  if (points < 0) return "var(--color-critical)";
  return SUB;
}

/**
 * The headline numbers: the shares detected by next day and same day, the
 * share of events with an onset, and the share measured at all. With
 * `previous` (the same-length range just before), each tile also says how
 * many points it moved.
 */
export function StatTiles({
  metrics,
  previous,
}: {
  metrics: DetectionMetrics;
  /** The previous period; undefined while loading or when it failed. */
  previous?: DetectionMetrics;
}) {
  const t = useTranslations("metrics.tiles");
  const format = useFormatter();
  const pct = useShareFormat();
  const { counted, eventsInRange } = metrics;

  const delta = (pick: (m: DetectionMetrics) => number | null): StatItem["delta"] => {
    if (!previous) return undefined;
    const points = deltaPoints(pick(metrics), pick(previous));
    if (points === null) return { text: t("delta.none"), color: SUB };
    return {
      text: t("delta.points", { points: format.number(points, { signDisplay: "exceptZero" }) }),
      color: deltaColor(points),
      note: t("delta.vs", { previous: pct(pick(previous)) }),
    };
  };

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
          delta: delta((m) => m.shares.byNextDay),
          sub: t("ofCounted", { n: metrics.byNextDay, counted }),
          subColor: SUB,
        },
        {
          label: t("sameDay.label"),
          value: pct(metrics.shares.sameDay),
          color: VALUE,
          delta: delta((m) => m.shares.sameDay),
          sub: t("ofCounted", { n: metrics.sameDay, counted }),
          subColor: SUB,
        },
        {
          label: t("withOnset.label"),
          value: pct(metrics.shares.withOnset),
          color: VALUE,
          delta: delta((m) => m.shares.withOnset),
          sub: t("ofInRange", { n: metrics.withOnset, total: eventsInRange }),
          subColor: SUB,
        },
        {
          label: t("counted.label"),
          value: pct(metrics.shares.measured),
          color: VALUE,
          delta: delta((m) => m.shares.measured),
          sub: t("ofInRange", { n: counted, total: eventsInRange }),
          subColor: SUB,
        },
      ]}
    />
  );
}
