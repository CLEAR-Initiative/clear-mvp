"use client";

import { UnstyledButton } from "@mantine/core";
import { IconChevronsLeft, IconChevronsRight } from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import { MAP_PANEL_ID } from "../panel";

export function PanelToggle({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  const t = useTranslations("mapV2.panel");
  const label = collapsed ? t("expand") : t("collapse");
  const Icon = collapsed ? IconChevronsRight : IconChevronsLeft;

  return (
    <UnstyledButton
      visibleFrom="sm"
      onClick={onToggle}
      aria-controls={MAP_PANEL_ID}
      aria-expanded={!collapsed}
      aria-label={label}
      title={label}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: 32,
        height: 32,
        borderRadius: 2,
        background: "var(--color-bg-white)",
        boxShadow: "var(--shadow-xs)",
      }}
    >
      <Icon size={16} color="var(--color-text-primary)" />
    </UnstyledButton>
  );
}
