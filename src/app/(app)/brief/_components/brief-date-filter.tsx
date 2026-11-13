"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Group, Select, Text, TextInput } from "@mantine/core";
import type { DetectionFilters } from "../../detection/_hooks/use-detection-filters";

/** The list's date choices on /brief. The presets are useDetectionFilters' own values. */
export type BriefDateChoice = "brief" | "Last 1 day" | "Last 7 days" | "Last 30 days" | "custom";

const LABEL_STYLE = { fontSize: 10, letterSpacing: "0.05em" } as const;
const INPUT_STYLE = { fontWeight: 600, fontSize: 13, border: "1px solid var(--color-border)" } as const;

/** "YYYY-MM-DD" of an ISO time, in the reader's time zone. */
function dayOf(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** The whole of one or more local days, as ISO bounds; null while either day is missing or they are inverted. */
export function customDayRange(fromDay: string, toDay: string): { from: string; to: string } | null {
  if (!fromDay || !toDay) return null;
  const from = new Date(`${fromDay}T00:00:00`);
  const to = new Date(`${toDay}T23:59:59.999`);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from > to) return null;
  return { from: from.toISOString(), to: to.toISOString() };
}

/**
 * The History list's date picker on /brief: the Brief window (the default),
 * the last 24 hours, 7 or 30 days, or a custom range of days, so an analyst
 * can reach back for earlier context. A plain date input, not @mantine/dates.
 */
export function BriefDateFilter({
  filters,
  windowStart,
  windowEnd,
}: {
  filters: Pick<DetectionFilters, "onDateChange" | "setCustomRange">;
  windowStart: string;
  windowEnd: string;
}) {
  const t = useTranslations("brief.picker");
  const tCommon = useTranslations("common.filters");
  const [choice, setChoice] = useState<BriefDateChoice>("brief");
  const [fromDay, setFromDay] = useState(() => dayOf(windowStart));
  const [toDay, setToDay] = useState(() => dayOf(windowEnd));
  const { onDateChange, setCustomRange } = filters;

  // The Brief window follows Refresh to now.
  useEffect(() => {
    if (choice === "brief") setCustomRange({ from: windowStart, to: windowEnd });
  }, [choice, windowStart, windowEnd, setCustomRange]);

  const choose = (next: BriefDateChoice) => {
    setChoice(next);
    if (next === "custom") {
      const range = customDayRange(fromDay, toDay);
      if (range) setCustomRange(range);
    } else if (next !== "brief") {
      onDateChange(next);
    }
  };

  const setDay = (which: "from" | "to", day: string) => {
    const nextFrom = which === "from" ? day : fromDay;
    const nextTo = which === "to" ? day : toDay;
    if (which === "from") setFromDay(day);
    else setToDay(day);
    const range = customDayRange(nextFrom, nextTo);
    if (range) setCustomRange(range);
  };

  const label = (text: string) => (
    <Text size="xs" c="var(--color-text-muted)" tt="uppercase" style={LABEL_STYLE}>
      {text}
    </Text>
  );

  return (
    <Group gap={8} align="flex-end" wrap="wrap">
      <Select
        size="xs"
        value={choice}
        onChange={(v) => v && choose(v as BriefDateChoice)}
        data={[
          { value: "brief", label: t("dateBrief") },
          { value: "Last 1 day", label: t("date24h") },
          { value: "Last 7 days", label: t("date7d") },
          { value: "Last 30 days", label: t("date30d") },
          { value: "custom", label: t("dateCustom") },
        ]}
        allowDeselect={false}
        style={{ minWidth: 140, maxWidth: 180 }}
        styles={{ input: INPUT_STYLE }}
        label={label(tCommon("date"))}
        data-testid="brief-date-filter"
      />
      {choice === "custom" && (
        <>
          <TextInput
            size="xs"
            type="date"
            value={fromDay}
            max={toDay || undefined}
            onChange={(e) => setDay("from", e.currentTarget.value)}
            label={label(t("from"))}
            styles={{ input: INPUT_STYLE }}
            data-testid="brief-date-from"
          />
          <TextInput
            size="xs"
            type="date"
            value={toDay}
            min={fromDay || undefined}
            onChange={(e) => setDay("to", e.currentTarget.value)}
            label={label(t("to"))}
            styles={{ input: INPUT_STYLE }}
            data-testid="brief-date-to"
          />
        </>
      )}
    </Group>
  );
}
