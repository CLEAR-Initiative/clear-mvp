"use client";

import { useMemo } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { getHazardName } from "~/lib/disaster-types";
import type { BriefViewLabels } from "~/lib/brief/view";
import type { BriefTextLabels } from "~/lib/brief/clipboard";

/** The wording `toBriefView` needs, in the reader's locale. */
export function useBriefViewLabels(): BriefViewLabels {
  const t = useTranslations("brief");
  const tSeverity = useTranslations("common.severities");
  const format = useFormatter();
  return useMemo<BriefViewLabels>(
    () => ({
      group: (kind) => t(`groups.${kind}`),
      severity: (key) => tSeverity(key),
      type: (code) => getHazardName(code),
      date: (iso) => format.dateTime(new Date(iso), { dateStyle: "medium" }),
      dateTime: (iso) => format.dateTime(new Date(iso), { dateStyle: "medium", timeStyle: "short" }),
      window: (start, end) => t("composer.window", { start, end }),
      earlier: (date) => t("items.earlier", { date }),
    }),
    [t, tSeverity, format],
  );
}

/** Section names and fillers for the PDF and the clipboard copy, in the reader's locale. */
export function useBriefTextLabels(): BriefTextLabels {
  const t = useTranslations("brief");
  return useMemo<BriefTextLabels>(
    () => ({
      summary: t("sections.summary"),
      counts: t("sections.counts"),
      items: t("sections.items"),
      closingNotes: t("sections.closingNotes"),
      none: t("composer.empty"),
      types: t("counts.byType"),
      sources: t("counts.bySource"),
      more: (count) => t("counts.more", { count }),
    }),
    [t],
  );
}
