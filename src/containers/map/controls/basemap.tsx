"use client";

import { useState } from "react";
import Image from "next/image";
import { Group, Paper, Popover, Radio, Stack, Text, UnstyledButton } from "@mantine/core";
import { useTranslations } from "next-intl";
import { useIsDark } from "~/hooks/use-is-dark";
import { BASEMAP_IDS, type BasemapId } from "../constants";
import { useBasemap } from "../hooks/use-basemap";
import { MapSettingsPanel } from "./map-settings";

const THUMBNAIL_SIZE = 32;

type Variant = "simple-light" | "simple-dark" | "satellite" | "topography";

const THUMBNAILS: Record<Variant, string> = {
  "simple-light": "/images/map-v2/basemaps/simple-light.png",
  "simple-dark": "/images/map-v2/basemaps/simple-dark.png",
  satellite: "/images/map-v2/basemaps/satellite.png",
  topography: "/images/map-v2/basemaps/topography.png",
};

function variantOf(id: BasemapId, isDark: boolean): Variant {
  if (id === "simple") return isDark ? "simple-dark" : "simple-light";
  return id;
}

function Thumbnail({ variant, active = false }: { variant: Variant; active?: boolean }) {
  return (
    <Image
      src={THUMBNAILS[variant]}
      alt=""
      width={THUMBNAIL_SIZE}
      height={THUMBNAIL_SIZE}
      style={{
        display: "block",
        borderRadius: 2,
        border: active ? undefined : "1.5px solid var(--color-bg-white)",
        boxShadow: active ? "0 0 0 2px var(--color-accent)" : "var(--shadow-xs)",
      }}
    />
  );
}

export function BasemapControl() {
  const t = useTranslations("mapV2.basemaps");
  const isDark = useIsDark();
  const [basemap, setBasemap] = useBasemap();
  const [opened, setOpened] = useState(false);

  return (
    <Popover opened={opened} onChange={setOpened} position="left-end" offset={10} width={320} shadow="sm" radius={4}>
      <Popover.Target>
        <UnstyledButton
          aria-label={t("button")}
          aria-expanded={opened}
          onClick={() => setOpened((o) => !o)}
          style={{ display: "block", width: THUMBNAIL_SIZE, height: THUMBNAIL_SIZE }}
        >
          <Thumbnail variant={variantOf(basemap, isDark)} active={opened} />
        </UnstyledButton>
      </Popover.Target>
      <Popover.Dropdown p={0} style={{ border: "none", overflow: "hidden" }}>
        <Paper px="md" pt={12} pb="md" radius={4}>
          <Text size="sm" mb={12}>
            {t("title")}
          </Text>
          <Radio.Group value={basemap} onChange={(value) => void setBasemap(value as BasemapId)}>
            <Stack gap={12}>
              {BASEMAP_IDS.map((id) => {
                const variant = variantOf(id, isDark);
                return (
                  <Group key={id} component="label" gap={8} wrap="nowrap" align="flex-start" style={{ cursor: "pointer" }}>
                    <Thumbnail variant={variant} />
                    <Stack component="span" gap={2} style={{ flex: 1, minWidth: 0 }}>
                      <Text component="span" size="xs" lh="18px">
                        {t(`${variant}.title`)}
                      </Text>
                      <Text component="span" fz={10} lh="16px" c="var(--color-text-secondary)">
                        {t(`${variant}.description`)}
                      </Text>
                    </Stack>
                    <Radio value={id} size="xs" color="var(--color-accent)" />
                  </Group>
                );
              })}
            </Stack>
          </Radio.Group>
        </Paper>
        <MapSettingsPanel />
      </Popover.Dropdown>
    </Popover>
  );
}
