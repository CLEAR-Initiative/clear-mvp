"use client";

import { useEffect, useMemo } from "react";
import { Layer, Source } from "react-map-gl/mapbox";
import { api } from "~/trpc/react";
import { useThemeColors } from "../../hooks/use-theme-color";
import type { LayerProps } from "../types";
import { SEVERITY_TOKENS, SURFACE_TOKENS } from "./severity-tokens";
import { signalsToFeatures } from "./to-features";
import { useSignalsWindow } from "./use-signals-window";

export function SignalsLayer({ id, beforeId, opacity, visible, onStatusChange }: LayerProps) {
  const range = useSignalsWindow();
  const query = api.signals.forMap.useQuery(
    { ...range, includeDummy: true },
    { placeholderData: (prev) => prev },
  );
  const severity = useThemeColors(SEVERITY_TOKENS);
  const surface = useThemeColors(SURFACE_TOKENS);
  const data = useMemo(() => signalsToFeatures(query.data ?? []), [query.data]);

  useEffect(() => {
    onStatusChange(query.isError);
  }, [query.isError, onStatusChange]);

  return (
    <Source id={id} type="geojson" data={data}>
      <Layer
        id={id}
        type="circle"
        beforeId={beforeId}
        layout={{ visibility: visible ? "visible" : "none" }}
        paint={{
          "circle-color": [
            "match",
            ["get", "severity"],
            "critical", severity.critical,
            "high", severity.high,
            "medium", severity.medium,
            "low", severity.low,
            severity.unknown,
          ],
          "circle-radius": 5,
          "circle-stroke-width": 1,
          "circle-stroke-color": surface.stroke,
          "circle-opacity": opacity,
          "circle-stroke-opacity": opacity,
        }}
      />
    </Source>
  );
}
