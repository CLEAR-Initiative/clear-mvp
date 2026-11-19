"use client";

import { Group, Stack } from "@mantine/core";
import { Legend } from "../legend";
import { AskAiButton } from "./ask-ai";
import { BasemapControl } from "./basemap";
import { PanelToggle } from "./panel-toggle";
import { ZoomControl } from "./zoom";

export function MapControls({
  panelCollapsed,
  onPanelToggle,
}: {
  panelCollapsed: boolean;
  onPanelToggle: () => void;
}) {
  return (
    <>
      <Stack
        gap={12}
        align="flex-start"
        className="map-v2-start-controls"
        style={{ position: "absolute", bottom: 40, zIndex: 1 }}
      >
        <Legend />
        <Group gap={16} wrap="nowrap">
          <PanelToggle collapsed={panelCollapsed} onToggle={onPanelToggle} />
          <AskAiButton />
        </Group>
      </Stack>
      <Stack gap={9} align="flex-end" style={{ position: "absolute", bottom: 40, right: 24, zIndex: 1 }}>
        <BasemapControl />
        <ZoomControl />
      </Stack>
    </>
  );
}
