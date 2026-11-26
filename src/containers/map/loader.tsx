"use client";

import { Loader, Text } from "@mantine/core";
import { useFormatter, useTranslations } from "next-intl";
import { useShowAfterDelay } from "./hooks/use-show-after-delay";
import type { LayerId } from "./layers/registry";

const SHOW_DELAY_MS = 300;

type MapLoaderProps = {
  mapLoading: boolean;
  loadingLayerIds: LayerId[];
};

export function MapLoader({ mapLoading, loadingLayerIds }: MapLoaderProps) {
  const t = useTranslations("mapV2");
  const format = useFormatter();
  const shown = useShowAfterDelay(mapLoading || loadingLayerIds.length > 0, SHOW_DELAY_MS);

  const label = mapLoading
    ? t("loading")
    : t("loadingLayers", { layers: format.list(loadingLayerIds.map((id) => t(`layers.${id}.inSentence`))) });

  return (
    <div className="map-v2-loader" role="status">
      {shown && (
        <>
          <Loader size={48} />
          <Text size="lg" fw={600} className="map-v2-loader-label">
            {label}
          </Text>
        </>
      )}
    </div>
  );
}
