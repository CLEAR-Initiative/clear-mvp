"use client";

import { useMemo, useState } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { keepPreviousData } from "@tanstack/react-query";
import { Alert, Box, Button, Card, Group, SegmentedControl, Skeleton, Stack, Table, Text } from "@mantine/core";
import { IconAlertTriangle, IconDownload } from "@tabler/icons-react";
import { PageHeader, StatsGrid } from "~/components/ui";
import { api } from "~/trpc/react";

/** An Alert in theme tokens, as on /metrics. */
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
const WINDOWS = ["7", "30", "90"] as const;
type WindowDays = (typeof WINDOWS)[number];

function saveCsv(csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `clear-nrc-activity-${new Date().toISOString().slice(0, 7)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** Admin-only usage activity: generic action counts, agent usage, and the
 * NRC aggregate export. clear-api computes everything; this page formats it. */
export default function AdminActivityPage() {
  const t = useTranslations("adminActivity");
  const format = useFormatter();
  const [days, setDays] = useState<WindowDays>("30");
  const range = useMemo(() => {
    const to = new Date();
    const from = new Date(to.getTime() - Number(days) * 24 * 60 * 60 * 1000);
    return { from: from.toISOString(), to: to.toISOString() };
  }, [days]);
  const query = api.adminActivity.overview.useQuery(range, {
    refetchOnWindowFocus: false,
    placeholderData: keepPreviousData,
    retry: (count, err) => !NO_RETRY.has(err.data?.code ?? "") && count < 2,
  });
  const exportCsv = api.adminActivity.nrcExport.useMutation({ onSuccess: ({ csv }) => saveCsv(csv) });
  const result = query.data;
  const num = (n: number) => format.number(n);

  return (
    <Box>
      <PageHeader
        title={t("page.title")}
        breadcrumbs={["CLEAR", t("page.breadcrumbAdmin"), t("page.breadcrumb")]}
        loading={query.isFetching}
      />

      <Box p={{ base: 16, sm: 24 }}>
        <Stack gap={16}>
          <Group justify="space-between" wrap="wrap">
            <SegmentedControl
              aria-label={t("window.label")}
              value={days}
              onChange={(v) => setDays(v as WindowDays)}
              data={WINDOWS.map((d) => ({ value: d, label: t("window.days", { days: Number(d) }) }))}
            />
          </Group>

          {query.error ? (
            <Alert styles={noticeStyles("critical")} icon={<IconAlertTriangle size={16} />} title={t("error.title")}>
              {query.error.message}
            </Alert>
          ) : result?.status === "unavailable" ? (
            <Alert styles={noticeStyles("warning")} icon={<IconAlertTriangle size={16} />} title={t("unavailable.title")}>
              {t("unavailable.body")}
            </Alert>
          ) : result?.status === "ok" ? (
            <>
              <Card p="lg" style={{ border: "1px solid var(--color-border)" }}>
                <Text fw={600} mb={12} c="var(--color-text-primary)">
                  {t("actions.title")}
                </Text>
                {result.overview.activity.totals.actions.length === 0 ? (
                  <Text size="sm" c="var(--color-text-muted)">
                    {t("actions.empty")}
                  </Text>
                ) : (
                  <Table>
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th>{t("actions.action")}</Table.Th>
                        <Table.Th ta="end">{t("actions.count")}</Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {result.overview.activity.totals.actions.map((row) => (
                        <Table.Tr key={row.action}>
                          <Table.Td>{row.action}</Table.Td>
                          <Table.Td ta="end">{num(row.count)}</Table.Td>
                        </Table.Tr>
                      ))}
                      <Table.Tr>
                        <Table.Td fw={600}>{t("actions.total")}</Table.Td>
                        <Table.Td ta="end" fw={600}>
                          {num(result.overview.activity.totals.total)}
                        </Table.Td>
                      </Table.Tr>
                    </Table.Tbody>
                  </Table>
                )}
              </Card>

              <Text fw={600} c="var(--color-text-primary)">
                {t("agent.title")}
              </Text>
              <StatsGrid
                cols={5}
                mb={0}
                stats={[
                  { label: t("agent.turns"), value: num(result.overview.agent.turns) },
                  { label: t("agent.distinctUsers"), value: num(result.overview.agent.distinctUsers) },
                  { label: t("agent.answers"), value: num(result.overview.agent.answers) },
                  {
                    label: t("agent.cost"),
                    value: format.number(result.overview.agent.costUsd, { style: "currency", currency: "USD" }),
                  },
                  {
                    label: t("agent.tokens"),
                    value: format.number(result.overview.agent.inputTokens + result.overview.agent.outputTokens, {
                      notation: "compact",
                    }),
                    sub: t("agent.tokensSplit", {
                      input: num(result.overview.agent.inputTokens),
                      output: num(result.overview.agent.outputTokens),
                    }),
                  },
                ]}
              />
              <Card p="lg" style={{ border: "1px solid var(--color-border)" }}>
                <Text fw={600} mb={12} c="var(--color-text-primary)">
                  {t("agent.byRoute")}
                </Text>
                {result.overview.agent.byRoute.length === 0 ? (
                  <Text size="sm" c="var(--color-text-muted)">
                    {t("agent.empty")}
                  </Text>
                ) : (
                  <Table>
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th>{t("agent.route")}</Table.Th>
                        <Table.Th ta="end">{t("agent.turns")}</Table.Th>
                        <Table.Th ta="end">{t("agent.distinctUsers")}</Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {result.overview.agent.byRoute.map((row) => (
                        <Table.Tr key={row.route}>
                          <Table.Td>{row.route}</Table.Td>
                          <Table.Td ta="end">{num(row.turns)}</Table.Td>
                          <Table.Td ta="end">{num(row.distinctUsers)}</Table.Td>
                        </Table.Tr>
                      ))}
                    </Table.Tbody>
                  </Table>
                )}
              </Card>
            </>
          ) : (
            <Box aria-busy aria-label={t("loading")}>
              <Skeleton height={240} />
            </Box>
          )}

          <Card p="lg" style={{ border: "1px solid var(--color-border)" }}>
            <Text fw={600} mb={4} c="var(--color-text-primary)">
              {t("export.title")}
            </Text>
            <Text size="sm" mb={12} c="var(--color-text-secondary)">
              {t("export.note")}
            </Text>
            <Group>
              <Button
                leftSection={<IconDownload size={16} />}
                loading={exportCsv.isPending}
                disabled={result?.status !== "ok"}
                onClick={() => exportCsv.mutate()}
              >
                {t("export.button")}
              </Button>
            </Group>
            {exportCsv.error ? (
              <Text size="sm" mt={8} c="var(--color-critical)">
                {exportCsv.error.message}
              </Text>
            ) : null}
          </Card>
        </Stack>
      </Box>
    </Box>
  );
}
