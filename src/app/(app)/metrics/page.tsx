"use client";

import { useTranslations } from "next-intl";
import { Alert, Box, Stack, Text } from "@mantine/core";
import { IconAlertTriangle } from "@tabler/icons-react";
import { PageHeader } from "~/components/ui";
import { api } from "~/trpc/react";
import { StatTiles } from "./_components/stat-tiles";
import { TtdHistogram } from "./_components/ttd-histogram";

/**
 * Admin-only platform metrics. Today: time to detection (clear-api
 * ADR-0011) — how soon after an event's onset CLEAR received its first
 * signal. clear-api decides what counts; this page only formats it.
 */
export default function MetricsPage() {
  const t = useTranslations("metrics");
  const query = api.metrics.detection.useQuery(undefined, { refetchOnWindowFocus: false });
  const result = query.data;

  return (
    <Box>
      <PageHeader title={t("page.title")} breadcrumbs={["CLEAR", t("page.breadcrumb")]} loading={query.isFetching} />

      <Box p={{ base: 16, sm: 24 }}>
        {query.error ? (
          <Alert color="red" icon={<IconAlertTriangle size={16} />} title={t("error.title")}>
            {query.error.message}
          </Alert>
        ) : result?.status === "unavailable" ? (
          <Alert color="yellow" icon={<IconAlertTriangle size={16} />} title={t("unavailable.title")}>
            {t("unavailable.body")}
          </Alert>
        ) : result?.status === "ok" ? (
          <Stack gap={0}>
            <StatTiles metrics={result.metrics} />
            <TtdHistogram metrics={result.metrics} />
          </Stack>
        ) : (
          <Text size="sm" c="var(--color-text-muted)">
            {t("loading")}
          </Text>
        )}
      </Box>
    </Box>
  );
}
