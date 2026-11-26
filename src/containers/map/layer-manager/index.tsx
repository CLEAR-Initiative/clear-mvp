"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert } from "@mantine/core";
import { IconAlertTriangle } from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import { Layer } from "react-map-gl/mapbox";
import { useActiveLayers, type ActiveLayer } from "../hooks/use-active-layers";
import type { LayerId } from "../layers/registry";
import type { LayerStatus } from "../layers/types";
import { LayerManagerItem } from "./item";
import { loadingLayerIds } from "./loading";
import { markerId, slotBeforeIds } from "./order";

type LayerManagerProps = {
  labelAnchorId: string | undefined;
  onLoadingChange: (layerIds: LayerId[]) => void;
};

type LayerStatuses = Readonly<Partial<Record<ActiveLayer["id"], LayerStatus>>>;

export function LayerManager({ labelAnchorId, onLoadingChange }: LayerManagerProps) {
  const t = useTranslations("mapV2.errors.layerUnavailable");
  const [activeLayers] = useActiveLayers();
  const [statuses, setStatuses] = useState<LayerStatuses>({});

  const handleStatusChange = useCallback((id: ActiveLayer["id"], status: LayerStatus) => {
    setStatuses((prev) => {
      const current = prev[id];
      if (current?.loading === status.loading && current.error === status.error) return prev;
      return { ...prev, [id]: status };
    });
  }, []);

  const beforeIds = useMemo(
    () => slotBeforeIds(activeLayers.map((layer) => layer.id), labelAnchorId),
    [activeLayers, labelAnchorId],
  );

  const hasActiveError = activeLayers.some((layer) => statuses[layer.id]?.error);
  const loading = useMemo(() => loadingLayerIds(activeLayers, statuses), [activeLayers, statuses]);

  useEffect(() => {
    onLoadingChange(loading);
  }, [loading, onLoadingChange]);

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
