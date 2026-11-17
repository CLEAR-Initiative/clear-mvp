"use client";

import { Divider, Stack, UnstyledButton } from "@mantine/core";
import { IconMinus, IconPlus } from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { useMap, type MapRef } from "react-map-gl/mapbox";

const BUTTON_STYLE = { display: "flex", alignItems: "center", justifyContent: "center", width: 32, height: 30 };
const DISABLED_BUTTON_STYLE = { ...BUTTON_STYLE, cursor: "default" };
const WORLD_TILE_SIZE = 512;
const ZOOM_TOLERANCE = 0.01;

function lowestZoom(map: MapRef): number {
  // Mapbox's Mercator stops zooming out once the world is as tall as the canvas.
  return Math.max(map.getMinZoom(), Math.log2(map.getContainer().clientHeight / WORLD_TILE_SIZE));
}

export function ZoomControl() {
  const t = useTranslations("mapV2.controls");
  const { current: map } = useMap();
  const [range, setRange] = useState(() => (map ? { zoom: map.getZoom(), lowest: lowestZoom(map) } : null));

  useEffect(() => {
    if (!map) return;
    const update = () => setRange({ zoom: map.getZoom(), lowest: lowestZoom(map) });
    update();
    map.on("zoomend", update);
    map.on("resize", update);
    return () => {
      map.off("zoomend", update);
      map.off("resize", update);
    };
  }, [map]);

  const atMin = map != null && range != null && range.zoom <= range.lowest + ZOOM_TOLERANCE;
  const atMax = map != null && range != null && range.zoom >= map.getMaxZoom();

  return (
    <Stack
      gap={0}
      align="center"
      style={{ background: "var(--color-bg-white)", borderRadius: 2, boxShadow: "var(--shadow-xs)" }}
    >
      <UnstyledButton aria-label={t("zoomIn")} onClick={() => map?.zoomIn()} disabled={atMax} style={atMax ? DISABLED_BUTTON_STYLE : BUTTON_STYLE}>
        <IconPlus size={14} color={atMax ? "var(--color-text-muted)" : "var(--color-text-primary)"} />
      </UnstyledButton>
      <Divider w={20} color="var(--color-border)" />
      <UnstyledButton aria-label={t("zoomOut")} onClick={() => map?.zoomOut()} disabled={atMin} style={atMin ? DISABLED_BUTTON_STYLE : BUTTON_STYLE}>
        <IconMinus size={14} color={atMin ? "var(--color-text-muted)" : "var(--color-text-primary)"} />
      </UnstyledButton>
    </Stack>
  );
}
