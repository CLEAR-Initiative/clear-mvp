"use client";

import { useId, type CSSProperties, type KeyboardEvent, type ReactNode, type RefObject } from "react";
import { FocusTrap, Portal, UnstyledButton } from "@mantine/core";
import { IconX } from "@tabler/icons-react";
import classes from "./map-sheet.module.css";

export const WIDE_QUERY = "(min-width: 48em)";

type MapSheetProps = {
  id: string;
  title: string;
  icon: ReactNode;
  closeLabel: string;
  opened: boolean;
  onClose: () => void;
  closeRef?: RefObject<HTMLButtonElement | null>;
  modal?: boolean;
  maxHeight?: string;
  flush?: boolean;
  children: ReactNode;
};

export function MapSheet({
  id,
  title,
  icon,
  closeLabel,
  opened,
  onClose,
  closeRef,
  modal = false,
  maxHeight = "50dvh",
  flush = false,
  children,
}: MapSheetProps) {
  const titleId = useId();

  const content = (
    <>
      <div className={classes.header}>
        <div className={classes.heading}>
          <h2 id={titleId} className={classes.title}>
            {title}
          </h2>
          {icon}
        </div>
        <UnstyledButton
          ref={closeRef}
          aria-label={closeLabel}
          className={classes.close}
          onClick={onClose}
          data-autofocus={modal || undefined}
        >
          <IconX size={20} />
        </UnstyledButton>
      </div>
      <div className={classes.body} data-flush={flush}>
        {children}
      </div>
    </>
  );

  const sheetProps = {
    id,
    "aria-labelledby": titleId,
    "data-opened": opened,
    inert: !opened,
    className: classes.sheet,
    style: { "--map-sheet-max-height": maxHeight } as CSSProperties,
    onKeyDown: (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    },
  };

  if (!modal) {
    return (
      <Portal>
        <section {...sheetProps}>{content}</section>
      </Portal>
    );
  }

  return (
    <Portal>
      <div className={classes.backdrop} data-opened={opened} data-map-sheet-backdrop onClick={onClose} aria-hidden />
      <FocusTrap active={opened}>
        <div role="dialog" aria-modal="true" {...sheetProps}>
          {content}
        </div>
      </FocusTrap>
    </Portal>
  );
}
