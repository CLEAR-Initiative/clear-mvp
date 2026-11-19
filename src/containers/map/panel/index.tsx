"use client";

import { useTranslations } from "next-intl";
import classes from "./panel.module.css";

export const MAP_PANEL_ID = "map-panel";

export function MapPanel({ collapsed }: { collapsed: boolean }) {
  const t = useTranslations("mapV2.panel");

  return (
    <aside
      id={MAP_PANEL_ID}
      className={classes.panel}
      data-collapsed={collapsed ? "true" : undefined}
      aria-label={t("label")}
      inert={collapsed}
    />
  );
}
