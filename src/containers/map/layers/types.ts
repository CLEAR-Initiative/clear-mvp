import type { ComponentType } from "react";
import type { LayerId } from "./registry";

export type LayerStatus = { loading: boolean; error: boolean };

export type LayerProps = {
  id: LayerId;
  beforeId: string | undefined;
  opacity: number;
  visible: boolean;
  onStatusChange: (status: LayerStatus) => void;
};

export type LayerDefinition = {
  Component: ComponentType<LayerProps>;
  Legend: ComponentType;
};
