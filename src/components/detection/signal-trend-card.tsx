"use client";

import { useState } from "react";
import { Box, Text, Group } from "@mantine/core";
import {
  AreaChart,
  Area,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { GqlAlert } from "~/lib/types/graphql";
import type { GqlEvent } from "~/lib/types/graphql";

// TODO: wire to real detection router for signal counts
const MOCK_TREND = Array.from({ length: 30 }, (_, i) => ({
  date: new Date(Date.now() - (29 - i) * 86400000).toISOString().split("T")[0] ?? "",
  signals: 18 + Math.floor((i * 7 + 13) % 12),
  events: 2 + Math.floor((i * 3 + 5) % 5),
  alerts: Math.floor((i * 2 + 1) % 4),
}));

interface SignalTrendCardProps {
  alerts: GqlAlert[];
  events: GqlEvent[];
}

interface TooltipEntry { name?: string; value?: number; color?: string }
interface ChartTooltipProps { active?: boolean; payload?: TooltipEntry[]; label?: string }

function ChartTooltip({ active, payload, label }: ChartTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <Box style={{
      background: "#1F2937",
      border: "1px solid rgba(255,255,255,0.08)",
      borderRadius: 8,
      padding: "8px 12px",
      fontSize: 11,
    }}>
      <Text style={{ color: "#9CA3AF", fontSize: 10, marginBottom: 4 }}>{label}</Text>
      {payload.map((entry, i) => (
        <Group key={i} gap={6} mb={2}>
          <Box style={{ width: 6, height: 6, borderRadius: "50%", background: entry.color, flexShrink: 0 }} />
          <Text style={{ color: "#E5E7EB", fontSize: 11, fontWeight: 600 }}>
            {entry.value} {entry.name}
          </Text>
        </Group>
      ))}
    </Box>
  );
}

export function SignalTrendCard({ alerts, events }: SignalTrendCardProps) {
  const [period, setPeriod] = useState<"7d" | "30d">("7d");

  const liveCounts = {
    // TODO: wire signals count to real detection router
    signals: MOCK_TREND[MOCK_TREND.length - 1]?.signals ?? 0,
    events: events.length,
    alerts: alerts.length,
  };

  const sliced = period === "7d" ? MOCK_TREND.slice(-7) : MOCK_TREND;

  const statRows = [
    { dot: "#64748B", value: liveCounts.signals, label: "Signals" },
    { dot: "#F59E0B", value: liveCounts.events,  label: "Events"  },
    { dot: "#E85D3D", value: liveCounts.alerts,  label: "Alerts"  },
  ];

  return (
    <Box style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      {/* header */}
      <Group justify="space-between" align="center" mb={16}>
        <Text style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#6B7280" }}>
          Signal Activity
        </Text>
        <Group gap={4}>
          {(["7d", "30d"] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              style={{
                fontSize: 10, fontWeight: 700, padding: "3px 9px",
                borderRadius: 20, border: "1px solid", cursor: "pointer",
                background: period === p ? "#E85D3D" : "transparent",
                color:      period === p ? "#fff"     : "#6B7280",
                borderColor:period === p ? "#E85D3D"  : "rgba(255,255,255,0.12)",
                transition: "all 0.15s ease",
              }}
            >
              {p}
            </button>
          ))}
        </Group>
      </Group>

      {/* chart + right panel */}
      <Box style={{ flex: 1, display: "flex", gap: 0, minHeight: 0 }}>
        {/* chart ~65% */}
        <Box style={{ flex: "0 0 65%", minHeight: 100 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={sliced} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="fillSignals" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#64748B" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#64748B" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="fillEvents" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#F59E0B" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#F59E0B" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="fillAlerts" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#E85D3D" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#E85D3D" stopOpacity={0} />
                </linearGradient>
              </defs>
              <Tooltip content={<ChartTooltip />} />
              <Area type="monotone" dataKey="signals" stroke="#64748B" strokeWidth={1.5} fill="url(#fillSignals)" dot={false} />
              <Area type="monotone" dataKey="events"  stroke="#F59E0B" strokeWidth={1.5} fill="url(#fillEvents)"  dot={false} />
              <Area type="monotone" dataKey="alerts"  stroke="#E85D3D" strokeWidth={1.5} fill="url(#fillAlerts)"  dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </Box>

        {/* divider */}
        <Box style={{ width: 1, background: "rgba(255,255,255,0.06)", flexShrink: 0, margin: "0 16px" }} />

        {/* right stats ~35% */}
        <Box style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: 14 }}>
          {statRows.map(({ dot, value, label }) => (
            <Box key={label}>
              <Group gap={6} align="center" mb={2}>
                <Box style={{ width: 7, height: 7, borderRadius: "50%", background: dot, flexShrink: 0 }} />
                <Text style={{
                  fontSize: 26, fontWeight: 700, color: "#F9FAFB", lineHeight: 1,
                  fontVariantNumeric: "tabular-nums", letterSpacing: "-0.02em",
                }}>
                  {value}
                </Text>
              </Group>
              <Text style={{ fontSize: 10, color: "#6B7280", fontWeight: 500, paddingLeft: 13 }}>
                {label}
              </Text>
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  );
}
