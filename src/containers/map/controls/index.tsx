"use client";

import { Stack } from "@mantine/core";
import { BasemapControl } from "./basemap";
import { ZoomControl } from "./zoom";

export function MapControls() {
  return (
    <Stack gap={9} align="flex-end" style={{ position: "absolute", bottom: 40, right: 24, zIndex: 1 }}>
      <BasemapControl />
      <ZoomControl />
    </Stack>
  );
}
