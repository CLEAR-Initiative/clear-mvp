"use client";

import { useId, useRef } from "react";
import Image from "next/image";
import { Group, Paper, Popover, Radio, Stack, Text, UnstyledButton } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { IconWorld } from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import { useIsDark } from "~/hooks/use-is-dark";
import { BASEMAP_IDS, type BasemapId } from "../constants";
import { useBasemap } from "../hooks/use-basemap";
import { MapSheet, WIDE_QUERY } from "../sheet/map-sheet";
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

function BasemapOptions() {
  const t = useTranslations("mapV2.basemaps");
  const isDark = useIsDark();
  const [basemap, setBasemap] = useBasemap();

  return (
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
  );
}

type BasemapControlProps = {
  opened: boolean;
  onOpenedChange: (opened: boolean) => void;
};

export function BasemapControl({ opened, onOpenedChange }: BasemapControlProps) {
  const t = useTranslations("mapV2.basemaps");
  const tControls = useTranslations("mapV2.controls");
  const isDark = useIsDark();
  const [basemap] = useBasemap();
  const wide = useMediaQuery(WIDE_QUERY, undefined, { getInitialValueInEffect: false }) ?? false;
  const buttonRef = useRef<HTMLButtonElement>(null);
  const sheetId = useId();

  const button = (
    <UnstyledButton
      ref={buttonRef}
      aria-label={t("button")}
      aria-expanded={opened}
      aria-controls={wide ? undefined : sheetId}
      onClick={() => onOpenedChange(!opened)}
      style={{ display: "block", width: THUMBNAIL_SIZE, height: THUMBNAIL_SIZE }}
    >
      <Thumbnail variant={variantOf(basemap, isDark)} active={opened} />
    </UnstyledButton>
  );

  if (!wide) {
    return (
      <>
        {button}
        <MapSheet
          id={sheetId}
          modal
          flush
          maxHeight="85dvh"
          title={t("title")}
          icon={<IconWorld size={20} aria-hidden />}
          closeLabel={tControls("closeBasemap")}
          opened={opened}
          onClose={() => {
            onOpenedChange(false);
            buttonRef.current?.focus();
          }}
        >
          <Paper p="md" radius={0}>
            <BasemapOptions />
          </Paper>
          <div style={{ background: "var(--color-accent-light)", paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
            <MapSettingsPanel />
          </div>
        </MapSheet>
      </>
    );
  }

  return (
    <Popover opened={opened} onChange={onOpenedChange} position="left-end" offset={10} width={320} shadow="sm" radius={4}>
      <Popover.Target>{button}</Popover.Target>
      <Popover.Dropdown p={0} style={{ border: "none", overflow: "hidden" }}>
        <Paper px="md" pt={12} pb="md" radius={4}>
          <Text size="sm" mb={12}>
            {t("title")}
          </Text>
          <BasemapOptions />
        </Paper>
        <MapSettingsPanel />
      </Popover.Dropdown>
    </Popover>
  );
}
