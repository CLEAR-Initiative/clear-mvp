"use client";

import { useMemo, useState } from "react";
import { Box, Text, Group, Skeleton } from "@mantine/core";
import {
  IconTrendingUp,
  IconTrendingDown,
  IconMinus,
  IconShieldExclamation,
  IconWaveSine,
  IconRadar,
  IconChartBar,
} from "@tabler/icons-react";
import type { GqlAlert } from "~/lib/types/graphql";
import { api } from "~/trpc/react";

interface KpiCardsProps {
  alerts: GqlAlert[];
  loading: boolean;
  country?: string;
  events?: Array<{ id: string; rank: number; alerts: Array<{ id: string }>; signals: Array<{ id: string }>; firstSignalCreatedAt: string }>;
}

/* ── design tokens ── */
const SEV = [
  { label: "Critical", color: "#DC2626", bg: "var(--color-critical-light)", border: "var(--color-border)" },
  { label: "High",     color: "#EA580C", bg: "var(--color-warning-light)",  border: "var(--color-border)" },
  { label: "Medium",   color: "#D97706", bg: "var(--color-warning-light)",  border: "var(--color-border)" },
  { label: "Low",      color: "#16A34A", bg: "var(--color-success-light)",  border: "var(--color-border)" },
] as const;

function Card({ children, accent }: { children: React.ReactNode; accent: string }) {
  return (
    <Box style={{
      background: "var(--color-bg-white)",
      border: "1px solid var(--color-border)",
      borderRadius: 10,
      overflow: "hidden",
      height: "100%",
      display: "flex",
      flexDirection: "column",
      boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.04)",
    }}>
      <Box style={{ height: 3, background: accent, flexShrink: 0 }} />
      <Box style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        {children}
      </Box>
    </Box>
  );
}

function CardHeader({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <Group gap={7} px={16} pt={14} pb={10} style={{ borderBottom: "1px solid var(--color-border)" }}>
      <Box style={{ color: "#A3A3A3" }}>{icon}</Box>
      <Text style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.09em", textTransform: "uppercase", color: "#A3A3A3" }}>
        {label}
      </Text>
    </Group>
  );
}

/* ── thin arc SVG for coverage ring ── */
function CoverageRing({ pct, color, size = 72 }: { pct: number; color: string; size?: number }) {
  const r = (size - 10) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  const cx = size / 2, cy = size / 2;
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--color-border)" strokeWidth={7} />
      <circle
        cx={cx} cy={cy} r={r} fill="none"
        stroke={color} strokeWidth={7}
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
      />
    </svg>
  );
}

const INFORM_COLORS = {
  5: { accent: "#DC2626", badge: "var(--color-critical-light)", badgeBorder: "var(--color-border)", badgeText: "#DC2626" },
  4: { accent: "#EA580C", badge: "var(--color-warning-light)",  badgeBorder: "var(--color-border)", badgeText: "#EA580C" },
  3: { accent: "#D97706", badge: "var(--color-warning-light)",  badgeBorder: "var(--color-border)", badgeText: "#D97706" },
  2: { accent: "#16A34A", badge: "var(--color-success-light)",  badgeBorder: "var(--color-border)", badgeText: "#16A34A" },
  1: { accent: "#16A34A", badge: "var(--color-success-light)",  badgeBorder: "var(--color-border)", badgeText: "#16A34A" },
} as const;

function ScoreBar({ value, max = 10, color }: { value: number; max?: number; color: string }) {
  return (
    <Box style={{ height: 3, background: "var(--color-bg-muted)", borderRadius: 2, overflow: "hidden" }}>
      <Box style={{ height: "100%", width: `${(value / max) * 100}%`, background: color, borderRadius: 2 }} />
    </Box>
  );
}

export function KpiCards({ alerts, loading, country = "Sudan", events = [] }: KpiCardsProps) {
  const [trendPeriod, setTrendPeriod] = useState<"7d" | "30d">("7d");

  const informQuery = api.inform.getSeverity.useQuery(
    { country },
    { staleTime: 1000 * 60 * 60 * 12 }, // data updates monthly, cache 12h
  );

  /* ── severity breakdown from alerts ── */
  const counts = useMemo(() => ({
    critical: alerts.filter((a) => a.event.rank >= 5).length,
    high:     alerts.filter((a) => a.event.rank >= 4 && a.event.rank < 5).length,
    medium:   alerts.filter((a) => a.event.rank >= 3 && a.event.rank < 4).length,
    low:      alerts.filter((a) => a.event.rank < 3).length,
  }), [alerts]);

  const total = alerts.length;

  /* ── trend sparkline ── */
  const trendPoints = useMemo(() => {
    const days = trendPeriod === "7d" ? 7 : 30;
    const now = new Date();
    return Array.from({ length: days }, (_, i) => {
      const d = new Date(now);
      d.setDate(now.getDate() - (days - 1 - i));
      const dayStr = d.toISOString().slice(0, 10);
      return alerts.filter((a) => a.event.firstSignalCreatedAt.slice(0, 10) === dayStr).length;
    });
  }, [alerts, trendPeriod]);

  const trendMax  = Math.max(...trendPoints, 1);
  const lastDay   = trendPoints[trendPoints.length - 1] ?? 0;
  const prevDay   = trendPoints[trendPoints.length - 2] ?? 0;
  const trendUp   = lastDay > prevDay;
  const trendDown = lastDay < prevDay;

  const SW = 220, SH = 52;
  const sparkPts = trendPoints
    .map((v, i) => {
      const x = Math.round((i / Math.max(trendPoints.length - 1, 1)) * SW);
      const y = Math.round(SH - 4 - ((v / trendMax) * (SH - 8)));
      return `${x},${y}`;
    })
    .join(" ");
  const areaPath = `M ${sparkPts.split(" ")[0]} L ${sparkPts.split(" ").join(" L ")} L ${SW},${SH} L 0,${SH} Z`;

  /* ── event coverage ── */
  const coverage = useMemo(() => {
    const totalEvents   = events.length;
    const flagged       = events.filter((e) => e.alerts.length > 0).length;
    const totalSignals  = events.reduce((s, e) => s + e.signals.length, 0);
    const avgSignals    = totalEvents > 0 ? (totalSignals / totalEvents).toFixed(1) : "0";
    const pct           = totalEvents > 0 ? Math.round((flagged / totalEvents) * 100) : 0;
    return { totalEvents, flagged, unflagged: totalEvents - flagged, totalSignals, avgSignals, pct };
  }, [events]);

  if (loading) {
    return (
      <Box style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }} mb={20}>
        {[0, 1, 2, 3].map((i) => <Skeleton key={i} height={172} radius={10} />)}
      </Box>
    );
  }

  return (
    <Box style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }} mb={20}>

      {/* ── 1: Active Alerts ── */}
      <Card accent="linear-gradient(90deg, #E85D3D 0%, #F59E0B 100%)">
        <CardHeader icon={<IconShieldExclamation size={13} />} label="Active Alerts" />
        <Box px={16} pt={12} pb={16} style={{ flex: 1, display: "flex", flexDirection: "column" }}>

          <Group align="baseline" gap={6} mb={14}>
            <Text style={{ fontSize: 44, fontWeight: 800, lineHeight: 1, letterSpacing: "-0.04em", color: "var(--color-text-primary)", fontVariantNumeric: "tabular-nums" }}>
              {total}
            </Text>
            <Text size="xs" c="var(--color-text-muted)" fw={500}>alerts</Text>
          </Group>

          <Box style={{ flex: 1, display: "flex", flexDirection: "column", gap: 5 }}>
            {[
              { count: counts.critical, ...SEV[0] },
              { count: counts.high,     ...SEV[1] },
              { count: counts.medium,   ...SEV[2] },
              { count: counts.low,      ...SEV[3] },
            ].map(({ label, count, color, bg, border }) => (
              <Group key={label} justify="space-between" align="center">
                <Group gap={6}>
                  <Box style={{ width: 6, height: 6, borderRadius: "50%", background: count > 0 ? color : "var(--color-border)", flexShrink: 0 }} />
                  <Text style={{ fontSize: 11, color: count > 0 ? "#525252" : "#A3A3A3", fontWeight: 500 }}>{label}</Text>
                </Group>
                {count > 0 ? (
                  <Box style={{ background: bg, border: `1px solid ${border}`, borderRadius: 4, padding: "1px 7px" }}>
                    <Text style={{ fontSize: 11, fontWeight: 700, color, fontVariantNumeric: "tabular-nums" }}>{count}</Text>
                  </Box>
                ) : (
                  <Text style={{ fontSize: 11, color: "#D4D4D4", fontVariantNumeric: "tabular-nums" }}>-</Text>
                )}
              </Group>
            ))}
          </Box>

          {/* stacked proportion bar */}
          <Box style={{ display: "flex", height: 3, borderRadius: 2, overflow: "hidden", gap: 1, marginTop: 12 }}>
            {total > 0 ? (
              <>
                {counts.critical > 0 && <Box style={{ flex: counts.critical, background: "#DC2626" }} />}
                {counts.high > 0     && <Box style={{ flex: counts.high,     background: "#EA580C" }} />}
                {counts.medium > 0   && <Box style={{ flex: counts.medium,   background: "#D97706" }} />}
                {counts.low > 0      && <Box style={{ flex: counts.low,      background: "#16A34A" }} />}
              </>
            ) : (
              <Box style={{ flex: 1, background: "var(--color-bg-muted)" }} />
            )}
          </Box>
        </Box>
      </Card>

      {/* ── 2: Trend ── */}
      <Card accent="#3B82F6">
        <CardHeader icon={<IconWaveSine size={13} />} label="Trend" />
        <Box px={16} pt={12} pb={16} style={{ flex: 1, display: "flex", flexDirection: "column" }}>

          <Group justify="space-between" align="center" mb={10}>
            <Group align="baseline" gap={5}>
              <Text style={{ fontSize: 28, fontWeight: 800, lineHeight: 1, letterSpacing: "-0.03em", color: "var(--color-text-primary)", fontVariantNumeric: "tabular-nums" }}>
                {total}
              </Text>
              <Text style={{ fontSize: 10, color: "#A3A3A3", fontWeight: 500 }}>
                {trendPeriod === "7d" ? "7-day" : "30-day"} window
              </Text>
            </Group>
            <Group gap={3}>
              {(["7d", "30d"] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setTrendPeriod(p)}
                  style={{
                    fontSize: 10, fontWeight: 700, padding: "3px 9px",
                    borderRadius: 5, border: "1px solid", cursor: "pointer",
                    transition: "all 0.15s",
                    background: trendPeriod === p ? "var(--color-text-primary)" : "transparent",
                    color:      trendPeriod === p ? "var(--color-bg-white)"   : "var(--color-text-muted)",
                    borderColor:trendPeriod === p ? "var(--color-text-primary)" : "var(--color-border)",
                  }}
                >{p}</button>
              ))}
            </Group>
          </Group>

          <Box style={{ flex: 1, minHeight: 52 }}>
            <svg width="100%" height="100%" viewBox={`0 0 ${SW} ${SH}`} preserveAspectRatio="none">
              <defs>
                <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.12" />
                  <stop offset="100%" stopColor="#3B82F6" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path d={areaPath} fill="url(#trendFill)" />
              <polyline points={sparkPts} fill="none" stroke="#3B82F6" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
            </svg>
          </Box>

          <Group gap={5} align="center" mt={10}>
            <Box style={{
              display: "inline-flex", alignItems: "center", gap: 4,
              padding: "3px 9px", borderRadius: 20,
              background: trendUp ? "#FEF2F2" : trendDown ? "#F0FDF4" : "#F5F5F5",
              border: `1px solid ${trendUp ? "#FECACA" : trendDown ? "#BBF7D0" : "#E5E5E5"}`,
            }}>
              {trendUp   ? <IconTrendingUp   size={11} color="#DC2626" /> :
               trendDown ? <IconTrendingDown size={11} color="#16A34A" /> :
                           <IconMinus        size={11} color="#A3A3A3" />}
              <Text style={{
                fontSize: 10, fontWeight: 700, letterSpacing: "0.05em",
                color: trendUp ? "#DC2626" : trendDown ? "#16A34A" : "#737373",
              }}>
                {trendUp ? "Escalating" : trendDown ? "Improving" : "Stable"}
              </Text>
            </Box>
          </Group>
        </Box>
      </Card>

      {/* ── 3: Event Coverage (replaces broken type donut) ── */}
      <Card accent="linear-gradient(90deg, #8B5CF6, #6366F1)">
        <CardHeader icon={<IconRadar size={13} />} label="Event Coverage" />
        <Box px={16} pt={12} pb={16} style={{ flex: 1, display: "flex", flexDirection: "column" }}>

          <Box style={{ display: "flex", gap: 14, alignItems: "center", flex: 1 }}>
            {/* coverage ring */}
            <Box style={{ position: "relative", flexShrink: 0, width: 72, height: 72 }}>
              <CoverageRing
                pct={coverage.pct}
                color={coverage.pct >= 75 ? "#DC2626" : coverage.pct >= 40 ? "#EA580C" : "#8B5CF6"}
                size={72}
              />
              <Box style={{
                position: "absolute", inset: 0,
                display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center",
              }}>
                <Text style={{ fontSize: 16, fontWeight: 800, color: "var(--color-text-primary)", lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>
                  {coverage.pct}%
                </Text>
                <Text style={{ fontSize: 8, color: "#A3A3A3", fontWeight: 600, marginTop: 1 }}>flagged</Text>
              </Box>
            </Box>

            {/* stats */}
            <Box style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
              <Box>
                <Text style={{ fontSize: 10, color: "#A3A3A3", fontWeight: 600, marginBottom: 2 }}>Events</Text>
                <Group gap={6} align="baseline">
                  <Text style={{ fontSize: 20, fontWeight: 800, color: "var(--color-text-primary)", lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>
                    {coverage.totalEvents}
                  </Text>
                  <Text style={{ fontSize: 10, color: "#A3A3A3" }}>total</Text>
                </Group>
                <Group gap={10} mt={3}>
                  <Group gap={4}>
                    <Box style={{ width: 6, height: 6, borderRadius: "50%", background: "#DC2626" }} />
                    <Text style={{ fontSize: 10, color: "var(--color-text-muted)" }}>{coverage.flagged} alerted</Text>
                  </Group>
                  <Group gap={4}>
                    <Box style={{ width: 6, height: 6, borderRadius: "50%", background: "#D4D4D4" }} />
                    <Text style={{ fontSize: 10, color: "var(--color-text-muted)" }}>{coverage.unflagged} monitoring</Text>
                  </Group>
                </Group>
              </Box>

              <Box style={{ borderTop: "1px solid var(--color-border)", paddingTop: 7 }}>
                <Group justify="space-between">
                  <Text style={{ fontSize: 10, color: "#A3A3A3", fontWeight: 500 }}>Total signals</Text>
                  <Text style={{ fontSize: 13, fontWeight: 700, color: "var(--color-text-secondary)", fontVariantNumeric: "tabular-nums" }}>
                    {coverage.totalSignals}
                  </Text>
                </Group>
                <Group justify="space-between" mt={3}>
                  <Text style={{ fontSize: 10, color: "#A3A3A3", fontWeight: 500 }}>Avg / event</Text>
                  <Text style={{ fontSize: 13, fontWeight: 700, color: "var(--color-text-secondary)", fontVariantNumeric: "tabular-nums" }}>
                    {coverage.avgSignals}
                  </Text>
                </Group>
              </Box>
            </Box>
          </Box>
        </Box>
      </Card>

      {/* ── 4: INFORM Severity ── */}
      {(() => {
        const inform = informQuery.data;
        const catNum = (inform?.categoryNumeric ?? 3) as keyof typeof INFORM_COLORS;
        const colors = INFORM_COLORS[catNum] ?? INFORM_COLORS[3];

        if (informQuery.isLoading) {
          return <Skeleton height="100%" radius={10} />;
        }

        if (!inform) {
          return (
            <Card accent="#A3A3A3">
              <CardHeader icon={<IconChartBar size={13} />} label="INFORM Severity" />
              <Box px={16} pt={12} pb={16} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Text style={{ fontSize: 11, color: "#A3A3A3" }}>No data for {country}</Text>
              </Box>
            </Card>
          );
        }

        return (
          <Card accent={colors.accent}>
            <CardHeader icon={<IconChartBar size={13} />} label="INFORM Severity" />
            <Box px={16} pt={12} pb={14} style={{ flex: 1, display: "flex", flexDirection: "column" }}>

              {/* score + category */}
              <Group align="flex-end" gap={8} mb={4}>
                <Text style={{
                  fontSize: 44, fontWeight: 800, lineHeight: 1, letterSpacing: "-0.04em",
                  fontVariantNumeric: "tabular-nums", color: colors.accent,
                }}>
                  {inform.score.toFixed(1)}
                </Text>
                <Box mb={6}>
                  <Box style={{
                    background: colors.badge, border: `1px solid ${colors.badgeBorder}`,
                    borderRadius: 4, padding: "2px 7px",
                  }}>
                    <Text style={{ fontSize: 10, fontWeight: 700, color: colors.badgeText, letterSpacing: "0.04em" }}>
                      {inform.category}
                    </Text>
                  </Box>
                </Box>
              </Group>

              {/* crisis name */}
              <Text style={{ fontSize: 10, color: "var(--color-text-muted)", fontWeight: 500, marginBottom: 12, lineHeight: 1.3 }}
                lineClamp={2}>
                {inform.crisisName}
              </Text>

              {/* sub-dimension bars */}
              <Box style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
                {[
                  { label: "Impact", value: inform.impact },
                  { label: "Conditions", value: inform.conditions },
                  { label: "Complexity", value: inform.complexity },
                ].map(({ label, value }) => (
                  <Box key={label}>
                    <Group justify="space-between" mb={3}>
                      <Text style={{ fontSize: 10, color: "#A3A3A3", fontWeight: 500 }}>{label}</Text>
                      <Text style={{ fontSize: 10, fontWeight: 700, color: "var(--color-text-secondary)", fontVariantNumeric: "tabular-nums" }}>
                        {value.toFixed(1)}
                      </Text>
                    </Group>
                    <ScoreBar value={value} color={colors.accent} />
                  </Box>
                ))}
              </Box>

              {/* footer */}
              <Group justify="space-between" mt={10} align="center">
                <Text style={{ fontSize: 9, color: "#C4C4C4" }}>
                  Updated {inform.lastUpdated}
                </Text>
                <Text style={{ fontSize: 9, color: "#C4C4C4", fontWeight: 600 }}>
                  ACAPS · {inform.month}
                </Text>
              </Group>

            </Box>
          </Card>
        );
      })()}

    </Box>
  );
}
