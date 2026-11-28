"use client";

import { useId, useRef, useState } from "react";
import { Select, Switch, UnstyledButton, VisuallyHidden } from "@mantine/core";
import { IconBulb, IconChevronDown, IconChevronsDown, IconX } from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import { sentenceCase } from "~/containers/map/filters/model";
import { useDetectionLevel } from "~/containers/map/hooks/use-detection-level";
import { useMapFilters } from "~/containers/map/hooks/use-map-filters";
import { DETECTION_LAYER_IDS } from "~/containers/map/layers/detection-layers";
import { isDetectionKind, type DetectionKind } from "~/containers/map/selection";
import classes from "./crisis-layer.module.css";
import { FilterSelect, type FilterGroup } from "./filter-select";

const LEVEL_ORDER: DetectionKind[] = ["alert", "event", "signal"];

export function CrisisLayer({
  onLevelChange,
  onFilterChange,
}: {
  onLevelChange: () => void;
  onFilterChange: () => void;
}) {
  const t = useTranslations("mapV2");
  const { level, setLevel } = useDetectionLevel();
  const lastLevel = useRef<DetectionKind>(level ?? "alert");
  const inputRef = useRef<HTMLInputElement>(null);
  if (level) lastLevel.current = level;
  const [open, setOpen] = useState(true);
  const bodyId = useId();
  const activeCount = level ? 1 : 0;
  const { status, hierarchy, filters, setCategory, setCrisisType } = useMapFilters();
  const noteId = `${bodyId}-note`;
  const filtersOff = level === "signal";
  const filtersDisabled = (level !== "event" && level !== "alert") || status !== "ready";

  const categoryGroups: FilterGroup[] = [{ label: null, options: hierarchy.map((l1) => l1.name) }];
  const pickedCategory = hierarchy.find((l1) => l1.name === filters.category);
  const crisisTypeGroups: FilterGroup[] = pickedCategory
    ? [{ label: null, options: pickedCategory.groups.map((g) => g.name) }]
    : hierarchy.map((l1) => ({ label: sentenceCase(l1.name), options: l1.groups.map((g) => g.name) }));

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
        <FilterSelect
          placeholder={t("panel.crisisLayer.allCategories")}
          clearLabel={t("panel.crisisLayer.clearCategory")}
          emptyLabel={t("panel.crisisLayer.noOptions")}
          value={filters.category}
          groups={categoryGroups}
          onChange={(name) => {
            setCategory(name);
            onFilterChange();
          }}
          disabled={filtersDisabled}
          describedBy={filtersOff ? noteId : undefined}
        />
        <FilterSelect
          placeholder={t("panel.crisisLayer.allCrisisTypes")}
          clearLabel={t("panel.crisisLayer.clearCrisisType")}
          emptyLabel={t("panel.crisisLayer.noOptions")}
          value={filters.crisisType}
          groups={crisisTypeGroups}
          onChange={(name) => {
            setCrisisType(name);
            onFilterChange();
          }}
          disabled={filtersDisabled}
          describedBy={filtersOff ? noteId : undefined}
        />
        {filtersOff && (
          <p id={noteId} className={classes.note}>
            {t("panel.crisisLayer.signalsNote")}
          </p>
        )}
      </div>
    </section>
  );
}
