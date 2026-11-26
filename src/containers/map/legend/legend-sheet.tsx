"use client";

import { useId, type ReactNode, type RefObject } from "react";
import { Portal, UnstyledButton } from "@mantine/core";
import { IconStack2, IconX } from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import classes from "./legend-sheet.module.css";

type LegendSheetProps = {
  id: string;
  opened: boolean;
  onClose: () => void;
  closeRef: RefObject<HTMLButtonElement | null>;
  children: ReactNode;
};

export function LegendSheet({ id, opened, onClose, closeRef, children }: LegendSheetProps) {
  const t = useTranslations("mapV2");
  const titleId = useId();

  return (
    <Portal>
      <section
        id={id}
        aria-labelledby={titleId}
        data-opened={opened}
        inert={!opened}
        className={classes.sheet}
        onKeyDown={(event) => {
          if (event.key === "Escape") onClose();
        }}
      >
        <div className={classes.header}>
          <div className={classes.heading}>
            <h2 id={titleId} className={classes.title}>
              {t("controls.legend")}
            </h2>
            <IconStack2 size={20} aria-hidden />
          </div>
          <UnstyledButton
            ref={closeRef}
            aria-label={t("controls.closeLegend")}
            className={classes.close}
            onClick={onClose}
          >
            <IconX size={20} />
          </UnstyledButton>
        </div>
        <div className={classes.body}>{children}</div>
      </section>
    </Portal>
  );
}
