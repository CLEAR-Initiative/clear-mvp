"use client";

import { useCallback, useMemo, useState } from "react";
import { Alert } from "@mantine/core";
import { IconAlertTriangle } from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import { Layer } from "react-map-gl/mapbox";
import { useActiveLayers, type ActiveLayer } from "../hooks/use-active-layers";
import { LayerManagerItem } from "./item";
import { markerId, slotBeforeIds } from "./order";

type LayerManagerProps = { labelAnchorId: string | undefined };

export function LayerManager({ labelAnchorId }: LayerManagerProps) {
  const t = useTranslations("mapV2.errors.layerUnavailable");
  const [activeLayers] = useActiveLayers();
  const [layersWithErrors, setLayersWithErrors] = useState<ReadonlySet<ActiveLayer["id"]>>(new Set());

  const handleStatusChange = useCallback((id: ActiveLayer["id"], hasError: boolean) => {
    setLayersWithErrors((prev) => {
      if (prev.has(id) === hasError) return prev;
      const next = new Set(prev);
      if (hasError) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  const beforeIds = useMemo(
    () => slotBeforeIds(activeLayers.map((layer) => layer.id), labelAnchorId),
    [activeLayers, labelAnchorId],
  );

  const hasActiveError =activeLayers.some((layer) => layersWithErrors.has(layer.id));

  return (
    <>
      {activeLayers.map((layer, i) => (
        <Layer
          key={layer.id}
          id={markerId(layer.id)}
          type="background"
          layout={{ visibility: "none" }}
          beforeId={beforeIds[i]}
        />
      ))}
      {activeLayers.map((layer, i) => (
        <LayerManagerItem
          key={layer.id}
          layer={layer}
          beforeId={beforeIds[i]}
          onStatusChange={handleStatusChange}
        />
      ))}
      {hasActiveError && (
        <Alert
          color="red"
          icon={<IconAlertTriangle size={16} />}
          title={t("title")}
          style={{ position: "absolute", top: 16, right: 16, maxWidth: 360, zIndex: 2 }}
        >
          {t("description")}
        </Alert>
      )}
    </>
  );
}
