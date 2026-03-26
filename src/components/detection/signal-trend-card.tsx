"use client";

import { useState, useMemo } from "react";
import { Box, Text, Group } from "@mantine/core";
import { AreaChart, Area, Tooltip, ResponsiveContainer } from "recharts";
import type { GqlAlert } from "~/lib/types/graphql";
import type { GqlEvent } from "~/lib/types/graphql";

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
      borderRadius: 6,
      padding: "6px 10px",
    }}>
      <Text style={{ color: "#9CA3AF", fontSize: 9, marginBottom: 4 }}>{label}</Text>
      {payload.map((entry, i) => (
        <Group key={i} gap={5} mb={1}>
          <Box style={{ width: 5, height: 5, borderRadius: "50%", background: entry.color, flexShrink: 0 }} />
          <Text style={{ color: "#E5E7EB", fontSize: 10, fontWeight: 600 }}>
            {entry.value} {entry.name}
          </Text>
        </Group>
      ))}
    </Box>
  );
}

export function SignalTrendCard({ alerts, events }: SignalTrendCardProps) {
  const [period, setPeriod] = useState<"7d" | "30d">("7d");
  const days = period === "7d" ? 7 : 30;

  const trendData = useMemo(() => {
    const now = new Date();
    return Array.from({ length: days }, (_, i) => {
      const d = new Date(now);
      d.setDate(now.getDate() - (days - 1 - i));
      const dayStr = d.toISOString().slice(0, 10);
      return {
        date: dayStr,
        Events: events.filter((e) => e.firstSignalCreatedAt.slice(0, 10) === dayStr).length,
        Alerts: alerts.filter((a) => a.event.firstSignalCreatedAt.slice(0, 10) === dayStr).length,
      };
    });
  }, [events, alerts, days]);

  return (
    <Box style={{ height: "100%", display: "flex", flexDirection: "column" }}>

      {/* ── Header ── */}
      <Group justify="space-between" align="center" mb={14}>
        <Text style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#A3A3A3" }}>
          Event Activity
        </Text>
        <Group gap={4}>
          {(["7d", "30d"] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              style={{
                fontSize: 10, fontWeight: 700, padding: "3px 9px",
                borderRadius: 20, border: "1px solid", cursor: "pointer",
                background:  period === p ? "#E85D3D"   : "transparent",
                color:       period === p ? "#fff"      : "#A3A3A3",
                borderColor: period === p ? "#E85D3D"   : "#E5E5E5",
                transition: "all 0.15s ease",
              }}
            >
              {p}
            </button>
          ))}
        </Group>
      </Group>

      {/* ── Live counts ── */}
      <Group gap={24} mb={14}>
        <Box>
          <Group gap={6} align="center" mb={1}>
            <Box style={{ width: 7, height: 7, borderRadius: "50%", background: "#F59E0B", flexShrink: 0 }} />
            <Text style={{ fontSize: 28, fontWeight: 800, color: "#171717", lineHeight: 1, fontVariantNumeric: "tabular-nums", letterSpacing: "-0.03em" }}>
              {events.length}
            </Text>
          </Group>
          <Text style={{ fontSize: 10, color: "#A3A3A3", fontWeight: 500, paddingLeft: 13 }}>Events</Text>
        </Box>
        <Box>
          <Group gap={6} align="center" mb={1}>
            <Box style={{ width: 7, height: 7, borderRadius: "50%", background: "#E85D3D", flexShrink: 0 }} />
            <Text style={{ fontSize: 28, fontWeight: 800, color: "#171717", lineHeight: 1, fontVariantNumeric: "tabular-nums", letterSpacing: "-0.03em" }}>
              {alerts.length}
            </Text>
          </Group>
          <Text style={{ fontSize: 10, color: "#A3A3A3", fontWeight: 500, paddingLeft: 13 }}>Alerts</Text>
        </Box>
      </Group>

      {/* ── Trend chart ── */}
      <Box style={{ flex: 1, minHeight: 60 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={trendData} margin={{ top: 2, right: 2, bottom: 0, left: 2 }}>
            <defs>
              <linearGradient id="stGradEvents" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor="#F59E0B" stopOpacity={0.8} />
                <stop offset="25%"  stopColor="#F59E0B" stopOpacity={0.4} />
                <stop offset="60%"  stopColor="#F59E0B" stopOpacity={0.08} />
                <stop offset="100%" stopColor="#F59E0B" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="stGradAlerts" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor="#E85D3D" stopOpacity={0.8} />
                <stop offset="25%"  stopColor="#E85D3D" stopOpacity={0.4} />
                <stop offset="60%"  stopColor="#E85D3D" stopOpacity={0.08} />
                <stop offset="100%" stopColor="#E85D3D" stopOpacity={0} />
              </linearGradient>
            </defs>
            <Tooltip content={<ChartTooltip />} />
            <Area type="monotone" dataKey="Events" stroke="#F59E0B" strokeWidth={1.5} fill="url(#stGradEvents)" dot={false} />
            <Area type="monotone" dataKey="Alerts" stroke="#E85D3D" strokeWidth={1.5} fill="url(#stGradAlerts)" dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </Box>

    </Box>
  );
}
