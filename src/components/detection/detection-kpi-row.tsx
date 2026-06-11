"use client";

import { useState } from "react";
import { Box, Text, Group, Collapse, ActionIcon } from "@mantine/core";
import { IconChevronUp, IconChevronDown } from "@tabler/icons-react";
import { useTranslations } from "next-intl";
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
  background: "#ffffff",
  border: "1px solid #E5E5E5",
  borderRadius: 12,
  minHeight: 180,
  padding: 20,
  boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.03)",
};

interface DetectionKpiRowProps {
  country: string;
  alerts: GqlAlert[];
  events: GqlEvent[];
  onNavigateToAlerts?: () => void;
}

export function DetectionKpiRow({ country, alerts, events, onNavigateToAlerts }: DetectionKpiRowProps) {
  const t = useTranslations("detection");
  const iso3 = ISO3[country] ?? "SDN";
  const [expanded, setExpanded] = useState(false);

  return (
    <Box mb={24}>
      <Group
        justify="space-between"
        align="center"
        mb={expanded ? 12 : 0}
        style={{ cursor: "pointer", userSelect: "none" }}
        onClick={() => setExpanded((v) => !v)}
      >
        <Text fw={600} c="var(--color-text-secondary)" style={{ fontSize: 11, letterSpacing: "0.05em", textTransform: "uppercase" }}>
          {t("kpi.indicators")}
        </Text>
        <ActionIcon
          variant="subtle"
          color="gray"
          size="xs"
          style={{ pointerEvents: "none" }}
        >
          {expanded ? <IconChevronUp size={13} /> : <IconChevronDown size={13} />}
        </ActionIcon>
      </Group>

      <Collapse in={expanded}>
        <Box
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 16,
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
      </Collapse>
    </Box>
  );
}
