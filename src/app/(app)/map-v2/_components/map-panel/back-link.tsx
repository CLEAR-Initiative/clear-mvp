"use client";

import { Group, Text, UnstyledButton } from "@mantine/core";
import { IconArrowLeft } from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import classes from "./panel-views.module.css";

export type PanelBack = { to: "layers" | "signals"; onBack: () => void };

export function BackLink({ to, onBack }: PanelBack) {
  const t = useTranslations("mapV2.panel.back");

  return (
    <UnstyledButton className={classes.back} onClick={onBack}>
      <Group gap={4} wrap="nowrap" c="var(--map-accent)">
        <IconArrowLeft size={16} aria-hidden />
        <Text component="span" fz={12} fw={700} lh={1.5} lts={0.03} className={classes.backLabel}>
          {t(to)}
        </Text>
      </Group>
    </UnstyledButton>
  );
}
