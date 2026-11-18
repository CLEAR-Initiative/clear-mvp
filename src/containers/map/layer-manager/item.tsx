"use client";

import { useCallback } from "react";
import type { ActiveLayer } from "../hooks/use-active-layers";
import { LAYERS } from "../layers/registry";

type LayerManagerItemProps = {
  layer: ActiveLayer;
  beforeId: string | undefined;
  onStatusChange: (id: ActiveLayer["id"], hasError: boolean) => void;
};

export function LayerManagerItem({ layer, beforeId, onStatusChange }: LayerManagerItemProps) {
  const { Component } = LAYERS[layer.id];
  const handleStatusChange = useCallback(
    (hasError: boolean) => onStatusChange(layer.id, hasError),
    [layer.id, onStatusChange],
  );

  return (
    <Component
      id={layer.id}
      beforeId={beforeId}
      opacity={layer.opacity}
      visible={layer.visibility}
      onStatusChange={handleStatusChange}
    />
  );
}
