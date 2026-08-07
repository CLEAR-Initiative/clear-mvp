"use client";

import { Box, Group, Text } from "@mantine/core";
import { IconInfoCircle, IconTrendingUp } from "@tabler/icons-react";
import { useTranslations } from "next-intl";

interface ActiveSignalsCardProps {
  count: number;
  trendPercent?: number;
}

export function ActiveSignalsCard({ count, trendPercent = 12 }: ActiveSignalsCardProps) {
  const t = useTranslations("onboarding.tour.widgets");

  return (
    <Box
      data-tour="active-signals"
      style={{
        position: "absolute",
        top: 72,
        left: 16,
        zIndex: 11,
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: 16,
        borderRadius: 12,
        background: "rgba(255, 255, 255, 0.95)",
        border: "1px solid #e4e4e7",
        pointerEvents: "auto",
      }}
    >
      <Box
        style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          background: "#f4f4f5",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <IconInfoCircle size={16} color="#71717a" />
      </Box>
      <Box>
        <Text
          size="xs"
          fw={700}
          tt="uppercase"
          c="#71717a"
          style={{ letterSpacing: "0.05em", fontSize: 10, lineHeight: "15px" }}
        >
          {t("activeSignals")}
        </Text>
        <Group gap={8} align="center" wrap="nowrap">
          <Text fw={900} size="xl" c="#161618" lh="28px">
            {count.toLocaleString()}
          </Text>
          <Group gap={4} wrap="nowrap">
            <IconTrendingUp size={10} color="#10b981" />
            <Text size="xs" fw={500} c="#10b981">
              {trendPercent}%
            </Text>
          </Group>
        </Group>
      </Box>
    </Box>
  );
}
