"use client";

import { useState, type Dispatch, type SetStateAction } from "react";
import { useTranslations } from "next-intl";
import { Box, Button, Group, Popover, Text, Badge, ActionIcon, Divider } from "@mantine/core";
import { IconFilter } from "@tabler/icons-react";
import { DisasterTypePicker, type HierarchyLevel1 } from "~/components/disaster-type-picker";

const ALL_SEVERITIES = ["critical", "high", "medium", "low"] as const;

export interface DetectionFilterPopoverProps {
  /** Severities shown; all four means no severity filter. */
  severities: Set<string>;
  onSeveritiesChange: Dispatch<SetStateAction<Set<string>>>;
  /** Disaster-type selections (`<l1>` or `<l1>::<l2>` keys). */
  typeFilters: string[];
  onTypeFiltersChange: (types: string[]) => void;
  hierarchy: HierarchyLevel1[];
  /** Source names to offer. The section is hidden while empty. */
  sourceOptions: string[];
  /** Selected sources; null = all sources. */
  sources: Set<string> | null;
  onSourcesChange: Dispatch<SetStateAction<Set<string> | null>>;
}

/**
 * The Detection filter button and its popover: severity, disaster type and
 * source. Pairs with `useDetectionFilters`, which holds the state.
 */
export function DetectionFilterPopover({
  severities,
  onSeveritiesChange,
  typeFilters,
  onTypeFiltersChange,
  hierarchy,
  sourceOptions,
  sources,
  onSourcesChange,
}: DetectionFilterPopoverProps) {
  const t = useTranslations("detection");
  const [filterOpen, setFilterOpen] = useState(false);
  const isFiltered = severities.size < 4 || typeFilters.length > 0 || sources !== null;
  const filterCount = (severities.size < 4 ? 1 : 0) + (typeFilters.length > 0 ? 1 : 0) + (sources !== null ? 1 : 0);

  return (
    <Box>
      <Text size="xs" c="#737373" tt="uppercase" style={{ fontSize: 10, letterSpacing: "0.05em", marginBottom: 5 }}>{t("filters.filter")}</Text>
      <Popover opened={filterOpen} onChange={setFilterOpen} position="bottom-start" shadow="md" width={270} withinPortal>
        <Popover.Target>
          <ActionIcon
            variant="default" size={30}
            style={{ position: "relative", border: "1px solid #E5E5E5", borderRadius: 4 }}
            styles={{ root: { overflow: "visible" } }}
            onClick={() => setFilterOpen((o) => !o)}
            title={t("filters.filter")}
            aria-label={t("filters.filter")}
          >
            <IconFilter size={13} color={isFiltered ? "var(--color-accent)" : "var(--color-text-muted)"} />
            {isFiltered && (
              <Box style={{ position: "absolute", top: -4, insetInlineEnd: -4, width: 14, height: 14, borderRadius: "50%", background: "var(--color-accent)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2 }}>
                <Text style={{ fontSize: 9, color: "white", fontWeight: 700, lineHeight: 1 }}>{filterCount}</Text>
              </Box>
            )}
          </ActionIcon>
        </Popover.Target>
        <Popover.Dropdown p={14} onMouseDown={(e) => e.stopPropagation()}>
          <Group justify="space-between" mb={10}>
            <Text size="xs" fw={700} tt="uppercase" style={{ fontSize: 10, letterSpacing: "0.06em" }}>{t("filters.title")}</Text>
            {isFiltered && (
              <Button size="compact-xs" variant="subtle" color="gray" onClick={() => { onSeveritiesChange(new Set(ALL_SEVERITIES)); onTypeFiltersChange([]); onSourcesChange(null); }}>
                {t("filters.clearAll")}
              </Button>
            )}
          </Group>
          <Text size="xs" fw={700} c="var(--color-text-primary)" mb={8}>{t("filters.severity")}</Text>
          <Group gap={6} mb={12} wrap="wrap">
            {ALL_SEVERITIES.map((sev) => {
              const active = severities.has(sev);
              return (
                <Badge
                  key={sev} size="sm"
                  variant={active ? "filled" : "light"}
                  color={sev === "critical" ? "red" : sev === "high" ? "orange" : sev === "medium" ? "yellow" : "green"}
                  style={{ cursor: "pointer", textTransform: "capitalize" }}
                  onClick={() => onSeveritiesChange((prev) => {
                    const next = new Set(prev);
                    if (next.has(sev)) next.delete(sev);
                    else next.add(sev);
                    return next;
                  })}
                >
                  {t(`filters.severities.${sev}`)}
                </Badge>
              );
            })}
          </Group>
          <Divider color="var(--color-border)" mb={10} />
          <Text size="xs" fw={700} c="var(--color-text-primary)" mb={8}>{t("filters.eventType")}</Text>
          <DisasterTypePicker hierarchy={hierarchy} selected={typeFilters} onChange={onTypeFiltersChange} size="xs" />
          {sourceOptions.length > 0 && (
            <>
              <Divider color="var(--color-border)" my={10} />
              <Text size="xs" fw={700} c="var(--color-text-primary)" mb={8}>{t("filters.source")}</Text>
              <Group gap={6} wrap="wrap">
                {sourceOptions.map((src) => {
                  const active = sources === null || sources.has(src);
                  return (
                    <Badge
                      key={src} size="sm"
                      variant={active ? "filled" : "light"}
                      color={active ? "dark" : "gray"}
                      style={{ cursor: "pointer", textTransform: "none" }}
                      onClick={() => onSourcesChange((prev) => {
                        const base = prev ?? new Set(sourceOptions);
                        const next = new Set(base);
                        if (next.has(src)) next.delete(src);
                        else next.add(src);
                        return next.size === sourceOptions.length ? null : next;
                      })}
                    >
                      {src}
                    </Badge>
                  );
                })}
              </Group>
            </>
          )}
        </Popover.Dropdown>
      </Popover>
    </Box>
  );
}
