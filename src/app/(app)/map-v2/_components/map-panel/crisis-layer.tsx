"use client";

import { useId, useRef, useState } from "react";
import { Select, Switch, UnstyledButton, VisuallyHidden } from "@mantine/core";
import { IconBulb, IconChevronDown, IconChevronsDown, IconX } from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import { useDetectionLevel } from "~/containers/map/hooks/use-detection-level";
import { DETECTION_LAYER_IDS } from "~/containers/map/layers/detection-layers";
import { isDetectionKind, type DetectionKind } from "~/containers/map/selection";
import classes from "./crisis-layer.module.css";

const LEVEL_ORDER: DetectionKind[] = ["alert", "event", "signal"];

export function CrisisLayer({ onLevelChange }: { onLevelChange: () => void }) {
  const t = useTranslations("mapV2");
  const { level, setLevel } = useDetectionLevel();
  const lastLevel = useRef<DetectionKind>(level ?? "alert");
  const inputRef = useRef<HTMLInputElement>(null);
  if (level) lastLevel.current = level;
  const [open, setOpen] = useState(true);
  const bodyId = useId();
  const activeCount = level ? 1 : 0;

  const changeLevel = (kind: DetectionKind | null) => {
    setLevel(kind);
    onLevelChange();
  };

  return (
    <section className={classes.root} aria-labelledby={`${bodyId}-title`}>
      <div className={classes.header}>
        <h2 id={`${bodyId}-title`} className={classes.title}>
          {t("panel.crisisLayer.title")}
        </h2>
        {activeCount > 0 && (
          <span className={classes.badge}>
            <span aria-hidden>{activeCount}</span>
            <VisuallyHidden>{t("panel.crisisLayer.activeCount", { count: activeCount })}</VisuallyHidden>
          </span>
        )}
        <UnstyledButton
          className={classes.chevron}
          data-open={open || undefined}
          aria-expanded={open}
          aria-controls={bodyId}
          aria-label={open ? t("panel.crisisLayer.collapse") : t("panel.crisisLayer.expand")}
          onClick={() => setOpen((value) => !value)}
        >
          <IconChevronsDown size={20} />
        </UnstyledButton>
      </div>
      <div id={bodyId} hidden={!open} className={classes.body}>
        <div className={classes.row}>
          <span className={classes.rowLabel}>{t("panel.crisisLayer.disasters")}</span>
          <Switch
            size="xs"
            checked={level !== null}
            onChange={(event) => changeLevel(event.currentTarget.checked ? lastLevel.current : null)}
            aria-label={t("panel.crisisLayer.showDisasters")}
            classNames={{ track: classes.switchTrack }}
          />
        </div>
        <Select
          ref={inputRef}
          value={level}
          onChange={(value) => changeLevel(isDetectionKind(value) ? value : null)}
          data={LEVEL_ORDER.map((kind) => ({ value: kind, label: t(`layers.${DETECTION_LAYER_IDS[kind]}.title`) }))}
          placeholder={t("panel.crisisLayer.placeholder")}
          aria-label={t("panel.crisisLayer.placeholder")}
          allowDeselect={false}
          withCheckIcon
          leftSection={<IconBulb size={20} stroke={1.5} />}
          rightSection={
            level ? (
              <UnstyledButton
                className={classes.clear}
                aria-label={t("panel.crisisLayer.clear")}
                onClick={() => {
                  changeLevel(null);
                  inputRef.current?.focus();
                }}
              >
                <IconX size={16} />
              </UnstyledButton>
            ) : (
              <IconChevronDown size={16} />
            )
          }
          rightSectionPointerEvents={level ? "all" : "none"}
          comboboxProps={{ offset: 4 }}
          classNames={{
            root: level ? classes.selected : undefined,
            input: classes.selectInput,
            section: classes.selectSection,
            dropdown: classes.dropdown,
            option: classes.option,
          }}
        />
      </div>
    </section>
  );
}
