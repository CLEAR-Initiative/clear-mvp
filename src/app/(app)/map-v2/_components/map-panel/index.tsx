"use client";

import { UnstyledButton } from "@mantine/core";
import { IconChevronsLeft, IconChevronsRight } from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef } from "react";
import classes from "./map-panel.module.css";

const MAP_PANEL_ID = "map-panel";

type MapPanelProps = {
  collapsed: boolean;
  onToggle: () => void;
  /** Identifies what the panel shows; a new value scrolls the panel back to the top. */
  contentKey?: string;
  children?: React.ReactNode;
};

export function MapPanel({ collapsed, onToggle, contentKey, children }: MapPanelProps) {
  const panelRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (panelRef.current) panelRef.current.scrollTop = 0;
  }, [contentKey]);
  const t = useTranslations("mapV2.panel");
  const toggleLabel = collapsed ? t("expand") : t("collapse");
  const ToggleIcon = collapsed ? IconChevronsRight : IconChevronsLeft;

  return (
    <>
      <aside
        ref={panelRef}
        id={MAP_PANEL_ID}
        className={classes.panel}
        data-collapsed={collapsed ? "true" : undefined}
        aria-label={t("label")}
        inert={collapsed}
      >
        {children}
      </aside>
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
