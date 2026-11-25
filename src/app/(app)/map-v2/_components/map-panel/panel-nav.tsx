"use client";

import { Group, Text, UnstyledButton, VisuallyHidden } from "@mantine/core";
import { IconFocus2, IconX } from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import { useMapView } from "~/containers/map/hooks/use-map-view";
import type { LngLatPoint } from "~/containers/map/selection";
import { BackLink, type PanelBack } from "./back-link";
import classes from "./panel-views.module.css";
import { useMapSheet } from "./sheet-context";

/**
 * Centres the map on `point` at the current zoom, through the map view in the URL. In the sheet it is an icon
 * the size of the close button beside it, and lowers the sheet so the point is in sight.
 */
function ShowOnMapButton({ point }: { point: LngLatPoint }) {
  const t = useTranslations("mapV2.panel");
  const { zoom, setView } = useMapView();
  const sheet = useMapSheet();
  const onClick = () => {
    setView({ center: point, zoom });
    sheet?.onShowOnMap();
  };

  if (sheet) {
    return (
      <UnstyledButton className={classes.iconButton} c="var(--map-accent)" onClick={onClick}>
        <IconFocus2 size={20} aria-hidden />
        <VisuallyHidden>{t("showOnMap")}</VisuallyHidden>
      </UnstyledButton>
    );
  }

  return (
    <UnstyledButton className={classes.back} onClick={onClick}>
      <Group gap={4} wrap="nowrap" c="var(--map-accent)">
        <IconFocus2 size={16} aria-hidden />
        <Text component="span" fz={12} fw={700} lh={1.5} lts={0.03} className={classes.backLabel}>
          {t("showOnMap")}
        </Text>
      </Group>
    </UnstyledButton>
  );
}

type PanelTopProps = {
  back: PanelBack;
  point: LngLatPoint | null;
  /** The detail views' top is tinted; the stack list's is plain. */
  tinted?: boolean;
  /** The view's heading, under the nav row. */
  children: React.ReactNode;
};

/**
 * The top of a panel view: its nav row, then its heading. Only the nav row stays in sight while the view
 * scrolls; the heading scrolls away with the rest, leaving the room to the view. The two are siblings, not
 * wrapped, so the nav row stays stuck across the whole view.
 */
export function PanelTop({ back, point, tinted = false, children }: PanelTopProps) {
  const tint = tinted ? "true" : undefined;

  return (
    <>
      <div className={classes.topNav} data-tinted={tint}>
        <PanelNav back={back} point={point} />
      </div>
      <div className={classes.topHeading} data-tinted={tint}>
        {children}
      </div>
    </>
  );
}

/**
 * The top row of a panel view: the way back, and a button to find the selection on the map when it has a
 * point. In the sheet it also closes the view and drags the sheet.
 */
export function PanelNav({ back, point }: { back: PanelBack; point: LngLatPoint | null }) {
  const t = useTranslations("mapV2.panel");
  const sheet = useMapSheet();

  return (
    <Group
      justify="space-between"
      wrap="nowrap"
      className={sheet ? classes.dragHandle : undefined}
      {...sheet?.dragHandle}
    >
      <BackLink {...back} />
      <Group gap={8} wrap="nowrap">
        {point && <ShowOnMapButton point={point} />}
        {sheet && (
          <UnstyledButton
            className={classes.iconButton}
            c="var(--color-text-primary)"
            onClick={sheet.close}
            aria-label={t("close")}
            title={t("close")}
          >
            <IconX size={20} aria-hidden />
          </UnstyledButton>
        )}
      </Group>
    </Group>
  );
}
