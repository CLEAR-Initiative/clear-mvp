"use client";

import { useCallback } from "react";
import type { ActiveLayer } from "../hooks/use-active-layers";
import { LAYERS } from "../layers/registry";
import type { LayerStatus } from "../layers/types";

type LayerManagerItemProps = {
  layer: ActiveLayer;
  beforeId: string | undefined;
  onStatusChange: (id: ActiveLayer["id"], status: LayerStatus) => void;
};

export function LayerManagerItem({ layer, beforeId, onStatusChange }: LayerManagerItemProps) {
  const { Component } = LAYERS[layer.id];
  const handleStatusChange = useCallback(
    (status: LayerStatus) => onStatusChange(layer.id, status),
    [layer.id, onStatusChange],
  );

  return (
    <Component
      id={layer.id}
      beforeId={beforeId}
      opacity={layer.opacity}
      visible={layer.visibility}
      settings={layer.settings}
      onStatusChange={handleStatusChange}
    />
  );
}
