"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Box, Text, Group, Select, Popover, Switch, Divider } from "@mantine/core";
import { IconSettings } from "@tabler/icons-react";

export type BoundaryLevel = "none" | "A0" | "A1" | "A2";

interface MapSettingsPopoverProps {
  boundaryLevel: BoundaryLevel;
  onBoundaryLevelChange: (level: BoundaryLevel) => void;
  showPopulation?: boolean;
  onShowPopulationChange?: (show: boolean) => void;
}

// labelKey: i18n keys under map.boundaries.* - resolved via t() at render time.
const BOUNDARY_OPTIONS = [
  { value: "none", labelKey: "none" },
  { value: "A0", labelKey: "a0" },
  { value: "A1", labelKey: "a1" },
  { value: "A2", labelKey: "a2" },
] as const;

export function MapSettingsPopover({
  boundaryLevel,
  onBoundaryLevelChange,
  showPopulation = false,
  onShowPopulationChange,
}: MapSettingsPopoverProps) {
  const t = useTranslations("map");
  const [opened, setOpened] = useState(false);

  return (
    <Popover
      opened={opened}
      onChange={setOpened}
      position="top-start"
      shadow="md"
      width={240}
      withinPortal
    >
      <Popover.Target>
        <button
          onClick={() => setOpened((o) => !o)}
          title={t("settings.tooltip")}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 30,
            height: 30,
            borderRadius: 4,
            border: "1px solid var(--color-border-dark)",
            background: "var(--color-bg-muted)",
            cursor: "pointer",
            color: opened ? "var(--color-info)" : "var(--color-text-secondary)",
            boxShadow: "var(--shadow-sm)",
            padding: 0,
          }}
        >
          <IconSettings size={15} />
        </button>
      </Popover.Target>

      <Popover.Dropdown p={12}>
        <Text
          fw={700}
          tt="uppercase"
          c="var(--color-text-muted)"
          style={{ fontSize: 10, letterSpacing: "0.05em" }}
          mb={10}
        >
          {t("settings.title")}
        </Text>

        <Group justify="space-between" align="center" gap={8} wrap="nowrap">
          <Box style={{ flexShrink: 0 }}>
            <Text size="xs" c="var(--color-text-secondary)" style={{ fontSize: 12 }}>{t("settings.showBoundaries")}</Text>
          </Box>
          <Select
            size="xs"
            value={boundaryLevel}
            onChange={(v) => onBoundaryLevelChange((v ?? "A1") as BoundaryLevel)}
            data={BOUNDARY_OPTIONS.map((o) => ({ value: o.value, label: t(`boundaries.${o.labelKey}`) }))}
            style={{ minWidth: 130 }}
            styles={{ input: { fontWeight: 600, fontSize: 12 } }}
          />
        </Group>

        {onShowPopulationChange && (
          <>
            <Divider color="var(--color-border)" my={10} />
            <Group justify="space-between" align="center" gap={8} wrap="nowrap">
              <Box>
                <Text size="xs" c="var(--color-text-secondary)" style={{ fontSize: 12 }}>{t("settings.populationLayer")}</Text>
                <Text size="xs" c="var(--color-text-muted)" style={{ fontSize: 10 }}>{t("settings.a2Resolution")}</Text>
              </Box>
              <Switch
                size="xs"
                checked={showPopulation}
                onChange={(e) => onShowPopulationChange(e.currentTarget.checked)}
                color="blue"
              />
            </Group>
          </>
        )}
      </Popover.Dropdown>
    </Popover>
  );
}
