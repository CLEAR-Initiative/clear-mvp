"use client";

import { useMemo, useState } from "react";
import { Box, Text, Group, Badge, Card, Skeleton } from "@mantine/core";
import type { GqlAlert } from "~/lib/types/graphql";
import { severityColor } from "~/lib/types/graphql";

interface KpiCardsProps {
  alerts: GqlAlert[];
  loading: boolean;
}

const TYPE_COLORS = ["#DC2626", "#D97706", "#2563EB", "#EA580C", "#059669", "#7C3AED", "#A3A3A3"];

export function KpiCards({ alerts, loading }: KpiCardsProps) {
  const [trendPeriod, setTrendPeriod] = useState<"7d" | "30d">("7d");

  // Severity breakdown
  const counts = useMemo(() => ({
    critical: alerts.filter((a) => a.severity >= 5).length,
    high:     alerts.filter((a) => a.severity === 4).length,
    medium:   alerts.filter((a) => a.severity === 3).length,
    low:      alerts.filter((a) => a.severity <= 2).length,
  }), [alerts]);

  const total = alerts.length;

  // Trend sparkline: count per day for last 7 or 30 days
  const trendPoints = useMemo(() => {
    const days = trendPeriod === "7d" ? 7 : 30;
    const now = new Date();
    return Array.from({ length: days }, (_, i) => {
      const d = new Date(now);
      d.setDate(now.getDate() - (days - 1 - i));
      const dayStr = d.toISOString().slice(0, 10);
      return alerts.filter(
        (a) => (a.firstSignalCreatedAt ?? a.createdAt).slice(0, 10) === dayStr,
      ).length;
    });
  }, [alerts, trendPeriod]);

  const trendMax = Math.max(...trendPoints, 1);
  const lastDay = trendPoints[trendPoints.length - 1] ?? 0;
  const prevDay = trendPoints[trendPoints.length - 2] ?? 0;
  const trendUp = lastDay > prevDay;
  const trendDown = lastDay < prevDay;

  const sparkWidth = 200;
  const sparkHeight = 48;
  const sparkPoints = trendPoints
    .map((count, i) => {
      const x = Math.round((i / (trendPoints.length - 1)) * sparkWidth);
      const y = Math.round(sparkHeight - 4 - ((count / trendMax) * (sparkHeight - 8)));
      return `${x},${y}`;
    })
    .join(" ");

  // Area path: line + down to bottom-right + bottom-left
  const firstX = 0;
  const lastX = sparkWidth;
  const areaPath = `M ${sparkPoints.split(" ")[0]} L ${sparkPoints.split(" ").join(" L ")} L ${lastX},${sparkHeight} L ${firstX},${sparkHeight} Z`;

  // Event type breakdown for donut
  const typeBreakdown = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const a of alerts) {
      counts[a.eventType] = (counts[a.eventType] ?? 0) + 1;
    }
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    const top4 = sorted.slice(0, 4);
    const otherCount = sorted.slice(4).reduce((s, [, c]) => s + c, 0);
    if (otherCount > 0) top4.push(["Other", otherCount]);
    const t = total || 1;
    return top4.map(([type, count], i) => ({
      type,
      count,
      pct: Math.round((count / t) * 100),
      color: TYPE_COLORS[i] ?? "#A3A3A3",
    }));
  }, [alerts, total]);

  const topType = typeBreakdown[0];

  const conicGradient = useMemo(() => {
    if (typeBreakdown.length === 0) return "conic-gradient(#E5E5E5 0deg 360deg)";
    let angle = 0;
    const parts = typeBreakdown.map(({ pct, color }) => {
      const start = angle;
      angle += pct * 3.6;
      return `${color} ${start}deg ${angle}deg`;
    });
    if (angle < 360) parts.push(`#E5E5E5 ${angle}deg 360deg`);
    return `conic-gradient(${parts.join(", ")})`;
  }, [typeBreakdown]);

  // Escalation: new critical alerts in last 24h vs previous 24h
  const escalation = useMemo(() => {
    const now = Date.now();
    const last24 = alerts.filter((a) => {
      const age = now - new Date(a.firstSignalCreatedAt ?? a.createdAt).getTime();
      return age < 86_400_000 && a.severity >= 5;
    }).length;
    const prev24 = alerts.filter((a) => {
      const age = now - new Date(a.firstSignalCreatedAt ?? a.createdAt).getTime();
      return age >= 86_400_000 && age < 172_800_000 && a.severity >= 5;
    }).length;
    return { last24, diff: last24 - prev24 };
  }, [alerts]);

  const cardStyle = { border: "1px solid #E5E5E5", height: "100%" };

  if (loading) {
    return (
      <Box style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }} mb={20}>
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} height={160} radius={8} />
        ))}
      </Box>
    );
  }

  return (
    <Box style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }} mb={20}>

      {/* Card 1: Active Alerts + Severity Breakdown */}
      <Card p={0} style={cardStyle}>
        <Box px={16} py={12} style={{ borderBottom: "1px solid #E5E5E5" }}>
          <Text size="xs" fw={600} c="#737373" style={{ textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Active Alerts
          </Text>
        </Box>
        <Box p={16}>
          <Text fw={700} c="#171717" style={{ fontSize: 36, lineHeight: 1 }} mb={12}>
            {total}
          </Text>
          <Box style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6 }} mb={10}>
            {(
              [
                { label: "Crit", count: counts.critical, color: "#DC2626" },
                { label: "High", count: counts.high,     color: "#D97706" },
                { label: "Med",  count: counts.medium,   color: "#F59E0B" },
                { label: "Low",  count: counts.low,      color: "#059669" },
              ] as const
            ).map(({ label, count, color }) => (
              <Box key={label} style={{ textAlign: "center" }}>
                <Text size="xs" fw={700} style={{ color }}>{count}</Text>
                <Text size="10px" c="#A3A3A3">{label}</Text>
              </Box>
            ))}
          </Box>
          {/* Stacked bar */}
          <Box style={{ display: "flex", height: 6, borderRadius: 3, overflow: "hidden", gap: 1 }}>
            {total > 0 && (
              <>
                {counts.critical > 0 && <Box style={{ flex: counts.critical, background: "#DC2626" }} />}
                {counts.high > 0     && <Box style={{ flex: counts.high,     background: "#D97706" }} />}
                {counts.medium > 0   && <Box style={{ flex: counts.medium,   background: "#F59E0B" }} />}
                {counts.low > 0      && <Box style={{ flex: counts.low,      background: "#059669" }} />}
              </>
            )}
            {total === 0 && <Box style={{ flex: 1, background: "#E5E5E5" }} />}
          </Box>
        </Box>
      </Card>

      {/* Card 2: 7-Day Trend Sparkline */}
      <Card p={0} style={cardStyle}>
        <Box px={16} py={12} style={{ borderBottom: "1px solid #E5E5E5" }}>
          <Group justify="space-between" align="center">
            <Text size="xs" fw={600} c="#737373" style={{ textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Trend
            </Text>
            <Group gap={4}>
              {(["7d", "30d"] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setTrendPeriod(p)}
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    padding: "2px 7px",
                    borderRadius: 4,
                    border: "1px solid",
                    cursor: "pointer",
                    background: trendPeriod === p ? "#171717" : "transparent",
                    color: trendPeriod === p ? "#fff" : "#737373",
                    borderColor: trendPeriod === p ? "#171717" : "#E5E5E5",
                  }}
                >
                  {p}
                </button>
              ))}
            </Group>
          </Group>
        </Box>
        <Box p={16}>
          <svg width="100%" viewBox={`0 0 ${sparkWidth} ${sparkHeight}`} style={{ display: "block", marginBottom: 10 }}>
            <defs>
              <linearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#E85D3D" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#E85D3D" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d={areaPath} fill="url(#sparkFill)" />
            <polyline
              points={sparkPoints}
              fill="none"
              stroke="#E85D3D"
              strokeWidth="2"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          </svg>
          <Badge
            size="xs"
            style={{
              background: trendUp ? "#FEE2E2" : trendDown ? "#D1FAE5" : "#F5F5F5",
              color: trendUp ? "#DC2626" : trendDown ? "#059669" : "#737373",
              fontWeight: 600,
            }}
          >
            {trendUp ? "Escalating" : trendDown ? "Improving" : "Stable"}
          </Badge>
        </Box>
      </Card>

      {/* Card 3: Alert Types Donut */}
      <Card p={0} style={cardStyle}>
        <Box px={16} py={12} style={{ borderBottom: "1px solid #E5E5E5" }}>
          <Text size="xs" fw={600} c="#737373" style={{ textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Event Types
          </Text>
        </Box>
        <Box p={16} style={{ display: "flex", gap: 12, alignItems: "center" }}>
          {/* Donut */}
          <Box style={{ flexShrink: 0, position: "relative", width: 64, height: 64 }}>
            <Box
              style={{
                width: 64,
                height: 64,
                borderRadius: "50%",
                background: conicGradient,
              }}
            />
            <Box
              style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                width: 32,
                height: 32,
                borderRadius: "50%",
                background: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ fontSize: 9, fontWeight: 700, color: "#171717", textAlign: "center", lineHeight: 1.1 }}>
                {topType?.pct ?? 0}%
              </Text>
            </Box>
          </Box>
          {/* Legend */}
          <Box style={{ flex: 1, minWidth: 0 }}>
            {typeBreakdown.slice(0, 4).map(({ type, pct, color }) => (
              <Group key={type} gap={6} mb={3} wrap="nowrap">
                <Box style={{ width: 6, height: 6, borderRadius: 2, background: color, flexShrink: 0 }} />
                <Text size="10px" c="#525252" style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {type}
                </Text>
                <Text size="10px" fw={600} c="#171717">{pct}%</Text>
              </Group>
            ))}
            {total === 0 && <Text size="xs" c="#A3A3A3">No data</Text>}
          </Box>
        </Box>
      </Card>

      {/* Card 4: Escalation Signal */}
      <Card p={0} style={cardStyle}>
        <Box px={16} py={12} style={{ borderBottom: "1px solid #E5E5E5" }}>
          <Text size="xs" fw={600} c="#737373" style={{ textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Last 24 Hours
          </Text>
        </Box>
        <Box p={16}>
          <Group align="flex-end" gap={8} mb={8}>
            <Text
              fw={700}
              style={{ fontSize: 36, lineHeight: 1, color: escalation.last24 > 0 ? "#DC2626" : "#059669" }}
            >
              {escalation.last24 > 0 ? `+${escalation.last24}` : escalation.last24}
            </Text>
            <Text size="xs" c="#737373" mb={4}>new critical</Text>
          </Group>
          <Badge
            size="xs"
            style={{
              background: escalation.diff > 0 ? "#FEE2E2" : escalation.diff < 0 ? "#D1FAE5" : "#F5F5F5",
              color: escalation.diff > 0 ? "#DC2626" : escalation.diff < 0 ? "#059669" : "#737373",
              fontWeight: 600,
            }}
          >
            {escalation.diff > 0
              ? `+${escalation.diff} vs yesterday`
              : escalation.diff < 0
              ? `${escalation.diff} vs yesterday`
              : "no change vs yesterday"}
          </Badge>
          <Box mt={10}>
            <Badge
              size="xs"
              style={{
                background: escalation.last24 > 0 ? "#FEF2F2" : "#F0FDF4",
                color: escalation.last24 > 0 ? "#DC2626" : "#059669",
                fontWeight: 600,
                border: `1px solid ${escalation.last24 > 0 ? "#FECACA" : "#BBF7D0"}`,
              }}
            >
              {escalation.last24 > 0 ? "Worsening" : "Stable"}
            </Badge>
          </Box>
        </Box>
      </Card>

    </Box>
  );
}
