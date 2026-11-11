"use client";

import { useFormatter, useNow, useTranslations } from "next-intl";
import { Select } from "@mantine/core";
import { IconPlus } from "@tabler/icons-react";
import { PageHeader } from "~/components/ui/page-header";
import { shortCountryName } from "~/lib/constants/country-config";
import { ALL_COUNTRIES } from "~/lib/map-nav-context";
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
  /**
   * The page's country and the ones the user may pick, "All Countries"
   * included where allowed. The picker shows only when there is a choice:
   * the sidebar's picker serves multi-country teams only and has no "All
   * Countries".
   */
  country?: { value: string; options: readonly string[]; onChange: (value: string) => void };
}

const TABS: HeaderTab[] = ["alerts", "events", "signals", "history"];

/** The 56px /detection header: title, country, tabs with counts, live line, Create Signal. */
export function CompactHeader({ title, tab, onTabChange, counts, updatedAt, onCreateSignal, country }: CompactHeaderProps) {
  const t = useTranslations("detection");
  const tFilters = useTranslations("common.filters");
  const format = useFormatter();
  const now = useNow({ updateInterval: 30_000 });
  return (
    <PageHeader title={title} variant="compact">
      {country && country.options.length > 1 && (
        <Select
          size="xs"
          w={160}
          aria-label={tFilters("country")}
          data-testid="detection-country-select"
          value={country.value}
          allowDeselect={false}
          onChange={(v) => {
            if (v && v !== country.value) country.onChange(v);
          }}
          // The value stays the canonical name (it keys location lookups); only the label is shortened.
          data={country.options.map((c) => ({ value: c, label: c === ALL_COUNTRIES ? tFilters("allCountries") : shortCountryName(c) }))}
        />
      )}
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
