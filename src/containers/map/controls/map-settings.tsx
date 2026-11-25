"use client";

import { Group, Radio, Stack, Switch, Text } from "@mantine/core";
import { useTranslations } from "next-intl";
import type { MapSetting } from "../basemaps/map-settings";
import { BOUNDARY_LEVELS, type BoundaryLevel } from "../boundaries/model";
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
      <Radio.Group
        label={t("boundaries.title")}
        labelProps={{ fz: "sm", fw: 400, mb: 12 }}
        value={settings.boundaries}
        onChange={(value) => void setSettings({ boundaries: value as BoundaryLevel })}
      >
        <Stack gap={12}>
          {BOUNDARY_LEVELS.map((level) => (
            <Radio
              key={level}
              value={level}
              size="xs"
              color="var(--color-accent)"
              label={t(`boundaries.${level}`)}
            />
          ))}
        </Stack>
      </Radio.Group>
    </Stack>
  );
}
