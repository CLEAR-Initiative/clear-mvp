"use client";

import { useState } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { keepPreviousData } from "@tanstack/react-query";
import { Alert, Box, Group, MultiSelect, SimpleGrid, Stack, Text } from "@mantine/core";
import { IconAlertTriangle, IconInfoCircle } from "@tabler/icons-react";
import { MetricsBodySkeleton } from "~/components/ui/metrics-page-skeleton";
import { api } from "~/trpc/react";
import { filterSources } from "~/lib/location-precision";
import { metricsQueryInput, type MetricsFilterValues } from "./metrics-filters";
import { PrecisionTiles } from "./precision-tiles";
import { PrecisionBySource } from "./precision-by-source";
import { PrecisionWeekly } from "./precision-weekly";
import { PrecisionMethodNote } from "./precision-method-note";

/** An Alert in theme tokens, as the page's own notices are styled. */
function noticeStyles(tone: "critical" | "warning" | "info") {
  return {
    root: {
      background: `var(--color-${tone}-light)`,
      borderInlineStart: `3px solid var(--color-${tone})`,
    },
    icon: { color: `var(--color-${tone})` },
    title: { color: "var(--color-text-primary)" },
    message: { color: "var(--color-text-secondary)" },
  };
}

const NO_RETRY = new Set(["BAD_REQUEST", "FORBIDDEN", "UNAUTHORIZED"]);

/**
 * Location precision (clear-api ADR-0012) on the admin /metrics page: how
 * finely the pipeline placed the signals it located, per source and week.
 * Shares the page's date range and country; adds its own source picker,
 * applied here on the fetched rows so a pick never refetches.
 */
export function LocationPrecisionSection({ filters }: { filters: MetricsFilterValues }) {
  const t = useTranslations("metrics.precision");
  const format = useFormatter();
  const [sources, setSources] = useState<string[]>([]);
  const query = api.metrics.locationPrecision.useQuery(metricsQueryInput(filters), {
    refetchOnWindowFocus: false,
    placeholderData: keepPreviousData,
    retry: (count, err) => !NO_RETRY.has(err.data?.code ?? "") && count < 2,
  });
  const result = query.data;
  // The page already shows clear-api's range message by the date fields.
  const rangeError = query.error?.data?.code === "BAD_REQUEST";
  const all = result?.status === "ok" ? result.metrics : null;
  const metrics = all ? filterSources(all, sources) : null;
  const utcDay = (iso: string) => format.dateTime(new Date(iso), { dateStyle: "medium", timeZone: "UTC" });

  return (
    <Stack gap={16} component="section" aria-labelledby="location-precision-title">
      <Group justify="space-between" align="flex-end" wrap="wrap" gap={12}>
        <Box style={{ minWidth: 0 }}>
          <Text id="location-precision-title" component="h2" size="lg" fw={700} c="var(--color-text-primary)">
            {t("title")}
          </Text>
          <Text size="sm" c="var(--color-text-secondary)" maw={720}>
            {t("subtitle")}
          </Text>
        </Box>
        <MultiSelect
          id="location-precision-sources"
          label={t("sources.label")}
          placeholder={sources.length === 0 ? t("sources.placeholder") : undefined}
          data={all?.bySource.map((row) => row.source) ?? []}
          value={sources}
          onChange={setSources}
          disabled={!all}
          searchable
          clearable
          size="xs"
          w={{ base: "100%", sm: 320 }}
        />
      </Group>
      {rangeError ? null : query.error ? (
        <Alert styles={noticeStyles("critical")} icon={<IconAlertTriangle size={16} />} title={t("error.title")}>
          {query.error.message}
        </Alert>
      ) : result?.status === "unavailable" ? (
        <Alert styles={noticeStyles("warning")} icon={<IconAlertTriangle size={16} />} title={t("unavailable.title")}>
          {t("unavailable.body")}
        </Alert>
      ) : all && metrics ? (
        <>
          <Text size="xs" c="var(--color-text-muted)">
            {t("range", { from: utcDay(all.from), to: utcDay(all.to) })}
          </Text>
          {metrics.totals.total === 0 ? (
            <Alert styles={noticeStyles("info")} icon={<IconInfoCircle size={16} />} title={t("empty.title")}>
              {t("empty.body")}
            </Alert>
          ) : (
            <>
              <PrecisionTiles metrics={metrics} />
              <SimpleGrid cols={{ base: 1, lg: 2 }} spacing={16}>
                <PrecisionBySource metrics={metrics} />
                <PrecisionWeekly metrics={metrics} />
              </SimpleGrid>
            </>
          )}
          <PrecisionMethodNote />
        </>
      ) : (
        <Box aria-busy aria-label={t("loading")}>
          <MetricsBodySkeleton />
        </Box>
      )}
    </Stack>
  );
}
