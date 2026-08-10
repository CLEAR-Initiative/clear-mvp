"use client";

import { useState, type ElementType, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import {
  Box, Text, Stack, Group, Checkbox, Divider, Select, SegmentedControl, Loader,
} from "@mantine/core";
import { IconFilter, IconLayersLinked, IconList } from "@tabler/icons-react";
import type { DataView } from "./map-layers-panel";
import type { BoundaryLevel } from "./map-settings-popover";
import type { BaseMapType, SatelliteImagerySource } from "~/components/map/crisis-map";
import {
  SUDAN_NRC_OFFICE_COLORS,
  SUDAN_NRC_OFFICE_TYPE_ORDER,
} from "~/lib/data/sudan-nrc-offices";
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

/** TEMP A/B (#160) — remove with satellite-imagery-ab after evaluation. */
const SATELLITE_IMAGERY_OPTIONS: {
  labelKey: "imageryMapbox" | "imageryEsri";
  value: SatelliteImagerySource;
}[] = [
  { labelKey: "imageryMapbox", value: "mapbox" },
  { labelKey: "imageryEsri", value: "esri" },
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
  showNrcLocations?: boolean;
  onShowNrcLocationsChange?: (v: boolean) => void;
  /**
   * When set, Blockages is a live toggle (dev smoke / future #277).
   * When omitted, Blockages stays a Coming-soon stub.
   */
  showBlockages?: boolean;
  onShowBlockagesChange?: (v: boolean) => void;
  blockagesHint?: string;
  blockagesLoading?: boolean;
  baseMapType?: BaseMapType;
  onBaseMapTypeChange?: (v: BaseMapType) => void;
  /** TEMP A/B (#160) — satellite imagery vendor while basemap is Satellite. */
  satelliteImagerySource?: SatelliteImagerySource;
  onSatelliteImagerySourceChange?: (v: SatelliteImagerySource) => void;
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
    // Opacity lives in the muted token; avoid a second dim pass that fights
    // map frost high-contrast remap (GH #145).
    <Text fw={700} tt="uppercase" c="var(--color-text-muted)" style={{ fontSize: 9, letterSpacing: "0.06em" }} mb={6}>
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
  showNrcLocations = false, onShowNrcLocationsChange = noop,
  showBlockages,
  onShowBlockagesChange = noop,
  blockagesHint,
  blockagesLoading = false,
  baseMapType = "simple", onBaseMapTypeChange = noop,
  satelliteImagerySource = "mapbox", onSatelliteImagerySourceChange = noop,
  keepPanelsOpen = false, onKeepPanelsOpenChange = noop,
  filters,
}: MapPanelBarProps) {
  const blockagesEnabled = showBlockages !== undefined;
  const t = useTranslations("map");
  const [active, setActive] = useState<PanelId | null>(null);
  // Toggle-only: map pan/zoom/click must not dismiss — analysts keep the card
  // open while navigating. Close by clicking the active icon again (or another).
  const toggle = (id: PanelId) => setActive((prev) => (prev === id ? null : id));

  return (
    // Mobile: clear the status/safe area + floating burger. Desktop: below the filter bar.
    <Box
      data-map-chrome-left
      className="absolute z-20 top-14 left-4 sm:top-20"
    >
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
            data-tour={active === "layers" ? "map-layers-panel" : undefined}
            style={{
              width: 260,
              maxWidth: "calc(100vw - 72px)",
              // Frost: translucent fill + blur. Keep map container free of
              // `isolation: isolate` so Chromium can sample the WebGL canvas.
              background: "color-mix(in srgb, var(--color-bg-muted) 42%, transparent)",
              backdropFilter: "blur(16px) saturate(1.2)",
              WebkitBackdropFilter: "blur(16px) saturate(1.2)",
              border: "1px solid color-mix(in srgb, var(--color-border-dark) 55%, transparent)",
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
                    mb={baseMapType === "satellite" ? 8 : 10}
                  />
                  {baseMapType === "satellite" && (
                    <Box mb={10} data-testid="satellite-imagery-ab">
                      <Text
                        size="xs"
                        c="var(--color-text-muted)"
                        mb={4}
                        style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase" }}
                      >
                        {t("panels.imageryAbTemp")}
                      </Text>
                      <SegmentedControl
                        value={satelliteImagerySource}
                        onChange={(v) =>
                          onSatelliteImagerySourceChange(v as SatelliteImagerySource)
                        }
                        data={SATELLITE_IMAGERY_OPTIONS.map((o) => ({
                          value: o.value,
                          label: t(`panels.${o.labelKey}`),
                        }))}
                        size="xs"
                        fullWidth
                        styles={{ label: { fontSize: 11, padding: "3px 6px" } }}
                      />
                    </Box>
                  )}

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

                  {/* Operational: Blockages live when enabled; NRC locations always toggleable */}
                  <SectionLabel>{t("panels.operational")}</SectionLabel>
                  {blockagesEnabled ? (
                    <LayerCheckRow
                      label={t("panels.blockages")}
                      checked={showBlockages}
                      onChange={onShowBlockagesChange}
                      trailing={
                        blockagesLoading ? (
                          <Loader size={12} />
                        ) : blockagesHint ? (
                          <Text size="10px" c="var(--color-text-muted)" style={{ maxWidth: 120 }} truncate>
                            {blockagesHint}
                          </Text>
                        ) : undefined
                      }
                    />
                  ) : (
                    <LayerStubRow label={t("panels.blockages")} hint={t("panels.comingSoon")} />
                  )}
                  <LayerCheckRow
                    label={t("panels.nrcLocations")}
                    checked={showNrcLocations}
                    onChange={onShowNrcLocationsChange}
                  />
                  {showNrcLocations && (
                    <Text
                      size="xs"
                      c="var(--color-text-muted)"
                      style={{ fontSize: 10, lineHeight: 1.35, marginTop: 2, marginBottom: 2 }}
                    >
                      {t("nrcOffices.centroidDisclaimer")}
                    </Text>
                  )}

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

                  {showNrcLocations && (
                    <>
                      <Divider color="var(--color-bg-muted)" my={4} />
                      <SectionLabel>{t("panels.nrcLocations")}</SectionLabel>
                      {SUDAN_NRC_OFFICE_TYPE_ORDER.map((key) => (
                        <Group key={key} gap={8} wrap="nowrap">
                          <Box
                            w={14}
                            h={14}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              flexShrink: 0,
                            }}
                          >
                            <Box
                              w={10}
                              h={10}
                              style={{
                                backgroundColor: SUDAN_NRC_OFFICE_COLORS[key],
                                transform: "rotate(45deg)",
                                borderRadius: 1,
                                border: "1px solid var(--color-bg-muted)",
                              }}
                            />
                          </Box>
                          <Text size="xs" style={{ fontSize: 11 }}>
                            {t(`nrcOffices.types.${key}`)}
                          </Text>
                        </Group>
                      ))}
                      <Text
                        size="xs"
                        c="var(--color-text-muted)"
                        mt={6}
                        style={{ fontSize: 10, lineHeight: 1.35 }}
                      >
                        {t("nrcOffices.centroidDisclaimer")}
                      </Text>
                    </>
                  )}

                  {showBlockages !== undefined && showBlockages && (
                    <>
                      <Divider color="var(--color-bg-muted)" my={4} />
                      <Group justify="space-between" align="flex-start" gap={8} wrap="nowrap">
                        <Box style={{ flex: 1, minWidth: 0 }}>
                          <SectionLabel>{t("panels.blockages")}</SectionLabel>
                          <Stack gap={4}>
                            <Group gap={8} wrap="nowrap">
                              <Box
                                w={18}
                                h={3}
                                style={{ backgroundColor: "#B91C1C", borderRadius: 1, flexShrink: 0 }}
                              />
                              <Text size="xs" style={{ fontSize: 11 }}>{t("panels.blockagesCurrent")}</Text>
                            </Group>
                            <Group gap={8} wrap="nowrap">
                              <Box
                                w={18}
                                h={0}
                                style={{
                                  borderTop: "2px dashed #B91C1C",
                                  opacity: 0.55,
                                  flexShrink: 0,
                                  alignSelf: "center",
                                }}
                              />
                              <Text size="xs" style={{ fontSize: 11 }}>{t("panels.blockagesStale")}</Text>
                            </Group>
                          </Stack>
                        </Box>
                        <Stack gap={4} style={{ flexShrink: 0, paddingTop: 14 }} title={t("panels.blockagesStatus")}>
                          <Group gap={4} wrap="nowrap" justify="flex-end">
                            <Box
                              w={14}
                              h={2}
                              style={{ backgroundColor: "#B91C1C", borderRadius: 1 }}
                              title={t("panels.blockagesNotPassable")}
                            />
                            <Text size="xs" c="var(--color-text-muted)" style={{ fontSize: 9 }}>
                              {t("panels.blockagesNotPassable")}
                            </Text>
                          </Group>
                          <Group gap={4} wrap="nowrap" justify="flex-end">
                            <Box
                              w={14}
                              h={2}
                              style={{ backgroundColor: "#D97706", borderRadius: 1 }}
                              title={t("panels.blockagesRestricted")}
                            />
                            <Text size="xs" c="var(--color-text-muted)" style={{ fontSize: 9 }}>
                              {t("panels.blockagesRestricted")}
                            </Text>
                          </Group>
                        </Stack>
                      </Group>
                      <Text size="xs" c="var(--color-text-muted)" style={{ fontSize: 10, lineHeight: 1.35 }} mt={4}>
                        {t("panels.blockagesStaleNote")}
                      </Text>
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
