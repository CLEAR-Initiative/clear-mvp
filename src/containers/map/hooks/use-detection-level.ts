import { useCallback } from "react";
import { DETECTION_LAYER_IDS, detectionKindOf } from "../layers/detection-layers";
import type { DetectionKind } from "../selection";
import { useActiveLayers, type ActiveLayer } from "./use-active-layers";

function withLevel(layers: ActiveLayer[], kind: DetectionKind | null): ActiveLayer[] {
  const firstIndex = layers.findIndex((layer) => detectionKindOf(layer.id) !== null);
  const rest = layers.filter((layer) => detectionKindOf(layer.id) === null);
  if (!kind) return rest;
  const next = [...rest];
  next.splice(Math.max(firstIndex, 0), 0, { id: DETECTION_LAYER_IDS[kind], visibility: true, opacity: 1 });
  return next;
}

/** The Detection level: which detections the map shows, read from and written to the detection layer in `?layers`. */
export function useDetectionLevel() {
  const [layers, { setLayers, updateLayer }] = useActiveLayers();
  const layer = layers.find((item) => detectionKindOf(item.id) !== null) ?? null;
  const level = layer ? detectionKindOf(layer.id) : null;
  const visible = layer?.visibility ?? false;

  const setLevel = useCallback(
    (kind: DetectionKind | null) => void setLayers((current) => withLevel(current, kind)),
    [setLayers],
  );

  const setVisible = useCallback(
    (next: boolean) => {
      if (layer) void updateLayer(layer.id, { visibility: next });
      else if (next) setLevel("alert");
    },
    [layer, updateLayer, setLevel],
  );

  return { level, visible, setLevel, setVisible };
}
