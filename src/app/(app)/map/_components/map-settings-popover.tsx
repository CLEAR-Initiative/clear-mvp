"use client";

import { useState } from "react";
import { Box, Text, Group, Select, Popover } from "@mantine/core";
import { IconSettings } from "@tabler/icons-react";

export type BoundaryLevel = "none" | "A0" | "A1" | "A2";

interface MapSettingsPopoverProps {
  boundaryLevel: BoundaryLevel;
  onBoundaryLevelChange: (level: BoundaryLevel) => void;
}

const BOUNDARY_OPTIONS = [
  { value: "none", label: "None" },
  { value: "A0", label: "A0 - Country" },
  { value: "A1", label: "A1 - States" },
  { value: "A2", label: "A2 - Districts" },
];

export function MapSettingsPopover({ boundaryLevel, onBoundaryLevelChange }: MapSettingsPopoverProps) {
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
            border: "1px solid #E5E5E5",
            background: "white",
            cursor: "pointer",
            color: opened ? "#2563EB" : "#525252",
            boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
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
          c="#737373"
          style={{ fontSize: 10, letterSpacing: "0.05em" }}
          mb={10}
        >
          Map Settings
        </Text>

        <Group justify="space-between" align="center" gap={8} wrap="nowrap">
          <Box style={{ flexShrink: 0 }}>
            <Text size="xs" c="#525252" style={{ fontSize: 12 }}>
              Show boundaries
            </Text>
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
      </Popover.Dropdown>
    </Popover>
  );
}
