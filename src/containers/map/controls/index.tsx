"use client";

import { Stack } from "@mantine/core";
import { Legend } from "../legend";
import type { MapSelection } from "../selection";
import { AskAiButton } from "./ask-ai";
import { BasemapControl } from "./basemap";
import { ZoomControl } from "./zoom";

export function MapControls({ selection }: { selection: MapSelection | null }) {
  return (
    <>
      <div className="map-v2-top-controls">
        <AskAiButton />
      </div>
      <Stack gap={9} align="flex-end" className="map-v2-end-controls">
        <BasemapControl />
        <ZoomControl />
        <Legend selection={selection} />
      </Stack>
    </>
  );
}
