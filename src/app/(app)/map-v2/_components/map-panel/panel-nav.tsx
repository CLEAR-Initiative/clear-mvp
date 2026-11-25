"use client";

import { Group, Text, UnstyledButton } from "@mantine/core";
import { IconFocus2 } from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import { useMapView } from "~/containers/map/hooks/use-map-view";
import type { LngLatPoint } from "~/containers/map/selection";
import { BackLink, type PanelBack } from "./back-link";
import classes from "./panel-views.module.css";

/** Centres the map on `point` at the current zoom, through the map view in the URL. */
function ShowOnMapButton({ point }: { point: LngLatPoint }) {
  const t = useTranslations("mapV2.panel");
  const { zoom, setView } = useMapView();

  return (
    <UnstyledButton className={classes.back} onClick={() => setView({ center: point, zoom })}>
      <Group gap={4} wrap="nowrap" c="var(--map-accent)">
        <IconFocus2 size={16} aria-hidden />
        <Text component="span" fz={12} fw={700} lh={1.5} lts={0.03} className={classes.backLabel}>
          {t("showOnMap")}
        </Text>
      </Group>
    </UnstyledButton>
  );
}

/** The top row of a panel view: the way back, and a button to find the selection on the map when it has a point. */
export function PanelNav({ back, point }: { back: PanelBack; point: LngLatPoint | null }) {
  return (
    <Group justify="space-between" wrap="nowrap">
      <BackLink {...back} />
      {point && <ShowOnMapButton point={point} />}
    </Group>
  );
}
