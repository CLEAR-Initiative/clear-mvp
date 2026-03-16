"use client";

import { Box } from "@mantine/core";
import type { GqlAlert, GqlEvent } from "~/lib/types/graphql";
import { SignalTrendCard }      from "./signal-trend-card";
import { CoverageRingsCard }    from "./coverage-rings-card";
import { IdpCard }              from "./idp-card";
import { InformSeverityCard }   from "./inform-severity-card";

// ISO3 lookup -- extend as more countries are added
const ISO3: Record<string, string> = {
  Sudan:         "SDN",
  Ethiopia:      "ETH",
  "South Sudan": "SSD",
  Somalia:       "SOM",
  Yemen:         "YEM",
  Syria:         "SYR",
  Afghanistan:   "AFG",
  Myanmar:       "MMR",
};

const CARD: React.CSSProperties = {
  background: "#111827",
  border: "1px solid rgba(255,255,255,0.06)",
  borderRadius: 12,
  minHeight: 180,
  padding: 20,
};

interface DetectionKpiRowProps {
  country: string;
  alerts: GqlAlert[];
  events: GqlEvent[];
  onNavigateToAlerts?: () => void;
}

export function DetectionKpiRow({ country, alerts, events, onNavigateToAlerts }: DetectionKpiRowProps) {
  const iso3 = ISO3[country] ?? "SDN";

  return (
    <Box
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(4, 1fr)",
        gap: 16,
        marginBottom: 24,
      }}
      className="sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
    >
      <Box style={CARD}>
        <SignalTrendCard alerts={alerts} events={events} />
      </Box>

      <Box style={CARD}>
        <CoverageRingsCard alerts={alerts} events={events} onNavigateToAlerts={onNavigateToAlerts} />
      </Box>

      <Box style={CARD}>
        <IdpCard locationCode={iso3} />
      </Box>

      <Box style={CARD}>
        <InformSeverityCard country={country} />
      </Box>
    </Box>
  );
}
