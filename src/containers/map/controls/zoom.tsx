"use client";

import { Divider, Stack, UnstyledButton } from "@mantine/core";
import { IconMinus, IconPlus } from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import { useMap } from "react-map-gl/mapbox";

const BUTTON_STYLE = { display: "flex", alignItems: "center", justifyContent: "center", width: 20, height: 14 };

export function ZoomControl() {
  const t = useTranslations("mapV2.controls");
  const { current: map } = useMap();

  return (
    <Stack
      gap={8}
      align="center"
      p={6}
      py={8}
      style={{ background: "var(--color-bg-white)", borderRadius: 2, boxShadow: "var(--shadow-xs)" }}
    >
      <UnstyledButton aria-label={t("zoomIn")} onClick={() => map?.zoomIn()} style={BUTTON_STYLE}>
        <IconPlus size={14} color="var(--color-text-primary)" />
      </UnstyledButton>
      <Divider w={20} color="var(--color-border)" />
      <UnstyledButton aria-label={t("zoomOut")} onClick={() => map?.zoomOut()} style={BUTTON_STYLE}>
        <IconMinus size={14} color="var(--color-text-primary)" />
      </UnstyledButton>
    </Stack>
  );
}
