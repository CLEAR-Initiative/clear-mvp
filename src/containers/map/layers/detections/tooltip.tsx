"use client";

import { Group, Paper, Stack, Text } from "@mantine/core";
import { useTranslations } from "next-intl";
import { Popup } from "react-map-gl/mapbox";
import type { LayerId } from "../registry";
import type { HoveredDetection } from "./hovered-signal";
import { SeverityTag } from "./severity-tag";

const TOOLTIP_OFFSET_PX = 8;
const TOOLTIP_WIDTH_PX = 222;

export function DetectionTooltip({ layerId, detection }: { layerId: LayerId; detection: HoveredDetection }) {
  const t = useTranslations("mapV2");

  return (
    <Popup
      longitude={detection.coordinates[0]}
      latitude={detection.coordinates[1]}
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
              {t(`layers.${layerId}.item`)}
            </Text>
            <Text size="xs" fw={700} lineClamp={3} c="var(--color-text-primary)">
              {detection.title ?? t(`layers.${layerId}.untitled`)}
            </Text>
          </Stack>
          <Group gap={6} wrap="nowrap">
            <Text size="xs" tt="uppercase" c="var(--color-text-secondary)">
              {t("signalTooltip.severity")}
            </Text>
            <SeverityTag severity={detection.severity} />
          </Group>
        </Stack>
      </Paper>
    </Popup>
  );
}
