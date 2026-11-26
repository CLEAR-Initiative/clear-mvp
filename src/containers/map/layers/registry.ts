import { SignalsLayer } from "./detections/layer";
import { SignalsLegend } from "./detections/legend";
import type { LayerDefinition } from "./types";

export const LAYERS = {
  signals: { Component: SignalsLayer, Legend: SignalsLegend },
} satisfies Record<string, LayerDefinition>;

export type LayerId = keyof typeof LAYERS;

export function isLayerId(id: string): id is LayerId {
  return Object.hasOwn(LAYERS, id);
}
