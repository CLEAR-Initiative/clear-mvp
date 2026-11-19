"use client";

import { Paper, Stack, Text } from "@mantine/core";
import { useTranslations } from "next-intl";
import { useActiveLayers } from "../hooks/use-active-layers";
import { LAYERS } from "../layers/registry";

export function Legend() {
  const t = useTranslations("mapV2.layers");
  const [activeLayers] = useActiveLayers();
  const visibleLayers = activeLayers.filter((layer) => layer.visibility);

  if (visibleLayers.length === 0) return null;

  return (
    <Paper
      shadow="sm"
      p="sm"
      radius="md"
    >
      <Stack gap="sm">
        {visibleLayers.map(({ id }) => {
          const { Legend: LayerLegend } = LAYERS[id];
          return (
            <Stack key={id} gap={6}>
              <Text size="sm" fw={600}>
                {t(`${id}.title`)}
              </Text>
              <LayerLegend />
            </Stack>
          );
        })}
      </Stack>
    </Paper>
  );
}
