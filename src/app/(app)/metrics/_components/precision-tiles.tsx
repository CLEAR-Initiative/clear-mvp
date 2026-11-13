"use client";

import { useFormatter, useTranslations } from "next-intl";
import { StatsGrid } from "~/components/ui";
import { EMPHASIS_SOURCE, type LocationPrecisionMetrics } from "~/lib/location-precision";
import { useShareFormat } from "./use-share-format";

const VALUE = "var(--color-text-primary)";
const SUB = "var(--color-text-muted)";

/** The headline numbers: the share at district or finer overall and for the
 * emphasised source, the share with no location, and the location challenges
 * filed in range (the correctness proxy). */
export function PrecisionTiles({ metrics }: { metrics: LocationPrecisionMetrics }) {
  const t = useTranslations("metrics.precision.tiles");
  const format = useFormatter();
  const pct = useShareFormat();
  const { totals, corrections } = metrics;
  const emphasis = metrics.bySource.find((row) => row.source === EMPHASIS_SOURCE) ?? metrics.bySource[0] ?? null;
  const ofSignals = (n: number, total: number) => t("ofSignals", { n, total });

  return (
    <StatsGrid
      cols={4}
      mobileCols={2}
      mb={0}
      stats={[
        {
          label: t("fine.label"),
          value: pct(totals.fineShare),
          color: VALUE,
          sub: ofSignals(totals.fine, totals.total),
          subColor: SUB,
        },
        {
          label: t("emphasis.label", { source: emphasis?.source ?? EMPHASIS_SOURCE }),
          value: pct(emphasis?.fineShare ?? null),
          color: VALUE,
          sub: emphasis ? ofSignals(emphasis.fine, emphasis.total) : t("none"),
          subColor: SUB,
        },
        {
          label: t("noLocation.label"),
          value: pct(totals.shares.noLocation),
          color: VALUE,
          sub: ofSignals(totals.noLocation, totals.total),
          subColor: SUB,
        },
        {
          label: t("corrections.label"),
          value: format.number(corrections.total),
          color: VALUE,
          sub: t("corrections.sub", { open: corrections.open, decided: corrections.decided }),
          subColor: SUB,
        },
      ]}
    />
  );
}
