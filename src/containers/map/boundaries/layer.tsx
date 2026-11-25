"use client";

import { Layer, Source } from "react-map-gl/mapbox";
import type { BasemapId } from "../constants";
import { useActiveLayers } from "../hooks/use-active-layers";
import { useMapSettings } from "../hooks/use-map-settings";
import { useThemeColors } from "../hooks/use-theme-color";
import { boundariesBeforeId } from "../layer-manager/order";
import { BOUNDARY_WIDTH, type BoundaryScope } from "./model";
import { useAdminBoundaries } from "./use-admin-boundaries";

const BOUNDARY_TOKENS = {
  line: "--map-boundary",
  halo: "--map-boundary-halo",
} as const;

const SOURCE_ID = "map-v2-boundaries";
const LINE_ID = "map-v2-boundaries-line";
const HALO_ID = "map-v2-boundaries-halo";

type AdminBoundariesProps = {
  basemap: BasemapId;
  scope: BoundaryScope;
  labelAnchorId: string | undefined;
};

export function AdminBoundaries({ basemap, scope, labelAnchorId }: AdminBoundariesProps) {
  const [{ boundaries: level }] = useMapSettings();
  const [activeLayers] = useActiveLayers();
  const colors = useThemeColors(BOUNDARY_TOKENS);
  const data = useAdminBoundaries(level, scope);

  if (!data) return null;

  const width = BOUNDARY_WIDTH[level];

  return (
    <Source id={SOURCE_ID} type="geojson" data={data}>
      <Layer
        id={LINE_ID}
        type="line"
        layout={{ "line-join": "round" }}
        paint={{ "line-color": colors.line, "line-width": width }}
        beforeId={boundariesBeforeId(
          activeLayers.map((layer) => layer.id),
          labelAnchorId,
        )}
      />
      {basemap === "satellite" && (
        <Layer
          id={HALO_ID}
          type="line"
          layout={{ "line-join": "round" }}
          paint={{ "line-color": colors.halo, "line-width": width + 2 }}
          beforeId={LINE_ID}
        />
      )}
    </Source>
  );
}
