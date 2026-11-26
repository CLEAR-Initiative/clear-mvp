"use client";

import { Group, Text, UnstyledButton } from "@mantine/core";
import { IconArrowLeft } from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import type { DetectionKind } from "~/containers/map/selection";
import classes from "./panel-views.module.css";
import { useMapSheet } from "./sheet-context";

export type PanelBack = { to: "layers" | "signals" | "events" | "alerts"; onBack: () => void };

const LIST_OF: Record<DetectionKind, PanelBack["to"]> = { signal: "signals", event: "events", alert: "alerts" };

/** Where a detail opened from a stack's list goes back to: the list of that kind. */
export function backToList(kind: DetectionKind): PanelBack["to"] {
  return LIST_OF[kind];
}

export function BackLink({ to, onBack }: PanelBack) {
  const t = useTranslations("mapV2.panel.back");
  // In the sheet the arrow matches the icon buttons beside it.
  const iconSize = useMapSheet() ? 20 : 16;

  return (
    <UnstyledButton className={classes.back} onClick={onBack}>
      <Group gap={4} wrap="nowrap" c="var(--map-accent)">
        <IconArrowLeft size={iconSize} aria-hidden />
        <Text component="span" fz={12} fw={700} lh={1.5} lts={0.03} className={classes.backLabel}>
          {t(to)}
        </Text>
      </Group>
    </UnstyledButton>
  );
}
