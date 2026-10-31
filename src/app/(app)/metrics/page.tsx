"use client";

import { useState } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { keepPreviousData } from "@tanstack/react-query";
import { Alert, Box, SimpleGrid, Stack, Text } from "@mantine/core";
import { IconAlertTriangle, IconInfoCircle } from "@tabler/icons-react";
import { PageHeader } from "~/components/ui";
import { MetricsBodySkeleton } from "~/components/ui/metrics-page-skeleton";
import { api } from "~/trpc/react";
import { StatTiles } from "./_components/stat-tiles";
import { TtdHistogram } from "./_components/ttd-histogram";
import { WeeklyTrend } from "./_components/weekly-trend";
import { ExclusionsCard } from "./_components/exclusions-card";
import { MethodNote } from "./_components/method-note";
import { MetricsFilters, metricsQueryInput, type MetricsFilterValues } from "./_components/metrics-filters";
import { LocationPrecisionSection } from "./_components/location-precision-section";
import { ProgressOverTime } from "./_components/progress-over-time";

/** An Alert in theme tokens: the semantic colour marks the edge and icon,
 * the text stays in text tokens so it reads in light and dark. */
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
 * Admin-only platform metrics: one metric over time by day, week or month
 * (clear-api ADR-0014), then time to detection (ADR-0011) and location
 * precision (ADR-0012) in full. clear-api decides what counts; this page
 * only formats it.
 */
export default function MetricsPage() {
  const t = useTranslations("metrics");
  const format = useFormatter();
  const utcDay = (iso: string) => format.dateTime(new Date(iso), { dateStyle: "medium", timeZone: "UTC" });
  const [filters, setFilters] = useState<MetricsFilterValues>({ from: "", to: "", locationId: null });
  const query = api.metrics.detection.useQuery(metricsQueryInput(filters), {
    refetchOnWindowFocus: false,
    placeholderData: keepPreviousData,
    // A refused range or a non-admin will not change on retry.
    retry: (count, err) => !NO_RETRY.has(err.data?.code ?? "") && count < 2,
  });
  // clear-api refuses an inverted range or one over 364 days with its own
  // message; show it by the dates rather than as a page error.
  const rangeError = query.error?.data?.code === "BAD_REQUEST" ? query.error.message : null;
  const result = query.data;

  return (
    <Box>
      <PageHeader title={t("page.title")} breadcrumbs={["CLEAR", t("page.breadcrumb")]} loading={query.isFetching} />

      <Box p={{ base: 16, sm: 24 }}>
        <Box mb={16}>
          <MetricsFilters values={filters} onChange={setFilters} error={rangeError} />
        </Box>
        <Box mb={32}>
          <ProgressOverTime filters={filters} />
        </Box>
        {rangeError ? null : query.error ? (
          <Alert styles={noticeStyles("critical")} icon={<IconAlertTriangle size={16} />} title={t("error.title")}>
            {query.error.message}
          </Alert>
        ) : result?.status === "unavailable" ? (
          <Alert styles={noticeStyles("warning")} icon={<IconAlertTriangle size={16} />} title={t("unavailable.title")}>
            {t("unavailable.body")}
          </Alert>
        ) : result?.status === "ok" ? (
          <Stack gap={16}>
            <Text size="xs" c="var(--color-text-muted)">
              {t("range", { from: utcDay(result.metrics.from), to: utcDay(result.metrics.to) })}
            </Text>
            {result.metrics.counted === 0 ? (
              <Alert styles={noticeStyles("info")} icon={<IconInfoCircle size={16} />} title={t("empty.title")}>
                {t("empty.body", { inRange: result.metrics.eventsInRange })}
              </Alert>
            ) : (
              <>
                <StatTiles metrics={result.metrics} />
                <SimpleGrid cols={{ base: 1, lg: 2 }} spacing={16}>
                  <TtdHistogram metrics={result.metrics} />
                  <WeeklyTrend metrics={result.metrics} />
                </SimpleGrid>
              </>
            )}
            <SimpleGrid cols={{ base: 1, lg: 2 }} spacing={16}>
              <ExclusionsCard metrics={result.metrics} />
              <MethodNote />
            </SimpleGrid>
          </Stack>
        ) : (
          <Box aria-busy aria-label={t("loading")}>
            <MetricsBodySkeleton />
          </Box>
        )}
        <Box mt={32}>
          <LocationPrecisionSection filters={filters} />
        </Box>
      </Box>
    </Box>
  );
}
