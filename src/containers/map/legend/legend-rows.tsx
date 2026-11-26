"use client";

import { Fragment } from "react";
import { UnstyledButton } from "@mantine/core";
import { IconX } from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import { useActiveLayers } from "../hooks/use-active-layers";
import { LAYERS, type LayerId } from "../layers/registry";
import { LayerControls } from "./layer-controls";
import classes from "./legend.module.css";

export function LegendRows({ onRemoved }: { onRemoved: () => void }) {
  const t = useTranslations("mapV2");
  const [activeLayers, { setLayers, updateLayer }] = useActiveLayers();

  const removeLayer = (id: LayerId) => {
    void setLayers((layers) => layers.filter((layer) => layer.id !== id));
    onRemoved();
  };

  return activeLayers.map((layer) => {
    const { id } = layer;
    const { Legend: LayerLegend } = LAYERS[id];
    const title = t(`layers.${id}.title`);
    return (
      <Fragment key={id}>
        <div className={classes.header}>
          <h2 className={classes.title}>{title}</h2>
          <LayerControls layer={layer} onChange={(patch) => updateLayer(id, patch)} />
          <span className={classes.divider} aria-hidden />
          <UnstyledButton
            aria-label={t("controls.removeLayer", { layer: title })}
            className={classes.icon}
            onClick={() => removeLayer(id)}
          >
            <IconX size={16} />
          </UnstyledButton>
        </div>
        <LayerLegend settings={layer.settings} onSettingsChange={(settings) => updateLayer(id, { settings })} />
      </Fragment>
    );
  });
}
