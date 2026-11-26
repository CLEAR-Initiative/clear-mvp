"use client";

import { useEffect, useId, useRef, useState } from "react";
import { UnstyledButton } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { IconStack2 } from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import { useActiveLayers } from "../hooks/use-active-layers";
import type { MapSelection } from "../selection";
import { LegendRows } from "./legend-rows";
import { LegendSheet } from "./legend-sheet";
import classes from "./legend.module.css";

const OPEN_BY_DEFAULT_QUERY = "(min-width: 48em)";

export function Legend({ selection = null }: { selection?: MapSelection | null }) {
  const t = useTranslations("mapV2");
  const [activeLayers] = useActiveLayers();
  const wide = useMediaQuery(OPEN_BY_DEFAULT_QUERY, undefined, { getInitialValueInEffect: false }) ?? false;
  const [opened, setOpened] = useState(() => window.matchMedia(OPEN_BY_DEFAULT_QUERY).matches);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const openedByClickRef = useRef(false);
  const cardId = useId();

  useEffect(() => {
    if (!opened || !openedByClickRef.current) return;
    openedByClickRef.current = false;
    if (!wide) closeRef.current?.focus();
  }, [opened, wide]);

  useEffect(() => {
    if (selection && !window.matchMedia(OPEN_BY_DEFAULT_QUERY).matches) setOpened(false);
  }, [selection]);

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
        <LegendSheet id={cardId} opened={opened} onClose={close} closeRef={closeRef}>
          <LegendRows onRemoved={onSheetRowRemoved} />
        </LegendSheet>
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
          setOpened((value) => !value);
        }}
      >
        <IconStack2 size={16} />
      </UnstyledButton>
    </div>
  );
}
