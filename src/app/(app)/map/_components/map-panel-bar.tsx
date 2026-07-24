"use client";

import { useCallback, useState, type ElementType, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import {
  Box, Text, Stack, Group, Checkbox, Divider, Select, SegmentedControl, Loader,
} from "@mantine/core";
import { useClickOutside } from "@mantine/hooks";
import { IconFilter, IconLayersLinked, IconList } from "@tabler/icons-react";
import type { DataView } from "./map-layers-panel";
import type { BoundaryLevel } from "./map-settings-popover";
import type { BaseMapType } from "~/components/map/crisis-map";
export type { HierarchyLevel1 } from "~/components/disaster-type-picker";

type PanelId = "layers" | "legend" | "filters";

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

// labelKey: i18n keys under map.panels.* - resolved via t() at render time.
const BASE_MAP_OPTIONS: { labelKey: BaseMapType; value: BaseMapType }[] = [
  { labelKey: "simple",     value: "simple" },
  { labelKey: "topography", value: "topography" },
  { labelKey: "satellite",  value: "satellite" },
];

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
  showRoads?: boolean;
  onShowRoadsChange?: (v: boolean) => void;
  baseMapType?: BaseMapType;
  onBaseMapTypeChange?: (v: BaseMapType) => void;
  /** Desktop: accumulate marker detail panels instead of replacing. */
  keepPanelsOpen?: boolean;
  onKeepPanelsOpenChange?: (v: boolean) => void;
  /**
   * Mobile-only filter controls (country / region / type / timeframe).
   * When provided, a Filters icon appears below Legend on small screens.
   */
  filters?: ReactNode;
}

const noop = () => {
  /* callers that omit layer-toggle handlers get a no-op */
};

function IconBtn({
  icon: Icon, active, title, onClick, testId, tourId,
}: {
  icon: ElementType; active: boolean; title: string; onClick: () => void; testId?: string; tourId?: string;
}) {
  return (
    <button
      title={title}
      data-testid={testId}
      data-tour={tourId}
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
      style={{ fontSize: 10, letterSpacing: "0.05em", flexShrink: 0 }}
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

/** Shared horizontal metrics so live toggles and stubs share one left edge. */
const LAYER_ROW_CLASS = "-mx-1 px-1";

/** Standard checkbox row for live layer toggles. */
function LayerCheckRow({
  label,
  checked,
  onChange,
  trailing,
}: {
  label: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  trailing?: ReactNode;
}) {
  return (
    <Group
      gap={8} py={4} wrap="nowrap" align="center"
      className={`cursor-pointer hover:bg-[var(--color-bg-muted)] ${LAYER_ROW_CLASS}`}
      onClick={() => onChange(!checked)}
      style={{ userSelect: "none" }}
    >
      <Checkbox
        size="xs" checked={checked}
        onChange={(e) => onChange(e.currentTarget.checked)}
        styles={{ input: { cursor: "pointer" }, root: { width: 18, flexShrink: 0 } }}
        onClick={(e) => e.stopPropagation()}
      />
      <Text size="xs" c="var(--color-text-secondary)" style={{ fontSize: 12, flex: 1 }}>
        {label}
      </Text>
      {trailing}
    </Group>
  );
}

/** Disabled stub — same single-line geometry as LayerCheckRow (peer, not nested). */
function LayerStubRow({ label, hint }: { label: string; hint: string }) {
  return (
    <Group
      gap={8} py={4} wrap="nowrap" align="center"
      className={LAYER_ROW_CLASS}
      style={{ userSelect: "none", opacity: 0.55 }}
      title={hint}
    >
      <Checkbox
        size="xs" checked={false} disabled readOnly
        styles={{ input: { cursor: "not-allowed" }, root: { width: 18, flexShrink: 0 } }}
      />
      <Text size="xs" c="var(--color-text-secondary)" style={{ fontSize: 12, flex: 1 }}>
        {label}
      </Text>
      <Text size="xs" c="var(--color-text-muted)" style={{ fontSize: 10, flexShrink: 0 }}>
        {hint}
      </Text>
    </Group>
  );
}


export function MapPanelBar({
  dataView, onDataViewChange,
  showPopulation, onShowPopulationChange,
  populationLoading = false,
  boundaryLevel, onBoundaryLevelChange,
  showRoads = true, onShowRoadsChange = noop,
  baseMapType = "simple", onBaseMapTypeChange = noop,
  keepPanelsOpen = false, onKeepPanelsOpenChange = noop,
  filters,
}: MapPanelBarProps) {
  const t = useTranslations("map");
  const [active, setActive] = useState<PanelId | null>(null);
  const toggle = (id: PanelId) => setActive((prev) => (prev === id ? null : id));
  // Dismiss layers / legend / filters when tapping the map — but ignore
  // Mantine Select/Popover portals (they render outside this panel; closing
  // on those taps prevented country/region picks on mobile).
  const dismissIfOutside = useCallback((event: Event) => {
    const target = event.target;
    if (
      target instanceof Element &&
      target.closest(
        [
          ".mantine-Select-dropdown",
          ".mantine-Combobox-dropdown",
          ".mantine-Popover-dropdown",
          ".mantine-Menu-dropdown",
          "[data-combobox-dropdown]",
        ].join(", "),
      )
    ) {
      return;
    }
    setActive(null);
  }, []);
  const panelRef = useClickOutside<HTMLDivElement>(dismissIfOutside);

  return (
    // Mobile: clear the status/safe area + floating burger. Desktop: below the filter bar.
    <Box ref={panelRef} className="absolute z-20 top-14 left-4 sm:top-20">
      <Group gap={4} align="flex-start" wrap="nowrap">

        {/* Icon column — Filters is mobile-only (third button under Legend) */}
        <Stack gap={4}>
          <IconBtn icon={IconLayersLinked} active={active === "layers"} title={t("panels.layers")} onClick={() => toggle("layers")} testId="map-layers-toggle" tourId="map-layers" />
          <IconBtn icon={IconList}         active={active === "legend"} title={t("panels.legend")} onClick={() => toggle("legend")} />
          {filters != null && (
            <Box hiddenFrom="sm">
              <IconBtn
                icon={IconFilter}
                active={active === "filters"}
                title={t("panels.filters")}
                onClick={() => toggle("filters")}
                tourId="map-filters"
              />
            </Box>
          )}
        </Stack>

        {/* Panel content — capped height + internal scroll on mobile */}
        {active && (
          <Box
            className="flex flex-col max-h-[min(52vh,calc(100dvh-160px))] sm:max-h-[min(72vh,calc(100vh-120px))]"
            style={{
              width: 260,
              maxWidth: "calc(100vw - 72px)",
              background: "var(--color-bg-muted)",
              border: "1px solid var(--color-border-dark)",
              boxShadow: "var(--shadow-md)",
            }}
          >
            {/* Layers — cartography first, then overlays / data, then interaction */}
            {active === "layers" && (
              <>
                <PanelHeader>{t("panels.layers")}</PanelHeader>
                <Box style={{ overflowY: "auto", flex: 1, minHeight: 0, WebkitOverflowScrolling: "touch" }}>
                <Stack gap={0} px={12} py={10}>
                  <SectionLabel>{t("panels.baseMap")}</SectionLabel>
                  <SegmentedControl
                    value={baseMapType}
                    onChange={(v) => onBaseMapTypeChange(v as BaseMapType)}
                    data={BASE_MAP_OPTIONS.map((o) => ({ value: o.value, label: t(`panels.${o.labelKey}`) }))}
                    size="xs"
                    fullWidth
                    styles={{ label: { fontSize: 11, padding: "3px 6px" } }}
                    mb={10}
                  />

                  <SectionLabel>{t("panels.overlays")}</SectionLabel>
                  <LayerCheckRow
                    label={t("panels.roads")}
                    checked={showRoads}
                    onChange={onShowRoadsChange}
                  />

                  <Divider color="var(--color-bg-muted)" my={10} />

                  {/* "None" on the level select turns boundaries off — no separate Visible toggle */}
                  <SectionLabel>{t("panels.boundaries")}</SectionLabel>
                  <Select
                    size="xs"
                    value={boundaryLevel}
                    onChange={(v) => onBoundaryLevelChange((v ?? "A1") as BoundaryLevel)}
                    data={BOUNDARY_OPTIONS.map((o) => ({ value: o.value, label: t(`boundaries.${o.labelKey}`) }))}
                    styles={{ input: { fontWeight: 600, fontSize: 12 } }}
                  />

                  <Divider color="var(--color-bg-muted)" my={10} />

                  {/* "None" data view hides markers — no separate Visible toggle */}
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

                  <Divider color="var(--color-bg-muted)" my={10} />

                  <SectionLabel>{t("panels.population")}</SectionLabel>
                  <LayerCheckRow
                    label={t("panels.population")}
                    checked={showPopulation}
                    onChange={onShowPopulationChange}
                    trailing={populationLoading ? <Loader size={12} /> : undefined}
                  />
                  <LayerStubRow label={t("panels.idpDensity")} hint={t("panels.comingSoon")} />

                  <Divider color="var(--color-bg-muted)" my={10} />

                  {/* Future operational aggregations — stubs only */}
                  <SectionLabel>{t("panels.operational")}</SectionLabel>
                  <LayerStubRow label={t("panels.blockages")} hint={t("panels.comingSoon")} />
                  <LayerStubRow label={t("panels.nrcLocations")} hint={t("panels.comingSoon")} />

                  {/* Interaction preference — not cartography (desktop only) */}
                  <Box visibleFrom="sm">
                    <Divider color="var(--color-bg-muted)" my={10} />
                    <SectionLabel>{t("panels.panelsSection")}</SectionLabel>
                    <LayerCheckRow
                      label={t("panels.keepPanelsOpen")}
                      checked={keepPanelsOpen}
                      onChange={onKeepPanelsOpenChange}
                    />
                  </Box>
                </Stack>
                </Box>
              </>
            )}

            {/* Legend */}
            {active === "legend" && (
              <>
                <PanelHeader>{t("panels.legend")}</PanelHeader>
                <Box style={{ overflowY: "auto", flex: 1, minHeight: 0, WebkitOverflowScrolling: "touch" }}>
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
                </Box>
              </>
            )}

            {/* Filters — mobile only; desktop keeps the top bar */}
            {active === "filters" && filters != null && (
              <>
                <PanelHeader>{t("panels.filters")}</PanelHeader>
                <Box style={{ overflowY: "auto", flex: 1, minHeight: 0, WebkitOverflowScrolling: "touch" }}>
                <Stack gap={10} px={12} py={10}>
                  {filters}
                </Stack>
                </Box>
              </>
            )}

          </Box>
        )}
      </Group>
    </Box>
  );
}
