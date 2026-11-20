"use client";

import { Stack } from "@mantine/core";
import { Legend } from "../legend";
import { AskAiButton } from "./ask-ai";
import { BasemapControl } from "./basemap";
import { ZoomControl } from "./zoom";

export function MapControls() {
  return (
    <>
      <Stack gap={12} align="flex-start" className="map-v2-start-controls">
        <Legend />
        <AskAiButton />
      </Stack>
      <Stack gap={9} align="flex-end" className="map-v2-end-controls">
        <BasemapControl />
        <ZoomControl />
      </Stack>
    </>
  );
}
