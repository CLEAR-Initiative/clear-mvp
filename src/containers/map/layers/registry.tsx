import { DetectionsLayer } from "./detections/layer";
import { DetectionsLegend } from "./detections/legend";
import type { LayerDefinition, LayerProps } from "./types";

export const LAYERS = {
  signals: { Component: (props: LayerProps) => <DetectionsLayer kind="signal" {...props} />, Legend: DetectionsLegend },
} satisfies Record<string, LayerDefinition>;

export type LayerId = keyof typeof LAYERS;

export function isLayerId(id: string): id is LayerId {
  return Object.hasOwn(LAYERS, id);
}
