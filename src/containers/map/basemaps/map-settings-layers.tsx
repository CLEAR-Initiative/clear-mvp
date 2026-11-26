"use client";

import type { ExpressionSpecification } from "mapbox-gl";
import { useEffect } from "react";
import { useMap } from "react-map-gl/mapbox";
import type { BasemapId } from "../constants";
import { useMapSettings } from "../hooks/use-map-settings";
import { useThemeColors } from "../hooks/use-theme-color";
import { isRestyledRoad, settingOf } from "./map-settings";

const ROAD_TOKENS = {
  corridor: "--map-road-corridor",
  minor: "--map-road-minor",
} as const;

const CORRIDOR_CLASSES = ["motorway", "trunk", "primary"];

const byClass = (corridor: number, secondary: number, rest: number): ExpressionSpecification => [
  "match",
  ["get", "class"],
  CORRIDOR_CLASSES,
  corridor,
  ["secondary", "tertiary"],
  secondary,
  rest,
];

const ROAD_WIDTH: ExpressionSpecification = [
  "interpolate",
  ["exponential", 1.5],
  ["zoom"],
  5,
  byClass(1.8, 0.6, 0),
  8,
  byClass(2.4, 1.2, 0.4),
  11,
  byClass(3.0, 1.8, 1.0),
  14,
  byClass(4.5, 3.0, 2.0),
  16,
  byClass(7, 5, 3.5),
];

export function MapSettingsLayers({ basemap }: { basemap: BasemapId }) {
  const { current } = useMap();
  const [{ roads, labels }] = useMapSettings();
  const colors = useThemeColors(ROAD_TOKENS);
  const restyle = roads && basemap !== "satellite";

  useEffect(() => {
    const map = current?.getMap();
    if (!map) return;
    const visible = { roads, labels };
    const roadColor: ExpressionSpecification = ["match", ["get", "class"], CORRIDOR_CLASSES, colors.corridor, colors.minor];

    const apply = () => {
      try {
        for (const layer of map.getStyle()?.layers ?? []) {
          const setting = settingOf(layer);
          if (!setting) continue;
          map.setLayoutProperty(layer.id, "visibility", visible[setting] ? "visible" : "none");
          if (restyle && isRestyledRoad(layer)) {
            map.setPaintProperty(layer.id, "line-color", roadColor);
            map.setPaintProperty(layer.id, "line-width", ROAD_WIDTH);
          }
        }
      } catch (error) {
        // Mapbox throws this while a new style loads; the style.load listener applies it then.
        if (!(error instanceof Error) || error.message !== "Style is not done loading") throw error;
      }
    };

    apply();
    map.on("style.load", apply);
    return () => {
      map.off("style.load", apply);
    };
  }, [current, roads, labels, restyle, colors]);

  return null;
}
