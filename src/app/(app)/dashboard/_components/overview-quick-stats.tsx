"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Box, Text } from "@mantine/core";
import type { GqlAlert, GqlEvent } from "~/lib/types/graphql";
import { SignalTrendCard } from "~/components/detection/signal-trend-card";
import { CoverageRingsCard } from "~/components/detection/coverage-rings-card";
import { IdpCard } from "~/components/detection/idp-card";
import { InformSeverityCard } from "~/components/detection/inform-severity-card";

const ISO3: Record<string, string> = {
  Sudan: "SDN",
  Ethiopia: "ETH",
  "South Sudan": "SSD",
  Somalia: "SOM",
  Yemen: "YEM",
  Syria: "SYR",
  Afghanistan: "AFG",
  Myanmar: "MMR",
};

const CARD: React.CSSProperties = {
  background: "var(--color-bg-white)",
  border: "1px solid var(--color-border)",
  borderRadius: 10,
  minHeight: 140,
  padding: 12,
  overflow: "hidden",
};

interface OverviewQuickStatsProps {
  country: string;
  alerts: GqlAlert[];
  events: GqlEvent[];
  /** Compact rail under the globe (desktop) or below the queue (mobile). */
  compact?: boolean;
}

/**
 * Country pulse indicators — lives under the Operational Globe on desktop.
 */
export function OverviewQuickStats({
  country,
  alerts,
  events,
  compact = false,
}: OverviewQuickStatsProps) {
  const t = useTranslations("dashboard.quickStats");
  const router = useRouter();
  const iso3 = ISO3[country] ?? "SDN";

  return (
    <Box
      pt={compact ? 12 : 16}
      pb={compact ? 4 : 8}
      data-overview-quick-stats=""
    >
      <Box mb={compact ? 8 : 12}>
        <Text
          fw={700}
          tt="uppercase"
          c="var(--color-text-muted)"
          style={{ fontSize: 10, letterSpacing: "0.06em" }}
        >
          {t("title")}
        </Text>
        {!compact ? (
          <Text size="xs" c="var(--color-text-muted)" mt={4}>
            {t("subtitle", { country })}
          </Text>
        ) : null}
      </Box>

      <Box className="grid grid-cols-2 gap-2">
        <Box style={CARD}>
          <SignalTrendCard alerts={alerts} events={events} />
        </Box>
        <Box style={CARD}>
          <CoverageRingsCard
            alerts={alerts}
            events={events}
            onNavigateToAlerts={() => router.push("/detection?tab=live")}
          />
        </Box>
        <Box style={CARD}>
          <IdpCard locationCode={iso3} />
        </Box>
        <Box style={CARD}>
          <InformSeverityCard country={country} />
        </Box>
      </Box>
    </Box>
  );
}
