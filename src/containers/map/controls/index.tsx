"use client";

import { useEffect, useState } from "react";
import { Stack } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { Legend } from "../legend";
import type { MapSelection } from "../selection";
import { WIDE_QUERY } from "../sheet/map-sheet";
import { AskAiButton } from "./ask-ai";
import { BasemapControl } from "./basemap";
import { ZoomControl } from "./zoom";

const isWide = () => window.matchMedia(WIDE_QUERY).matches;

export function MapControls({ selection }: { selection: MapSelection | null }) {
  const wide = useMediaQuery(WIDE_QUERY, undefined, { getInitialValueInEffect: false }) ?? false;
  const [legendOpened, setLegendOpened] = useState(isWide);
  const [basemapOpened, setBasemapOpened] = useState(false);

  useEffect(() => {
    setBasemapOpened(false);
  }, [wide]);

  useEffect(() => {
    if (selection && !isWide()) setLegendOpened(false);
  }, [selection]);

  const onBasemapOpenedChange = (opened: boolean) => {
    setBasemapOpened(opened);
    if (opened && !isWide()) setLegendOpened(false);
  };

  return (
    <>
      <div className="map-v2-top-controls">
        <AskAiButton />
      </div>
      <Stack gap={9} align="flex-end" className="map-v2-end-controls">
        <BasemapControl opened={basemapOpened} onOpenedChange={onBasemapOpenedChange} />
        <ZoomControl />
        <Legend opened={legendOpened} onOpenedChange={setLegendOpened} />
      </Stack>
    </>
  );
}
