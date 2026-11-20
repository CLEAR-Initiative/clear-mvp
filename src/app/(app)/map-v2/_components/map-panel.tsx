"use client";

import { UnstyledButton } from "@mantine/core";
import { IconChevronsLeft, IconChevronsRight } from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import classes from "./map-panel.module.css";

const MAP_PANEL_ID = "map-panel";

export function MapPanel({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  const t = useTranslations("mapV2.panel");
  const toggleLabel = collapsed ? t("expand") : t("collapse");
  const ToggleIcon = collapsed ? IconChevronsRight : IconChevronsLeft;

  return (
    <>
      <aside
        id={MAP_PANEL_ID}
        className={classes.panel}
        data-collapsed={collapsed ? "true" : undefined}
        aria-label={t("label")}
        inert={collapsed}
      />
      <UnstyledButton
        className={classes.toggle}
        data-collapsed={collapsed ? "true" : undefined}
        onClick={onToggle}
        aria-controls={MAP_PANEL_ID}
        aria-expanded={!collapsed}
        aria-label={toggleLabel}
        title={toggleLabel}
      >
        <ToggleIcon size={16} />
      </UnstyledButton>
    </>
  );
}
