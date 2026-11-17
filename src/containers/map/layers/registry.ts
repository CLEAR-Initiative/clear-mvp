import type { LayerId } from "./ids";
import { SignalsLayer } from "./signals/layer";
import { SignalsLegend } from "./signals/legend";
import type { LayerDefinition } from "./types";

export const LAYERS: Record<LayerId, LayerDefinition> = {
  signals: { Component: SignalsLayer, Legend: SignalsLegend },
};
