"use client";

import { useFormatter, useNow, useTranslations } from "next-intl";
import { IconPlus } from "@tabler/icons-react";
import { PageHeader } from "~/components/ui/page-header";
import css from "./map-first.module.css";

export type HeaderTab = "alerts" | "events" | "signals" | "history";

interface CompactHeaderProps {
  title: string;
  tab: string | null;
  onTabChange: (tab: HeaderTab) => void;
  counts: { alerts: number | null; events: number | null; signals: number | null };
  /** When the new-items poll last answered (ISO); hides the live line when unknown. */
  updatedAt: number | null;
  onCreateSignal: () => void;
}

const TABS: HeaderTab[] = ["alerts", "events", "signals", "history"];

/** The 56px /detection header: title, tabs with counts, live line, Create Signal. */
export function CompactHeader({ title, tab, onTabChange, counts, updatedAt, onCreateSignal }: CompactHeaderProps) {
  const t = useTranslations("detection");
  const format = useFormatter();
  const now = useNow({ updateInterval: 30_000 });
  return (
    <PageHeader title={title} variant="compact">
      <div className={css.tabs} role="tablist" data-tour="detection-tabs">
        {TABS.map((key) => {
          const count = key === "history" ? null : counts[key];
          return (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={tab === key}
              data-active={tab === key || undefined}
              data-tour={key === "alerts" ? "detection-tab-alerts" : key === "events" ? "detection-tab-events" : undefined}
              className={css.tab}
              onClick={() => onTabChange(key)}
            >
              {t(`tabs.${key}`)}
              {count != null && <span className={css.tabCount}>{format.number(count)}</span>}
            </button>
          );
        })}
      </div>
      <span className={css.spacer} />
      {updatedAt != null && (
        <span className={css.live}>
          <span className={css.liveDot} />
          {t("mapFirst.live", { relative: format.relativeTime(new Date(updatedAt), now) })}
        </span>
      )}
      <button type="button" className={css.createButton} onClick={onCreateSignal} data-tour="detection-create">
        <IconPlus size={14} />
        {t("actions.createSignal")}
      </button>
    </PageHeader>
  );
}
