"use client";

import { Text, UnstyledButton } from "@mantine/core";
import { IconChevronUp } from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import classes from "./map-sheet.module.css";
import { MapSheetContext } from "./sheet-context";
import { useSheetDrag } from "./use-sheet-drag";

const MAP_SHEET_ID = "map-sheet";
const MAP_SHEET_BODY_ID = "map-sheet-body";

type MapSheetProps = {
  /** Raised over the map rather than lowered to its peek. */
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
  /** The view's close button: clears the selection. The sheet lowers itself. */
  onClose: () => void;
  /** Identifies what the sheet shows; a new value scrolls the sheet back to the top. */
  contentKey?: string;
  children?: React.ReactNode;
};

/**
 * The Map panel's views on small screens: a sheet over the bottom of the map that the user raises and lowers
 * by tapping or dragging its top. Its views find it through MapSheetContext, which adds a close button and the
 * drag to their nav row and names them in the peek.
 */
export function MapSheet({ expanded, onExpandedChange, onClose, contentKey, children }: MapSheetProps) {
  const t = useTranslations("mapV2.panel");
  const sheetRef = useRef<HTMLElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = 0;
  }, [contentKey]);

  const [peekTitle, setPeekTitle] = useState<string | null>(null);
  const dragHandle = useSheetDrag({ sheetRef, expanded, onSettle: onExpandedChange });
  const close = useCallback(() => {
    onClose();
    onExpandedChange(false);
  }, [onClose, onExpandedChange]);
  const onShowOnMap = useCallback(() => onExpandedChange(false), [onExpandedChange]);
  const context = useMemo(
    () => ({ close, onShowOnMap, setPeekTitle, dragHandle }),
    [close, onShowOnMap, dragHandle],
  );
  const barLabel = expanded ? t("collapse") : t("expand");

  return (
    <>
      <div
        className={classes.backdrop}
        data-visible={expanded ? "true" : undefined}
        onClick={() => onExpandedChange(false)}
        aria-hidden
      />
      <aside
        ref={sheetRef}
        id={MAP_SHEET_ID}
        className={classes.sheet}
        data-expanded={expanded ? "true" : undefined}
        aria-label={t("label")}
      >
        <UnstyledButton
          {...dragHandle}
          className={classes.bar}
          onClick={() => onExpandedChange(!expanded)}
          aria-controls={MAP_SHEET_BODY_ID}
          aria-expanded={expanded}
          aria-label={barLabel}
          title={barLabel}
        >
          <span className={classes.grabber} aria-hidden />
          {!expanded && (
            <span className={classes.peek}>
              {/* Takes the title's own direction, as BidiTitle does, so the ellipsis cuts its end in any script. */}
              <Text component="span" dir="auto" fz={16} fw={700} lh="28px" truncate="end" className={classes.peekTitle}>
                {peekTitle}
              </Text>
              <IconChevronUp size={20} aria-hidden />
            </span>
          )}
        </UnstyledButton>
        <div ref={bodyRef} id={MAP_SHEET_BODY_ID} className={classes.body} inert={!expanded}>
          <MapSheetContext.Provider value={context}>{children}</MapSheetContext.Provider>
        </div>
      </aside>
    </>
  );
}
