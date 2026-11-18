import type { ComponentType } from "react";
import type { LayerId } from "./registry";

export type LayerProps = {
  id: LayerId;
  beforeId: string | undefined;
  opacity: number;
  visible: boolean;
  onStatusChange: (hasError: boolean) => void;
};

export type LayerDefinition = {
  Component: ComponentType<LayerProps>;
  Legend: ComponentType;
};
