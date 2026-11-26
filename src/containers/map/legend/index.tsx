"use client";

import { useEffect, useId, useRef } from "react";
import { UnstyledButton } from "@mantine/core";
import { useMediaQuery, useUncontrolled } from "@mantine/hooks";
import { IconStack2 } from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import { useActiveLayers } from "../hooks/use-active-layers";
import { MapSheet, WIDE_QUERY } from "../sheet/map-sheet";
import { LegendRows } from "./legend-rows";
import classes from "./legend.module.css";

type LegendProps = {
  opened?: boolean;
  onOpenedChange?: (opened: boolean) => void;
};

export function Legend({ opened: openedProp, onOpenedChange }: LegendProps) {
  const t = useTranslations("mapV2");
  const [activeLayers] = useActiveLayers();
  const wide = useMediaQuery(WIDE_QUERY, undefined, { getInitialValueInEffect: false }) ?? false;
  const [opened, setOpened] = useUncontrolled({
    value: openedProp,
    defaultValue: window.matchMedia(WIDE_QUERY).matches,
    onChange: onOpenedChange,
  });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const openedByClickRef = useRef(false);
  const cardId = useId();

  useEffect(() => {
    if (!opened || !openedByClickRef.current) return;
    openedByClickRef.current = false;
    if (!wide) closeRef.current?.focus();
  }, [opened, wide]);

  if (activeLayers.length === 0) return null;

  const focusButton = () => buttonRef.current?.focus();

  const close = () => {
    setOpened(false);
    focusButton();
  };

  const onSheetRowRemoved = () => {
    if (activeLayers.length === 1) setOpened(false);
    else closeRef.current?.focus();
  };

  return (
    <div className={classes.root}>
      {wide ? (
        opened && (
          <section
            id={cardId}
            aria-label={t("controls.legend")}
            className={classes.card}
            onKeyDown={(event) => {
              if (event.key === "Escape") close();
            }}
          >
            <LegendRows onRemoved={focusButton} />
          </section>
        )
      ) : (
        <MapSheet
          id={cardId}
          title={t("controls.legend")}
          icon={<IconStack2 size={20} aria-hidden />}
          closeLabel={t("controls.closeLegend")}
          opened={opened}
          onClose={close}
          closeRef={closeRef}
        >
          <LegendRows onRemoved={onSheetRowRemoved} />
        </MapSheet>
      )}
      <UnstyledButton
        ref={buttonRef}
        aria-label={t("controls.legend")}
        aria-expanded={opened}
        aria-controls={opened || !wide ? cardId : undefined}
        data-active={opened}
        className={classes.button}
        onClick={() => {
          openedByClickRef.current = !opened;
          setOpened(!opened);
        }}
      >
        <IconStack2 size={16} />
      </UnstyledButton>
    </div>
  );
}
