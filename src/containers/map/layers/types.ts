import type { ComponentType } from "react";
import type { LayerSettings } from "../hooks/use-active-layers";
import type { LayerId } from "./registry";

export type LayerStatus = { loading: boolean; error: boolean };

export type LayerProps = {
  id: LayerId;
  beforeId: string | undefined;
  opacity: number;
  visible: boolean;
  settings: LayerSettings | undefined;
  onStatusChange: (status: LayerStatus) => void;
};

export type LegendProps = {
  id: LayerId;
  settings: LayerSettings | undefined;
  onSettingsChange: (settings: LayerSettings | undefined) => void;
};

export type LayerDefinition = {
  Component: ComponentType<LayerProps>;
  Legend: ComponentType<LegendProps>;
};
