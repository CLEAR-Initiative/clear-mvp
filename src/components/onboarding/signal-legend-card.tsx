"use client";

import { Box, Group, Stack, Text } from "@mantine/core";
import { useTranslations } from "next-intl";

function LegendRow({
  variant,
  title,
  subtitle,
}: {
  variant: "high" | "medium";
  title: string;
  subtitle: string;
}) {
  const isHigh = variant === "high";
  return (
    <Group gap={16} wrap="nowrap" align="flex-start">
      <Box
        style={{
          width: 40,
          height: 40,
          borderRadius: 8,
          border: `1px solid ${isHigh ? "#ff5a1f" : "#fbbf24"}`,
          background: isHigh ? "rgba(255, 90, 31, 0.1)" : "rgba(251, 191, 36, 0.1)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <Box
          style={{
            width: isHigh ? 8 : 14,
            height: isHigh ? 8 : 14,
            borderRadius: 9999,
            border: isHigh ? "none" : "2px dashed #fbbf24",
            background: isHigh ? "#ff5a1f" : "transparent",
          }}
        />
      </Box>
      <Stack gap={2}>
        <Text fw={700} size="xs" c="#161618">
          {title}
        </Text>
        <Text size="xs" c="#71717a" style={{ fontSize: 10 }}>
          {subtitle}
        </Text>
      </Stack>
    </Group>
  );
}

export function SignalLegendCard() {
  const t = useTranslations("onboarding.tour.widgets");

  return (
    <Box
      data-tour="signal-legend"
      style={{
        position: "absolute",
        bottom: 48,
        left: 16,
        zIndex: 11,
        width: 320,
        padding: 24,
        borderRadius: 16,
        background: "rgba(255, 255, 255, 0.9)",
        border: "1px solid #e4e4e7",
        pointerEvents: "auto",
      }}
    >
      <Text
        fw={700}
        tt="uppercase"
        c="#ff5a1f"
        mb={16}
        style={{ letterSpacing: "0.2em", fontSize: 10 }}
      >
        {t("signalLegend")}
      </Text>
      <Stack gap={16}>
        <LegendRow
          variant="high"
          title={t("highConfidence")}
          subtitle={t("highConfidenceHint")}
        />
        <LegendRow
          variant="medium"
          title={t("mediumConfidence")}
          subtitle={t("mediumConfidenceHint")}
        />
      </Stack>
    </Box>
  );
}
