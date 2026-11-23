"use client";

import { Fragment, useId, useRef, useState } from "react";
import { UnstyledButton } from "@mantine/core";
import { IconStack2, IconX } from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import { useActiveLayers } from "../hooks/use-active-layers";
import { LAYERS, type LayerId } from "../layers/registry";
import classes from "./legend.module.css";

const OPEN_BY_DEFAULT_QUERY = "(min-width: 48em)";

export function Legend() {
  const t = useTranslations("mapV2");
  const [activeLayers, setActiveLayers] = useActiveLayers();
  const visibleLayers = activeLayers.filter((layer) => layer.visibility);
  const [opened, setOpened] = useState(() => window.matchMedia(OPEN_BY_DEFAULT_QUERY).matches);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const cardId = useId();

  if (visibleLayers.length === 0) return null;

  const close = () => {
    setOpened(false);
    buttonRef.current?.focus();
  };

  const removeLayer = (id: LayerId) => {
    void setActiveLayers((layers) => layers.filter((layer) => layer.id !== id));
    buttonRef.current?.focus();
  };

  return (
    <div className={classes.root}>
      {opened && (
        <section
          id={cardId}
          aria-label={t("controls.legend")}
          className={classes.card}
          onKeyDown={(event) => {
            if (event.key === "Escape") close();
          }}
        >
          {visibleLayers.map(({ id }) => {
            const { Legend: LayerLegend } = LAYERS[id];
            const title = t(`layers.${id}.title`);
            return (
              <Fragment key={id}>
                <div className={classes.header}>
                  <h2 className={classes.title}>{title}</h2>
                  <UnstyledButton
                    aria-label={t("controls.removeLayer", { layer: title })}
                    className={classes.remove}
                    onClick={() => removeLayer(id)}
                  >
                    <IconX size={16} />
                  </UnstyledButton>
                </div>
                <LayerLegend />
              </Fragment>
            );
          })}
        </section>
      )}
      <UnstyledButton
        ref={buttonRef}
        aria-label={t("controls.legend")}
        aria-expanded={opened}
        aria-controls={opened ? cardId : undefined}
        data-active={opened}
        className={classes.button}
        onClick={() => setOpened((value) => !value)}
      >
        <IconStack2 size={16} />
      </UnstyledButton>
    </div>
  );
}
