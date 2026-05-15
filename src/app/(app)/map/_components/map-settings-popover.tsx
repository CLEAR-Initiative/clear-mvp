"use client";

import { useState } from "react";
import { Box, Text, Group, Select, Popover, Switch, Divider } from "@mantine/core";
import { IconSettings } from "@tabler/icons-react";

export type BoundaryLevel = "none" | "A0" | "A1" | "A2";

interface MapSettingsPopoverProps {
  boundaryLevel: BoundaryLevel;
  onBoundaryLevelChange: (level: BoundaryLevel) => void;
  showPopulation?: boolean;
  onShowPopulationChange?: (show: boolean) => void;
}

const BOUNDARY_OPTIONS = [
  { value: "none", label: "None" },
  { value: "A0", label: "A0 - Country" },
  { value: "A1", label: "A1 - States" },
  { value: "A2", label: "A2 - Districts" },
];

export function MapSettingsPopover({
  boundaryLevel,
  onBoundaryLevelChange,
  showPopulation = false,
  onShowPopulationChange,
}: MapSettingsPopoverProps) {
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
          title="Map settings"
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
          Map Settings
        </Text>

        <Group justify="space-between" align="center" gap={8} wrap="nowrap">
          <Box style={{ flexShrink: 0 }}>
            <Text size="xs" c="var(--color-text-secondary)" style={{ fontSize: 12 }}>Show boundaries</Text>
          </Box>
          <Select
            size="xs"
            value={boundaryLevel}
            onChange={(v) => onBoundaryLevelChange((v ?? "A1") as BoundaryLevel)}
            data={BOUNDARY_OPTIONS}
            style={{ minWidth: 130 }}
            styles={{ input: { fontWeight: 600, fontSize: 12 } }}
          />
        </Group>

        {onShowPopulationChange && (
          <>
            <Divider color="var(--color-border)" my={10} />
            <Group justify="space-between" align="center" gap={8} wrap="nowrap">
              <Box>
                <Text size="xs" c="var(--color-text-secondary)" style={{ fontSize: 12 }}>Population layer</Text>
                <Text size="xs" c="var(--color-text-muted)" style={{ fontSize: 10 }}>A2 district resolution</Text>
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
