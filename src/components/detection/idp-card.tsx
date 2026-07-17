"use client";

import { Box, Text, Group, Skeleton, Modal, Anchor, List } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconWifiOff, IconInfoCircle, IconRefresh, IconExternalLink } from "@tabler/icons-react";
import {
  AreaChart,
  Area,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from "recharts";
import { useQuery } from "@tanstack/react-query";
import { useFormatter, useTranslations } from "next-intl";

const HAPI_BASE = "https://hapi.humdata.org/api/v2";
const HAPI_APP_ID = "Y2xlYXItbXZwOmRldkBzeW50cm8uZmk=";

interface HapiIdpRecord {
  population: number;
  operation: string;
  reference_period_end: string;
  location_name: string;
}

async function fetchIdpTrend(locationCode: string) {
  const url = new URL(`${HAPI_BASE}/affected-people/idps`);
  url.searchParams.set("location_code", locationCode.toUpperCase());
  url.searchParams.set("admin_level", "0");
  url.searchParams.set("output_format", "json");
  url.searchParams.set("limit", "500");
  url.searchParams.set("app_identifier", HAPI_APP_ID);

  const res = await fetch(url.toString());

  if (!res.ok) throw new Error(`HAPI request failed: ${res.status}`);

  const json = await res.json() as { data?: HapiIdpRecord[] };
  const records: HapiIdpRecord[] = json.data ?? [];

  if (records.length === 0) return { available: false as const, locationCode };

  const overviewRecords = records.filter((r) => r.operation.includes("Overview"));
  const series = overviewRecords.length > 0 ? overviewRecords : records;

  const sorted = [...series].sort(
    (a, b) => new Date(a.reference_period_end).getTime() - new Date(b.reference_period_end).getTime(),
  );

  const byMonth = new Map<string, HapiIdpRecord>();
  for (const r of sorted) {
    byMonth.set(r.reference_period_end.slice(0, 7), r);
  }

  const trend = Array.from(byMonth.values())
    .slice(-12)
    .map((r) => ({ date: r.reference_period_end.slice(0, 7), value: r.population }));

  const latest = trend[trend.length - 1];
  const previous = trend[trend.length - 2];

  return {
    available: true as const,
    locationCode,
    current: latest?.value ?? 0,
    lastUpdated: sorted[sorted.length - 1]?.reference_period_end ?? "",
    delta: previous && latest ? latest.value - previous.value : null,
    trend,
    locationName: sorted[sorted.length - 1]?.location_name ?? locationCode,
  };
}

type IntlFormatter = ReturnType<typeof useFormatter>;

function formatMonth(format: IntlFormatter, dateStr: unknown): string {
  if (typeof dateStr !== "string") return String(dateStr ?? "");
  const [year, month] = dateStr.split("-");
  if (!year || !month) return dateStr;
  const d = new Date(Number(year), Number(month) - 1, 1);
  return format.dateTime(d, { month: "short", year: "numeric" });
}

function freshnessColor(lastUpdated: string): string {
  const days = (Date.now() - new Date(lastUpdated).getTime()) / 86_400_000;
  if (days <= 30) return "#22C55E";
  if (days <= 90) return "#F59E0B";
  return "#EF4444";
}

interface SparkTooltipProps { active?: boolean; payload?: Array<{ value?: number }>; label?: string }
function SparkTooltip({ active, payload, label }: SparkTooltipProps) {
  const format = useFormatter();
  if (!active || !payload?.[0]) return null;
  return (
    <Box style={{
      background: "var(--color-bg-white)", border: "1px solid var(--color-border)",
      borderRadius: 6, padding: "6px 10px",
      boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
    }}>
      <Text style={{ color: "var(--color-text-muted)", fontSize: 10 }}>{label != null ? formatMonth(format, label) : ""}</Text>
      <Text style={{ color: "var(--color-text-primary)", fontSize: 12, fontWeight: 700 }}>
        {payload[0].value !== undefined ? format.number(payload[0].value, "compact") : ""}
      </Text>
    </Box>
  );
}

interface IdpCardProps {
  locationCode: string;
}

export function IdpCard({ locationCode }: IdpCardProps) {
  const format = useFormatter();
  const t = useTranslations("detection");
  const tCommon = useTranslations("common");
  const strong = (chunks: React.ReactNode) => <strong>{chunks}</strong>;
  const query = useQuery({
    queryKey: ["hapi", "idpTrend", locationCode],
    queryFn: () => fetchIdpTrend(locationCode),
    staleTime: 1000 * 60 * 60,
    retry: 1,
  });
  const [infoOpened, { open: openInfo, close: closeInfo }] = useDisclosure(false);

  const cardLabel = (
    <Text style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--color-text-muted)", marginBottom: 16 }}>
      {t("kpi.idp.title")}
    </Text>
  );

  if (query.isLoading) {
    return (
      <Box style={{ height: "100%", display: "flex", flexDirection: "column" }}>
        {cardLabel}
        <Skeleton height={28} mb={8} radius={4} />
        <Skeleton height={12} width="60%" mb={16} radius={4} />
        <Box style={{ flex: 1 }}>
          <Skeleton height="100%" radius={4} />
        </Box>
      </Box>
    );
  }

  if (query.isError) {
    return (
      <Box style={{ height: "100%", display: "flex", flexDirection: "column" }}>
        {cardLabel}
        <Box style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8 }}>
          <IconWifiOff size={24} color="var(--color-text-muted)" />
          <Text style={{ fontSize: 12, color: "var(--color-text-muted)" }}>{t("kpi.idp.unavailable")}</Text>
          <button
            onClick={() => void query.refetch()}
            style={{
              fontSize: 10, fontWeight: 600, color: "var(--color-text-muted)",
              background: "var(--color-bg-muted)", border: "1px solid var(--color-border)",
              borderRadius: 5, padding: "4px 10px", cursor: "pointer",
              display: "flex", alignItems: "center", gap: 4,
            }}
          >
            <IconRefresh size={10} /> {tCommon("actions.retry")}
          </button>
        </Box>
      </Box>
    );
  }

  const data = query.data;

  if (!data?.available) {
    return (
      <Box style={{ height: "100%", display: "flex", flexDirection: "column" }}>
        {cardLabel}
        <Box style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6, textAlign: "center" }}>
          <Text style={{ fontSize: 22, color: "var(--color-text-muted)", opacity: 0.35 }}>&#8862;</Text>
          <Text style={{ fontSize: 13, color: "var(--color-text-secondary)", fontWeight: 600 }}>{t("kpi.idp.noData")}</Text>
          <Text style={{ fontSize: 11, color: "var(--color-text-muted)", lineHeight: 1.4 }}>
            {t("kpi.idp.notTracked", { code: locationCode })}
          </Text>
          {/* TODO: show UNHCR fallback estimate when API access is available */}
          <Text style={{ fontSize: 10, color: "var(--color-text-muted)", fontStyle: "italic", marginTop: 4 }}>
            {t("kpi.idp.coverageVaries")}
          </Text>
        </Box>
      </Box>
    );
  }

  const { current, delta, trend, lastUpdated, locationName } = data;
  const dot = freshnessColor(lastUpdated);

  return (
    <Box style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      {cardLabel}

      {/* top section */}
      <Group justify="space-between" align="flex-start" mb={4}>
        <Box>
          <Text style={{
            fontSize: 34, fontWeight: 800, color: "var(--color-text-primary)", lineHeight: 1,
            fontVariantNumeric: "tabular-nums", letterSpacing: "-0.03em",
          }}>
            {format.number(current, "compact")}
          </Text>
          <Text style={{ fontSize: 11, color: "var(--color-text-muted)", marginTop: 3 }}>
            {t("kpi.idp.internallyDisplaced")} &middot; {locationName}
          </Text>
        </Box>
        {delta !== null && (
          <Box style={{
            padding: "3px 8px", borderRadius: 5, marginTop: 4,
            background: delta >= 0 ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.12)",
            border: `1px solid ${delta >= 0 ? "rgba(34,197,94,0.25)" : "rgba(239,68,68,0.25)"}`,
          }}>
            <Text style={{
              fontSize: 11, fontWeight: 700,
              color: delta >= 0 ? "#22C55E" : "#EF4444",
              fontVariantNumeric: "tabular-nums",
            }}>
              {delta >= 0 ? "+" : ""}{format.number(Math.abs(delta), "compact")}
            </Text>
            <Text style={{ fontSize: 9, color: "var(--color-text-muted)" }}>{t("kpi.idp.vsLastMonth")}</Text>
          </Box>
        )}
      </Group>

      {/* sparkline */}
      <Box style={{ flex: 1, minHeight: 60 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={trend} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="idpFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"  stopColor="#E85D3D" stopOpacity={0.8} />
                <stop offset="25%" stopColor="#E85D3D" stopOpacity={0.4} />
                <stop offset="60%" stopColor="#E85D3D" stopOpacity={0.08} />
                <stop offset="100%" stopColor="#E85D3D" stopOpacity={0} />
              </linearGradient>
            </defs>
            <RechartsTooltip content={<SparkTooltip />} />
            <Area
              type="monotone" dataKey="value"
              stroke="#E85D3D" strokeWidth={1.5}
              fill="url(#idpFill)" dot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </Box>

      {/* footer */}
      <Group justify="space-between" align="center" mt={10}>
        <Group gap={5} align="center">
          <Box style={{ width: 6, height: 6, borderRadius: "50%", background: dot }} />
          <Text style={{ fontSize: 9, color: "var(--color-text-muted)" }}>
            {t("kpi.idp.sourceLine")} &middot; {formatMonth(format, lastUpdated)}
          </Text>
        </Group>
        <Box
          onClick={openInfo}
          style={{ cursor: "pointer", color: "var(--color-text-muted)", display: "flex", transition: "color 0.15s" }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "var(--color-text-secondary)")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "var(--color-text-muted)")}
        >
          <IconInfoCircle size={13} />
        </Box>
      </Group>

      <Modal
        opened={infoOpened}
        onClose={closeInfo}
        title={t("kpi.idp.modal.title")}
        size="md"
        styles={{
          title: { fontSize: 14, fontWeight: 700, color: "var(--color-text-primary)" },
          body: { paddingTop: 4 },
        }}
      >
        <Text style={{ fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 12, lineHeight: 1.6 }}>
          {t.rich("kpi.idp.modal.intro", { strong })}
        </Text>

        <Text style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-primary)", marginBottom: 6 }}>{t("kpi.idp.modal.numbersHeading")}</Text>
        <List spacing={4} mb={14} styles={{ item: { fontSize: 12, color: "var(--color-text-secondary)", lineHeight: 1.6 } }}>
          <List.Item>{t.rich("kpi.idp.modal.numberCurrent", { strong })}</List.Item>
          <List.Item>{t.rich("kpi.idp.modal.numberDelta", { strong })}</List.Item>
          <List.Item>{t.rich("kpi.idp.modal.numberTrend", { strong })}</List.Item>
          <List.Item>{t.rich("kpi.idp.modal.numberFreshness", { strong })}</List.Item>
        </List>

        <Text style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-primary)", marginBottom: 6 }}>{t("kpi.idp.modal.limitationsHeading")}</Text>
        <List spacing={4} mb={14} styles={{ item: { fontSize: 12, color: "var(--color-text-secondary)", lineHeight: 1.6 } }}>
          <List.Item>{t.rich("kpi.idp.modal.limitationFloods", { strong })}</List.Item>
          <List.Item>{t("kpi.idp.modal.limitationCoverage")}</List.Item>
          <List.Item>{t("kpi.idp.modal.limitationLag")}</List.Item>
        </List>

        <Text style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-primary)", marginBottom: 6 }}>{t("kpi.idp.modal.sourceHeading")}</Text>
        <Group gap={6} align="center">
          <Anchor
            href="https://hapi.humdata.org"
            target="_blank"
            rel="noopener noreferrer"
            style={{ fontSize: 12, color: "#E85D3D" }}
          >
            {t("kpi.idp.modal.sourceLink")}
          </Anchor>
          <IconExternalLink size={11} color="#E85D3D" />
        </Group>
        <Text style={{ fontSize: 11, color: "var(--color-text-muted)", marginTop: 4 }}>
          {t("kpi.idp.modal.sourceNote")}
        </Text>
      </Modal>
    </Box>
  );
}
