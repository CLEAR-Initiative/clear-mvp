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

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(0)}K`;
  return n.toLocaleString();
}

function formatMonth(dateStr: unknown): string {
  if (typeof dateStr !== "string") return String(dateStr ?? "");
  const [year, month] = dateStr.split("-");
  if (!year || !month) return dateStr;
  const d = new Date(Number(year), Number(month) - 1, 1);
  return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

function freshnessColor(lastUpdated: string): string {
  const days = (Date.now() - new Date(lastUpdated).getTime()) / 86_400_000;
  if (days <= 30) return "#22C55E";
  if (days <= 90) return "#F59E0B";
  return "#EF4444";
}

interface SparkTooltipProps { active?: boolean; payload?: Array<{ value?: number }>; label?: string }
function SparkTooltip({ active, payload, label }: SparkTooltipProps) {
  if (!active || !payload?.[0]) return null;
  return (
    <Box style={{
      background: "var(--color-bg-white)", border: "1px solid var(--color-border)",
      borderRadius: 6, padding: "6px 10px",
      boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
    }}>
      <Text style={{ color: "#A3A3A3", fontSize: 10 }}>{label != null ? formatMonth(label) : ""}</Text>
      <Text style={{ color: "#171717", fontSize: 12, fontWeight: 700 }}>
        {payload[0].value !== undefined ? formatCount(payload[0].value) : ""}
      </Text>
    </Box>
  );
}

interface IdpCardProps {
  locationCode: string;
}

export function IdpCard({ locationCode }: IdpCardProps) {
  const query = useQuery({
    queryKey: ["hapi", "idpTrend", locationCode],
    queryFn: () => fetchIdpTrend(locationCode),
    staleTime: 1000 * 60 * 60,
    retry: 1,
  });
  const [infoOpened, { open: openInfo, close: closeInfo }] = useDisclosure(false);

  const cardLabel = (
    <Text style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#A3A3A3", marginBottom: 16 }}>
      IDP Displacement
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
          <IconWifiOff size={24} color="#6B7280" />
          <Text style={{ fontSize: 12, color: "#6B7280" }}>Data unavailable</Text>
          <button
            onClick={() => void query.refetch()}
            style={{
              fontSize: 10, fontWeight: 600, color: "#6B7280",
              background: "var(--color-bg-muted)", border: "1px solid var(--color-border)",
              borderRadius: 5, padding: "4px 10px", cursor: "pointer",
              display: "flex", alignItems: "center", gap: 4,
            }}
          >
            <IconRefresh size={10} /> Retry
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
          <Text style={{ fontSize: 22, color: "rgba(0,0,0,0.1)" }}>&#8862;</Text>
          <Text style={{ fontSize: 13, color: "#525252", fontWeight: 600 }}>No displacement data</Text>
          <Text style={{ fontSize: 11, color: "#737373", lineHeight: 1.4 }}>
            {locationCode} is not tracked in IOM DTM
          </Text>
          {/* TODO: show UNHCR fallback estimate when API access is available */}
          <Text style={{ fontSize: 10, color: "#A3A3A3", fontStyle: "italic", marginTop: 4 }}>
            Coverage varies by country
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
            fontSize: 34, fontWeight: 800, color: "#171717", lineHeight: 1,
            fontVariantNumeric: "tabular-nums", letterSpacing: "-0.03em",
          }}>
            {formatCount(current)}
          </Text>
          <Text style={{ fontSize: 11, color: "#737373", marginTop: 3 }}>
            Internally Displaced &middot; {locationName}
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
              {delta >= 0 ? "+" : ""}{formatCount(Math.abs(delta))}
            </Text>
            <Text style={{ fontSize: 9, color: "#737373" }}>vs last month</Text>
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
          <Text style={{ fontSize: 9, color: "#A3A3A3" }}>
            IOM DTM via HAPI &middot; {formatMonth(lastUpdated)}
          </Text>
        </Group>
        <Box
          onClick={openInfo}
          style={{ cursor: "pointer", color: "#A3A3A3", display: "flex", transition: "color 0.15s" }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "#525252")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "#A3A3A3")}
        >
          <IconInfoCircle size={13} />
        </Box>
      </Group>

      <Modal
        opened={infoOpened}
        onClose={closeInfo}
        title="IDP Displacement: Methodology"
        size="md"
        styles={{
          title: { fontSize: 14, fontWeight: 700, color: "#171717" },
          body: { paddingTop: 4 },
        }}
      >
        <Text style={{ fontSize: 13, color: "#525252", marginBottom: 12, lineHeight: 1.6 }}>
          This card shows the total number of <strong>conflict-induced internally displaced persons (IDPs)</strong> tracked
          by IOM&apos;s Displacement Tracking Matrix (DTM) for the selected country. The figure reflects the latest
          available snapshot, not a cumulative total.
        </Text>

        <Text style={{ fontSize: 12, fontWeight: 600, color: "#171717", marginBottom: 6 }}>What the numbers mean</Text>
        <List spacing={4} mb={14} styles={{ item: { fontSize: 12, color: "#525252", lineHeight: 1.6 } }}>
          <List.Item><strong>Current count</strong>: most recent IDP figure from IOM DTM for the country.</List.Item>
          <List.Item><strong>Month-over-month delta</strong>: change in reported IDPs compared to the previous month&apos;s data point.</List.Item>
          <List.Item><strong>Trend sparkline</strong>: historical monthly IDP counts showing displacement trajectory.</List.Item>
          <List.Item><strong>Freshness dot</strong>: green if updated within 30 days, amber within 90 days, red if older.</List.Item>
        </List>

        <Text style={{ fontSize: 12, fontWeight: 600, color: "#171717", marginBottom: 6 }}>Limitations</Text>
        <List spacing={4} mb={14} styles={{ item: { fontSize: 12, color: "#525252", lineHeight: 1.6 } }}>
          <List.Item>Flood and disaster displacement is <strong>not included</strong>. IOM DTM in this context tracks conflict-induced displacement only.</List.Item>
          <List.Item>Coverage is limited to IOM DTM&apos;s monitoring footprint, which may not capture all displacement situations within a country.</List.Item>
          <List.Item>Data may lag 4 to 8 weeks behind real-world conditions depending on the country operation.</List.Item>
        </List>

        <Text style={{ fontSize: 12, fontWeight: 600, color: "#171717", marginBottom: 6 }}>Source</Text>
        <Group gap={6} align="center">
          <Anchor
            href="https://hapi.humdata.org"
            target="_blank"
            rel="noopener noreferrer"
            style={{ fontSize: 12, color: "#E85D3D" }}
          >
            HAPI: Humanitarian API (humdata.org)
          </Anchor>
          <IconExternalLink size={11} color="#E85D3D" />
        </Group>
        <Text style={{ fontSize: 11, color: "#A3A3A3", marginTop: 4 }}>
          HAPI aggregates IOM DTM data alongside other humanitarian datasets under OCHA&apos;s stewardship.
        </Text>
      </Modal>
    </Box>
  );
}
