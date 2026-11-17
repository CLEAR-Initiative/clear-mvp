"use client";

import { Group, Stack, Switch, Text } from "@mantine/core";
import { useTranslations } from "next-intl";
import type { MapSetting } from "../basemaps/map-settings";
import { useMapSettings } from "../hooks/use-map-settings";

const SETTINGS: ReadonlyArray<MapSetting> = ["roads", "labels"];

export function MapSettingsPanel() {
  const t = useTranslations("mapV2.mapSettings");
  const [settings, setSettings] = useMapSettings();

  return (
    <Stack gap={12} px="md" pt={12} pb="md" style={{ background: "var(--color-accent-light)" }}>
      <Text size="sm">{t("title")}</Text>
      {SETTINGS.map((setting) => (
        <Group key={setting} component="label" justify="space-between" wrap="nowrap" style={{ cursor: "pointer" }}>
          <Text component="span" size="xs" lh="18px">
            {t(setting)}
          </Text>
          <Switch
            size="xs"
            color="var(--color-accent)"
            checked={settings[setting]}
            onChange={(event) => void setSettings({ [setting]: event.currentTarget.checked })}
          />
        </Group>
      ))}
    </Stack>
  );
}
