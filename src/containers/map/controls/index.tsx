"use client";

import { Stack } from "@mantine/core";
import { Legend } from "../legend";
import { AskAiButton } from "./ask-ai";
import { BasemapControl } from "./basemap";
import { ZoomControl } from "./zoom";

export function MapControls() {
  return (
    <>
      <Stack gap={12} align="flex-start" style={{ position: "absolute", bottom: 40, left: 24, zIndex: 1 }}>
        <Legend />
        <AskAiButton />
      </Stack>
      <Stack gap={9} align="flex-end" style={{ position: "absolute", bottom: 40, right: 24, zIndex: 1 }}>
        <BasemapControl />
        <ZoomControl />
      </Stack>
    </>
  );
}
