"use client";

import { Group, Paper, Stack, Text } from "@mantine/core";
import { useTranslations } from "next-intl";
import { Popup } from "react-map-gl/mapbox";
import type { HoveredSignal } from "./hovered-signal";
import { SeverityTag } from "./severity-tag";

const TOOLTIP_OFFSET_PX = 8;
const TOOLTIP_WIDTH_PX = 222;

export function SignalTooltip({ signal }: { signal: HoveredSignal }) {
  const t = useTranslations("mapV2.signalTooltip");

  return (
    <Popup
      longitude={signal.coordinates[0]}
      latitude={signal.coordinates[1]}
      offset={TOOLTIP_OFFSET_PX}
      maxWidth="none"
      closeButton={false}
      closeOnClick={false}
      closeOnMove={false}
      focusAfterOpen={false}
      className="map-v2-tooltip"
    >
      <Paper
        w={TOOLTIP_WIDTH_PX}
        p={10}
        radius="sm"
        shadow="sm"
        withBorder
        style={{ background: "var(--color-bg-white)", borderColor: "var(--color-border)" }}
      >
        <Stack gap={8}>
          <Stack gap={4}>
            <Text size="xs" tt="uppercase" c="var(--color-text-secondary)">
              {t("signal")}
            </Text>
            <Text size="xs" fw={700} lineClamp={3} c="var(--color-text-primary)">
              {signal.title ?? t("untitled")}
            </Text>
          </Stack>
          <Group gap={6} wrap="nowrap">
            <Text size="xs" tt="uppercase" c="var(--color-text-secondary)">
              {t("severity")}
            </Text>
            <SeverityTag severity={signal.severity} />
          </Group>
        </Stack>
      </Paper>
    </Popup>
  );
}
