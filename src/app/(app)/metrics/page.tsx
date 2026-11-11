"use client";

import { Suspense, useState } from "react";
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
import {
  agentQueryInput,
  MetricsFilters,
  metricsQueryInput,
  type MetricsFilterValues,
} from "./_components/metrics-filters";
import { LocationPrecisionSection } from "./_components/location-precision-section";
import { MetricsUrlProvider, filtersFromUrl, useMetricsUrl } from "./_components/metrics-url-state";
import { ProgressOverTime } from "./_components/progress-over-time";
import { AgentSection } from "./_components/agent-section";
import { noticeStyles } from "./_components/notice-styles";
import { previousRange, trendRange } from "~/lib/detection-metrics";

const NO_RETRY = new Set(["BAD_REQUEST", "FORBIDDEN", "UNAUTHORIZED"]);

const QUERY_OPTIONS = {
  refetchOnWindowFocus: false,
  placeholderData: keepPreviousData,
  // A refused range or a non-admin will not change on retry.
  retry: (count: number, err: { data?: { code?: string } | null }) => !NO_RETRY.has(err.data?.code ?? "") && count < 2,
};

/**
 * Admin-only platform metrics: one metric over time by day, week or month
 * (clear-api ADR-0014), then time to detection (ADR-0011) and location
 * precision (ADR-0012) in full, and the CLEAR Agent's usage (ADR-0013), what
 * it costs and how fast it answers. clear-api decides what counts; this page
 * only formats it. One date range drives every section; the country filter
 * does not apply to the Agent.
 *
 * Time to detection reads its query three times: the picked range (tiles,
 * histogram, exclusions), the same-length range just before it (the tiles'
 * change), and its trend, which always spans at least 26 weeks ending at the
 * picked end so a change has room to show whatever the range.
 */
export default function MetricsPage() {
  // useSearchParams() suspends while the request's search is unknown; the
  // provider owns the page's URL writes so quick successive changes all land.
  return (
    <Suspense fallback={null}>
      <MetricsUrlProvider>
        <MetricsPageBody />
      </MetricsUrlProvider>
    </Suspense>
  );
}

function MetricsPageBody() {
  const t = useTranslations("metrics");
  const format = useFormatter();
  const utcDay = (iso: string) => format.dateTime(new Date(iso), { dateStyle: "medium", timeZone: "UTC" });
  // The range and country come from the URL on load and go back to it on every change (#1279).
  const url = useMetricsUrl();
  const [filters, setFilters] = useState<MetricsFilterValues>(() => filtersFromUrl(url.state));
  const changeFilters = (values: MetricsFilterValues) => {
    setFilters(values);
    url.update({ from: values.from, to: values.to, locationId: values.locationId });
  };
  // Fixed for the page's life, so the trend's range (and query key) holds still.
  const [now] = useState(() => new Date());
  const input = metricsQueryInput(filters);
  const query = api.metrics.detection.useQuery(input, QUERY_OPTIONS);
  // clear-api refuses an inverted range or one over 364 days with its own
  // message; show it by the dates rather than as a page error.
  const rangeError = query.error?.data?.code === "BAD_REQUEST" ? query.error.message : null;
  const result = query.data;
  // The picked range's own figures: not the last range's, which
  // `keepPreviousData` shows while a new country or range loads.
  const current = result?.status === "ok" && !query.isPlaceholderData ? result.metrics : undefined;

  const trend = trendRange(input, now);
  const trendQuery = api.metrics.detection.useQuery(trend.input, { ...QUERY_OPTIONS, enabled: !rangeError });
  const trendMetrics = trendQuery.data?.status === "ok" ? trendQuery.data.metrics : undefined;

  // The previous period follows the range clear-api resolved, so it works
  // for its default range too. It waits for `current`, so it never pairs one
  // country's figures with another's. While it waits its input is `{}`, which
  // is also the main query's default key, so its data is only read once
  // `current` is there and the data is its own (not a placeholder).
  const previousInput = current
    ? { ...previousRange(current), ...(input.locationId ? { locationId: input.locationId } : {}) }
    : {};
  const previousQuery = api.metrics.detection.useQuery(previousInput, { ...QUERY_OPTIONS, enabled: !!current });
  const previous =
    current && previousQuery.data?.status === "ok" && !previousQuery.isPlaceholderData
      ? previousQuery.data.metrics
      : undefined;

  return (
    <Box>
      <PageHeader title={t("page.title")} breadcrumbs={["CLEAR", t("page.breadcrumb")]} loading={query.isFetching} />

      <Box p={{ base: 16, sm: 24 }}>
        <Box mb={16}>
          <MetricsFilters values={filters} onChange={changeFilters} error={rangeError} />
        </Box>
        <Box mb={32}>
          <ProgressOverTime filters={filters} />
        </Box>
        <Stack gap={12} component="section" aria-labelledby="metrics-detection-heading">
          <Text id="metrics-detection-heading" component="h2" fw={600} c="var(--color-text-primary)" style={{ fontSize: 16 }}>
            {t("detection.title")}
          </Text>
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
                {previous
                  ? t("rangeVs", {
                      from: utcDay(result.metrics.from),
                      to: utcDay(result.metrics.to),
                      prevFrom: utcDay(previous.from),
                      prevTo: utcDay(previous.to),
                    })
                  : t("range", { from: utcDay(result.metrics.from), to: utcDay(result.metrics.to) })}
              </Text>
              {result.metrics.counted === 0 ? (
                <Alert styles={noticeStyles("info")} icon={<IconInfoCircle size={16} />} title={t("empty.title")}>
                  {t("empty.body", { inRange: result.metrics.eventsInRange })}
                </Alert>
              ) : (
                <StatTiles metrics={result.metrics} previous={previous} />
              )}
              <WeeklyTrend
                metrics={trendMetrics}
                showFrom={trend.showFrom}
                loading={trendQuery.isLoading}
                error={trendQuery.error?.message ?? (trendQuery.data?.status === "unavailable" ? t("unavailable.title") : null)}
              />
              {result.metrics.counted === 0 ? (
                <SimpleGrid cols={{ base: 1, lg: 2 }} spacing={16}>
                  <ExclusionsCard metrics={result.metrics} />
                  <MethodNote />
                </SimpleGrid>
              ) : (
                <>
                  <SimpleGrid cols={{ base: 1, lg: 2 }} spacing={16}>
                    <TtdHistogram metrics={result.metrics} />
                    <ExclusionsCard metrics={result.metrics} />
                  </SimpleGrid>
                  <MethodNote />
                </>
              )}
            </Stack>
          ) : (
            <Box aria-busy aria-label={t("loading")}>
              <MetricsBodySkeleton />
            </Box>
          )}
        </Stack>
        <Box mt={32}>
          <LocationPrecisionSection filters={filters} />
        </Box>
        {rangeError ? null : (
          <Box mt={32}>
            <AgentSection input={agentQueryInput(filters)} />
          </Box>
        )}
      </Box>
    </Box>
  );
}
