"use client";

import { useState } from "react";
import {
  Box, Text, Stack, Group, Checkbox, Divider, Select, SegmentedControl,
} from "@mantine/core";
import { IconLayersLinked, IconList } from "@tabler/icons-react";
import type { DataView } from "./map-layers-panel";
import type { BoundaryLevel } from "./map-settings-popover";
export type { HierarchyLevel1 } from "~/components/disaster-type-picker";

type PanelId = "layers" | "legend";

const SEVERITY_ITEMS = [
  { label: "Critical", color: "var(--color-critical)" },
  { label: "High",     color: "var(--color-warning)" },
  { label: "Medium",   color: "#FBBF24" },
  { label: "Low",      color: "var(--color-success)" },
];

const BOUNDARY_OPTIONS = [
  { value: "none", label: "None" },
  { value: "A0",   label: "A0 - Country" },
  { value: "A1",   label: "A1 - States" },
  { value: "A2",   label: "A2 - Districts" },
];

const DATA_VIEW_OPTIONS: { label: string; value: DataView }[] = [
  { label: "None",   value: "none" },
  { label: "Crisis", value: "crisis" },
  { label: "Alert",  value: "alert" },
  { label: "Event",  value: "event" },
];

interface MapPanelBarProps {
  dataView: DataView;
  onDataViewChange: (v: DataView) => void;
  showPopulation: boolean;
  onShowPopulationChange: (v: boolean) => void;
  boundaryLevel: BoundaryLevel;
  onBoundaryLevelChange: (v: BoundaryLevel) => void;
}

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
  boundaryLevel, onBoundaryLevelChange,
}: MapPanelBarProps) {
  const [active, setActive] = useState<PanelId | null>(null);
  const toggle = (id: PanelId) => setActive((prev) => (prev === id ? null : id));

  return (
    <Box className="absolute z-10" style={{ top: 80, left: 16 }}>
      <Group gap={4} align="flex-start" wrap="nowrap">

        {/* Icon column */}
        <Stack gap={4}>
          <IconBtn icon={IconLayersLinked} active={active === "layers"} title="Layers" onClick={() => toggle("layers")} />
          <IconBtn icon={IconList}         active={active === "legend"} title="Legend" onClick={() => toggle("legend")} />
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
                <PanelHeader>Layers</PanelHeader>
                <Stack gap={0} px={12} py={10}>
                  <SectionLabel>Boundaries</SectionLabel>
                  <Select
                    size="xs"
                    value={boundaryLevel}
                    onChange={(v) => onBoundaryLevelChange((v ?? "A1") as BoundaryLevel)}
                    data={BOUNDARY_OPTIONS}
                    mb={10}
                    styles={{ input: { fontWeight: 600, fontSize: 12 } }}
                  />
                  <SectionLabel>Markers</SectionLabel>
                  <SegmentedControl
                    value={dataView}
                    onChange={(v) => onDataViewChange(v as DataView)}
                    data={DATA_VIEW_OPTIONS}
                    size="xs"
                    fullWidth
                    styles={{ label: { fontSize: 11, padding: "3px 6px" } }}
                  />
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
                    <Text size="xs" c="var(--color-text-secondary)" style={{ fontSize: 12 }}>Population</Text>
                  </Group>
                </Stack>
              </>
            )}

            {/* Legend */}
            {active === "legend" && (
              <>
                <PanelHeader>Legend</PanelHeader>
                <Stack gap={4} px={12} py={8}>
                  <SectionLabel>Severity</SectionLabel>
                  {SEVERITY_ITEMS.map((item) => (
                    <Group key={item.label} gap={8}>
                      <Box w={10} h={10} style={{ borderRadius: "50%", backgroundColor: item.color, flexShrink: 0 }} />
                      <Text size="xs" style={{ fontSize: 11 }}>{item.label}</Text>
                    </Group>
                  ))}

                  {showPopulation && (
                    <>
                      <Divider color="var(--color-bg-muted)" my={4} />
                      <SectionLabel>Population</SectionLabel>
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
