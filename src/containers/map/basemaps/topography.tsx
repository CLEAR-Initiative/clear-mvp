"use client";

import { Layer, Source } from "react-map-gl/mapbox";
import { useThemeColors } from "../hooks/use-theme-color";

const RELIEF_TOKENS = {
  shadow: "--map-hillshade-shadow",
  highlight: "--map-hillshade-highlight",
  contour: "--map-contour",
} as const;

type TopographyProps = { beforeId: string | undefined };

export function Topography({ beforeId }: TopographyProps) {
  const colors = useThemeColors(RELIEF_TOKENS);

  return (
    <>
      <Source id="topography-dem" type="raster-dem" url="mapbox://mapbox.mapbox-terrain-dem-v1" tileSize={512} maxzoom={14}>
        <Layer
          id="topography-hillshade"
          type="hillshade"
          beforeId={beforeId}
          paint={{
            "hillshade-exaggeration": ["interpolate", ["linear"], ["zoom"], 2, 0.3, 4, 0.55, 8, 0.85, 10, 0.55, 14, 0.3],
            "hillshade-shadow-color": colors.shadow,
            "hillshade-highlight-color": colors.highlight,
          }}
        />
      </Source>
      <Source id="topography-contours" type="vector" url="mapbox://mapbox.mapbox-terrain-v2">
        <Layer
          id="topography-contours"
          type="line"
          source-layer="contour"
          beforeId={beforeId}
          minzoom={9}
          paint={{
            "line-color": colors.contour,
            "line-width": ["match", ["get", "index"], [5, 10], 1, 0.5],
            "line-opacity": ["interpolate", ["linear"], ["zoom"], 9, 0, 10, 0.6],
          }}
        />
      </Source>
    </>
  );
}
