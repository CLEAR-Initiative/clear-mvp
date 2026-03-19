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

const CX = 90, CY = 94;
const RING_R   = 68;
const STROKE_W = 9;

function polarXY(deg: number): [number, number] {
  const rad = (deg * Math.PI) / 180;
  return [CX + RING_R * Math.cos(rad), CY - RING_R * Math.sin(rad)];
}

function arcD(fromDeg: number, toDeg: number): string {
  const f = (n: number) => n.toFixed(2);
  const [x1, y1] = polarXY(fromDeg);
  const [x2, y2] = polarXY(toDeg);
  const span = fromDeg - toDeg;
  const large = span > 180 ? 1 : 0;
  return `M ${f(x1)} ${f(y1)} A ${RING_R} ${RING_R} 0 ${large} 1 ${f(x2)} ${f(y2)}`;
}

export function CoverageRingsCard({ alerts, events, onNavigateToAlerts }: CoverageRingsCardProps) {
  void events;
  const totalAlerts = alerts.length;
  const analysed  = Math.min(1, totalAlerts);
  const uncovered = totalAlerts - analysed;
  const coveragePct = totalAlerts > 0 ? Math.round((analysed / totalAlerts) * 100) : 0;

  const fraction  = coveragePct / 100;
  const alpha     = 180 - fraction * 180;
  const greenEnd  = Math.max(0.5, Math.min(179.5, alpha));
  const hasGreen  = fraction > 0.005;

  return (
    <Box style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <Text style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#A3A3A3", marginBottom: 12 }}>
        Analysis Coverage
      </Text>

      <Box style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <Box style={{ width: "100%", maxWidth: 196 }}>
          <svg viewBox="0 0 180 98" width="100%" style={{ overflow: "visible" }}>

            {/* Track — full half-ring, muted red = uncovered */}
            <path
              d={arcD(180, 0)}
              fill="none"
              stroke="rgba(239,68,68,0.18)"
              strokeWidth={STROKE_W}
              strokeLinecap="round"
            />

            {/* Fill — covered portion */}
            {hasGreen && (
              <path
                d={arcD(180, greenEnd)}
                fill="none"
                stroke="#22C55E"
                strokeWidth={STROKE_W}
                strokeLinecap="round"
              />
            )}

            {/* Centre labels */}
            <text
              x={CX} y={CY - 24}
              textAnchor="middle" dominantBaseline="middle"
              fill="#171717" fontSize="21" fontWeight="800"
              fontFamily="system-ui, -apple-system, sans-serif"
            >
              {coveragePct}%
            </text>
            <text
              x={CX} y={CY - 10}
              textAnchor="middle" dominantBaseline="middle"
              fill="#A3A3A3" fontSize="8" fontWeight="600" letterSpacing="0.1em"
              fontFamily="system-ui, -apple-system, sans-serif"
            >
              COVERED
            </text>
          </svg>
        </Box>

        {/* Stats */}
        <Group justify="center" gap={20} mt={16}>
          {[
            { dot: "#22C55E",             value: analysed,    label: "Analysed"   },
            { dot: "rgba(239,68,68,0.6)", value: uncovered,   label: "Unanalysed" },
            { dot: "#F59E0B",             value: totalAlerts, label: "Alerts"     },
          ].map(({ dot, value, label }) => (
            <Box key={label} style={{ textAlign: "center" }}>
              <Group gap={4} justify="center" mb={2}>
                <Box style={{ width: 6, height: 6, borderRadius: "50%", background: dot, flexShrink: 0 }} />
                <Text style={{ fontSize: 17, fontWeight: 700, color: "#171717", fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>
                  {value}
                </Text>
              </Group>
              <Text style={{ fontSize: 10, color: "#A3A3A3" }}>{label}</Text>
            </Box>
          ))}
        </Group>
      </Box>

      {/* Action line */}
      <Box
        onClick={uncovered > 0 ? onNavigateToAlerts : undefined}
        style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 5, cursor: uncovered > 0 ? "pointer" : "default" }}
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
            <Text style={{ fontSize: 11, color: "#22C55E", fontWeight: 600 }}>All alerts covered</Text>
          </>
        )}
      </Box>
    </Box>
  );
}
