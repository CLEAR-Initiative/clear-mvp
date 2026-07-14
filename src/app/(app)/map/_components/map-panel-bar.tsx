"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  Box, Text, Stack, Group, Checkbox, Divider, Select, SegmentedControl, Loader,
} from "@mantine/core";
import { IconLayersLinked, IconList } from "@tabler/icons-react";
import type { DataView } from "./map-layers-panel";
import type { BoundaryLevel } from "./map-settings-popover";
export type { HierarchyLevel1 } from "~/components/disaster-type-picker";

type PanelId = "layers" | "legend";

// labelKey: i18n keys under map.severities.* - resolved via t() at render time.
const SEVERITY_ITEMS = [
  { labelKey: "critical", color: "var(--color-critical)" },
  { labelKey: "high",     color: "var(--color-warning)" },
  { labelKey: "medium",   color: "#FBBF24" },
  { labelKey: "low",      color: "var(--color-success)" },
] as const;

// labelKey: i18n keys under map.boundaries.* - resolved via t() at render time.
const BOUNDARY_OPTIONS = [
  { value: "none", labelKey: "none" },
  { value: "A0",   labelKey: "a0" },
  { value: "A1",   labelKey: "a1" },
  { value: "A2",   labelKey: "a2" },
] as const;

// labelKey: i18n keys under map.dataViews.* - resolved via t() at render time.
const DATA_VIEW_OPTIONS: { labelKey: DataView; value: DataView }[] = [
  { labelKey: "none",   value: "none" },
  { labelKey: "crisis", value: "crisis" },
  { labelKey: "alert",  value: "alert" },
  { labelKey: "event",  value: "event" },
  { labelKey: "signal", value: "signal" },
];

interface MapPanelBarProps {
  dataView: DataView;
  onDataViewChange: (v: DataView) => void;
  showPopulation: boolean;
  onShowPopulationChange: (v: boolean) => void;
  populationLoading?: boolean;
  boundaryLevel: BoundaryLevel;
  onBoundaryLevelChange: (v: BoundaryLevel) => void;
  showBoundaries?: boolean;
  onShowBoundariesChange?: (v: boolean) => void;
  showMarkers?: boolean;
  onShowMarkersChange?: (v: boolean) => void;
  showRoads?: boolean;
  onShowRoadsChange?: (v: boolean) => void;
  showSatellite?: boolean;
  onShowSatelliteChange?: (v: boolean) => void;
}

const noop = () => {
  /* callers that omit layer-toggle handlers get a no-op */
};

function IconBtn({
  icon: Icon, active, title, onClick,
}: {
  icon: React.ElementType; active: boolean; title: string; onClick: () => void;
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        width: 30, height: 30,
        border: "1px solid var(--color-border-dark)", borderRadius: 4,
        background: active ? "var(--color-info-light)" : "var(--color-bg-muted)",
        color: active ? "var(--color-info)" : "var(--color-text-secondary)",
        cursor: "pointer", padding: 0,
        boxShadow: "var(--shadow-sm)", flexShrink: 0,
      }}
    >
      <Icon size={15} />
    </button>
  );
}

function PanelHeader({ children }: { children: string }) {
  return (
    <Text
      fw={700} tt="uppercase" c="var(--color-text-muted)"
      style={{ fontSize: 10, letterSpacing: "0.05em" }}
      px={12} pt={10} pb={8}
      className="border-b border-[var(--color-border)]"
    >
      {children}
    </Text>
  );
}

function SectionLabel({ children }: { children: string }) {
  return (
    <Text fw={700} tt="uppercase" c="var(--color-text-muted)" style={{ fontSize: 9, letterSpacing: "0.06em", opacity: 0.7 }} mb={6}>
      {children}
    </Text>
  );
}


export function MapPanelBar({
  dataView, onDataViewChange,
  showPopulation, onShowPopulationChange,
  populationLoading = false,
  boundaryLevel, onBoundaryLevelChange,
  showBoundaries = true, onShowBoundariesChange = noop,
  showMarkers = true, onShowMarkersChange = noop,
  showRoads = true, onShowRoadsChange = noop,
  showSatellite = false, onShowSatelliteChange = noop,
}: MapPanelBarProps) {
  const t = useTranslations("map");
  const [active, setActive] = useState<PanelId | null>(null);
  const toggle = (id: PanelId) => setActive((prev) => (prev === id ? null : id));

  return (
    <Box className="absolute z-10" style={{ top: 80, left: 16 }} /* intentionally physical: map overlay */>
      <Group gap={4} align="flex-start" wrap="nowrap">

        {/* Icon column */}
        <Stack gap={4}>
          <IconBtn icon={IconLayersLinked} active={active === "layers"} title={t("panels.layers")} onClick={() => toggle("layers")} />
          <IconBtn icon={IconList}         active={active === "legend"} title={t("panels.legend")} onClick={() => toggle("legend")} />
        </Stack>

        {/* Panel content */}
        {active && (
          <Box
            style={{
              width: 240,
              background: "var(--color-bg-muted)",
              border: "1px solid var(--color-border-dark)",
              boxShadow: "var(--shadow-md)",
            }}
          >
            {/* Layers */}
            {active === "layers" && (
              <>
                <PanelHeader>{t("panels.layers")}</PanelHeader>
                <Stack gap={0} px={12} py={10}>
                  <SectionLabel>{t("panels.boundaries")}</SectionLabel>
                  <Select
                    size="xs"
                    value={boundaryLevel}
                    onChange={(v) => onBoundaryLevelChange((v ?? "A1") as BoundaryLevel)}
                    data={BOUNDARY_OPTIONS.map((o) => ({ value: o.value, label: t(`boundaries.${o.labelKey}`) }))}
                    mb={10}
                    styles={{ input: { fontWeight: 600, fontSize: 12 } }}
                  />
                  
                  <Group
                    gap={8} py={4} px={2}
                    className="cursor-pointer hover:bg-[var(--color-bg-muted)] -mx-1"
                    onClick={() => onShowBoundariesChange(!showBoundaries)}
                    style={{ userSelect: "none" }}
                  >
                    <Checkbox
                      size="xs" checked={showBoundaries}
                      onChange={(e) => onShowBoundariesChange(e.currentTarget.checked)}
                      styles={{ input: { cursor: "pointer" } }}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <Text size="xs" c="var(--color-text-secondary)" style={{ fontSize: 12 }}>
                      {t("panels.boundaries")}
                    </Text>
                  </Group>
                  
                  <Divider color="var(--color-bg-muted)" my={10} />
                  
                  <SectionLabel>{t("panels.markers")}</SectionLabel>
                  <SegmentedControl
                    value={dataView}
                    onChange={(v) => onDataViewChange(v as DataView)}
                    data={DATA_VIEW_OPTIONS.map((o) => ({ value: o.value, label: t(`dataViews.${o.labelKey}`) }))}
                    size="xs"
                    fullWidth
                    styles={{ label: { fontSize: 11, padding: "3px 6px" } }}
                    mb={6}
                  />
                  
                  <Group
                    gap={8} py={4} px={2}
                    className="cursor-pointer hover:bg-[var(--color-bg-muted)] -mx-1"
                    onClick={() => onShowMarkersChange(!showMarkers)}
                    style={{ userSelect: "none" }}
                  >
                    <Checkbox
                      size="xs" checked={showMarkers}
                      onChange={(e) => onShowMarkersChange(e.currentTarget.checked)}
                      styles={{ input: { cursor: "pointer" } }}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <Text size="xs" c="var(--color-text-secondary)" style={{ fontSize: 12 }}>
                      {t("panels.markers")}
                    </Text>
                  </Group>
                  
                  <Divider color="var(--color-bg-muted)" my={10} />
                  
                  <Group
                    gap={8} py={4} px={2}
                    className="cursor-pointer hover:bg-[var(--color-bg-muted)] -mx-1"
                    onClick={() => onShowPopulationChange(!showPopulation)}
                    style={{ userSelect: "none" }}
                  >
                    <Checkbox
                      size="xs" checked={showPopulation}
                      onChange={(e) => onShowPopulationChange(e.currentTarget.checked)}
                      styles={{ input: { cursor: "pointer" } }}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <Text size="xs" c="var(--color-text-secondary)" style={{ fontSize: 12 }}>{t("panels.population")}</Text>
                    {populationLoading && <Loader size={12} />}
                  </Group>
                  
                  <Divider color="var(--color-bg-muted)" my={10} />
                  
                  <SectionLabel>{t("panels.baseMap")}</SectionLabel>
                  
                  <Group
                    gap={8} py={4} px={2}
                    className="cursor-pointer hover:bg-[var(--color-bg-muted)] -mx-1"
                    onClick={() => onShowRoadsChange(!showRoads)}
                    style={{ userSelect: "none" }}
                  >
                    <Checkbox
                      size="xs" checked={showRoads}
                      onChange={(e) => onShowRoadsChange(e.currentTarget.checked)}
                      styles={{ input: { cursor: "pointer" } }}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <Text size="xs" c="var(--color-text-secondary)" style={{ fontSize: 12 }}>
                      {t("panels.roads")}
                    </Text>
                  </Group>
                  
                  <Group
                    gap={8} py={4} px={2}
                    className="cursor-pointer hover:bg-[var(--color-bg-muted)] -mx-1"
                    onClick={() => onShowSatelliteChange(!showSatellite)}
                    style={{ userSelect: "none" }}
                  >
                    <Checkbox
                      size="xs" checked={showSatellite}
                      onChange={(e) => onShowSatelliteChange(e.currentTarget.checked)}
                      styles={{ input: { cursor: "pointer" } }}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <Text size="xs" c="var(--color-text-secondary)" style={{ fontSize: 12 }}>
                      {t("panels.satellite")}
                    </Text>
                  </Group>
                </Stack>
              </>
            )}

            {/* Legend */}
            {active === "legend" && (
              <>
                <PanelHeader>{t("panels.legend")}</PanelHeader>
                <Stack gap={4} px={12} py={8}>
                  <SectionLabel>{t("panels.severity")}</SectionLabel>
                  {SEVERITY_ITEMS.map((item) => (
                    <Group key={item.labelKey} gap={8}>
                      <Box w={10} h={10} style={{ borderRadius: "50%", backgroundColor: item.color, flexShrink: 0 }} />
                      <Text size="xs" style={{ fontSize: 11 }}>{t(`severities.${item.labelKey}`)}</Text>
                    </Group>
                  ))}

                  {showPopulation && (
                    <>
                      <Divider color="var(--color-bg-muted)" my={4} />
                      <SectionLabel>{t("panels.population")}</SectionLabel>
                      <Box
                        style={{
                          height: 10, borderRadius: 3,
                          background: "linear-gradient(to right, #EFF7FF, #BDD7EE, #6AAED6, #2F8ABE, #0C5FA0, #08306B)",
                        }}
                        mb={4}
                      />
                      <Box style={{ position: "relative", height: 14 }}>
                        {[
                          { label: "0",    pct: 0 },
                          { label: "10k",  pct: 20 },
                          { label: "100k", pct: 40 },
                          { label: "300k", pct: 60 },
                          { label: "600k", pct: 80 },
                          { label: "1.2M", pct: 100 },
                        ].map(({ label, pct }) => (
                          <Text
                            key={label}
                            size="xs"
                            c="var(--color-text-muted)"
                            style={{
                              fontSize: 8,
                              position: "absolute",
                              left: `${pct}%`,
                              transform: pct === 0 ? "none" : pct === 100 ? "translateX(-100%)" : "translateX(-50%)",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {label}
                          </Text>
                        ))}
                      </Box>
                    </>
                  )}

                </Stack>
              </>
            )}

          </Box>
        )}
      </Group>
    </Box>
  );
}
