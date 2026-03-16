"use client";

import { Box, Text, Group } from "@mantine/core";
import { IconArrowRight, IconCheck } from "@tabler/icons-react";
import type { GqlAlert } from "~/lib/types/graphql";
import type { GqlEvent } from "~/lib/types/graphql";

// TODO: wire analysed count to real detection router when analysis status is tracked
interface CoverageRingsCardProps {
  alerts: GqlAlert[];
  events: GqlEvent[];
  onNavigateToAlerts?: () => void;
}

function arc(cx: number, cy: number, r: number, pct: number): string {
  if (pct <= 0) return "";
  if (pct >= 1) pct = 0.9999;
  const circ = 2 * Math.PI * r;
  const dash = circ * pct;
  return `${dash} ${circ}`;
}

export function CoverageRingsCard({ alerts, events, onNavigateToAlerts }: CoverageRingsCardProps) {
  const totalEvents = events.length;
  const totalAlerts = alerts.length;
  // TODO: wire to real analysis status when available -- mocking 1 analysed for now
  const analysed = Math.min(1, totalAlerts);

  const alertPct   = totalEvents > 0 ? totalAlerts  / totalEvents : 0;
  const analysisPct = totalAlerts > 0 ? analysed     / totalAlerts : 0;
  const coveragePct = totalAlerts > 0 ? Math.round((analysed / totalAlerts) * 100) : 0;
  const uncovered   = totalAlerts - analysed;

  const CX = 80, CY = 80;

  return (
    <Box style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <Text style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#6B7280", marginBottom: 16 }}>
        Analysis Coverage
      </Text>

      <Box style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        {/* rings SVG */}
        <Box style={{ position: "relative", width: 160, height: 160 }}>
          <svg viewBox="0 0 160 160" width="160" height="160" style={{ transform: "rotate(-90deg)" }}>
            {/* Outer ring: Events -- always full */}
            <circle cx={CX} cy={CY} r={68} fill="none" stroke="#64748B" strokeWidth={10} strokeOpacity={0.15} />
            <circle cx={CX} cy={CY} r={68} fill="none" stroke="#64748B" strokeWidth={10} strokeLinecap="round" />

            {/* Middle ring: Alerts / Events */}
            <circle cx={CX} cy={CY} r={54} fill="none" stroke="#F59E0B" strokeWidth={10} strokeOpacity={0.15} />
            {alertPct > 0 && (
              <circle
                cx={CX} cy={CY} r={54} fill="none"
                stroke="#F59E0B" strokeWidth={10} strokeLinecap="round"
                strokeDasharray={arc(CX, CY, 54, alertPct)}
              />
            )}

            {/* Inner ring: Analysed / Alerts -- gap in red, fill in green */}
            <circle cx={CX} cy={CY} r={40} fill="none" stroke="#EF4444" strokeWidth={10} strokeOpacity={0.2} />
            {analysisPct > 0 && (
              <circle
                cx={CX} cy={CY} r={40} fill="none"
                stroke="#22C55E" strokeWidth={10} strokeLinecap="round"
                strokeDasharray={arc(CX, CY, 40, analysisPct)}
              />
            )}
          </svg>

          {/* centre text -- unrotate */}
          <Box style={{
            position: "absolute", inset: 0,
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          }}>
            <Text style={{ fontSize: 22, fontWeight: 800, color: "#F9FAFB", lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>
              {coveragePct}%
            </Text>
            <Text style={{ fontSize: 10, color: "#6B7280", marginTop: 3 }}>covered</Text>
          </Box>
        </Box>

        {/* three stats below SVG */}
        <Group justify="space-around" style={{ width: "100%", marginTop: 14 }}>
          {[
            { dot: "#64748B", value: totalEvents, label: "Events"   },
            { dot: "#F59E0B", value: totalAlerts, label: "Alerts"   },
            { dot: "#22C55E", value: analysed,    label: "Analysed" },
          ].map(({ dot, value, label }) => (
            <Box key={label} style={{ textAlign: "center" }}>
              <Group gap={5} justify="center" mb={2}>
                <Box style={{ width: 6, height: 6, borderRadius: "50%", background: dot, flexShrink: 0, marginTop: 4 }} />
                <Text style={{ fontSize: 16, fontWeight: 700, color: "#F9FAFB", fontVariantNumeric: "tabular-nums" }}>
                  {value}
                </Text>
              </Group>
              <Text style={{ fontSize: 10, color: "#6B7280" }}>{label}</Text>
            </Box>
          ))}
        </Group>
      </Box>

      {/* action line */}
      <Box
        onClick={uncovered > 0 ? onNavigateToAlerts : undefined}
        style={{
          marginTop: 12,
          display: "flex", alignItems: "center", gap: 5,
          cursor: uncovered > 0 ? "pointer" : "default",
        }}
      >
        {uncovered > 0 ? (
          <>
            <IconArrowRight size={13} color="#F59E0B" />
            <Text style={{ fontSize: 11, color: "#F59E0B", fontWeight: 600 }}>
              {uncovered} alert{uncovered !== 1 ? "s" : ""} without analysis
            </Text>
          </>
        ) : (
          <>
            <IconCheck size={13} color="#22C55E" />
            <Text style={{ fontSize: 11, color: "#22C55E", fontWeight: 600 }}>
              All alerts covered
            </Text>
          </>
        )}
      </Box>
    </Box>
  );
}
