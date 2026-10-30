"use client";

import { useMemo } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { getHazardName } from "~/lib/disaster-types";
import type { BriefViewLabels } from "~/lib/brief/view";

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
