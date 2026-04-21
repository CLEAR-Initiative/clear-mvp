"use client";

import { useState } from "react";
import {
  Box, Text, Stack, Group, Radio, Checkbox, Divider, Select,
} from "@mantine/core";
import {
  IconLayersLinked, IconList, IconSettings,
} from "@tabler/icons-react";
import type { DataView } from "./map-layers-panel";
import type { BoundaryLevel } from "./map-settings-popover";

type PanelId = "layers" | "legend" | "config";

const SEVERITY_ITEMS = [
  { label: "Critical", color: "#DC2626" },
  { label: "High",     color: "#D97706" },
  { label: "Medium",   color: "#FBBF24" },
  { label: "Low",      color: "#059669" },
];

const BOUNDARY_OPTIONS = [
  { value: "none", label: "None" },
  { value: "A0",   label: "A0 - Country" },
  { value: "A1",   label: "A1 - States" },
  { value: "A2",   label: "A2 - Districts" },
];

interface DisasterType {
  id: string;
  disasterType: string;
  disasterClass: string;
  glideNumber: string;
}

interface MapPanelBarProps {
  /* Layers */
  dataView: DataView;
  onDataViewChange: (v: DataView) => void;
  showPopulation: boolean;
  onShowPopulationChange: (v: boolean) => void;
  /* Legend */
  eventTypes?: DisasterType[];
  /* Config */
  boundaryLevel: BoundaryLevel;
  onBoundaryLevelChange: (v: BoundaryLevel) => void;
}

function IconBtn({
  icon: Icon,
  active,
  title,
  onClick,
}: {
  icon: React.ElementType;
  active: boolean;
  title: string;
  onClick: () => void;
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: 30,
        height: 30,
        border: "1px solid #E5E5E5",
        borderRadius: 4,
        background: active ? "#EFF6FF" : "white",
        color: active ? "#2563EB" : "#525252",
        cursor: "pointer",
        padding: 0,
        boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
        flexShrink: 0,
      }}
    >
      <Icon size={15} />
    </button>
  );
}

function PanelHeader({ children }: { children: string }) {
  return (
    <Text
      fw={700} tt="uppercase" c="#737373"
      style={{ fontSize: 10, letterSpacing: "0.05em" }}
      px={12} pt={10} pb={8}
      className="border-b border-[#E5E5E5]"
    >
      {children}
    </Text>
  );
}

function SectionLabel({ children }: { children: string }) {
  return (
    <Text fw={700} tt="uppercase" c="#A3A3A3" style={{ fontSize: 9, letterSpacing: "0.06em" }} mb={6}>
      {children}
    </Text>
  );
}

export function MapPanelBar({
  dataView, onDataViewChange,
  showPopulation, onShowPopulationChange,
  eventTypes = [],
  boundaryLevel, onBoundaryLevelChange,
}: MapPanelBarProps) {
  const [active, setActive] = useState<PanelId | null>(null);
  const toggle = (id: PanelId) => setActive((prev) => (prev === id ? null : id));

  return (
    <Box className="absolute z-10" style={{ top: 80, left: 16 }}>
      <Group gap={4} align="flex-start" wrap="nowrap">

        {/* Icon column */}
        <Stack gap={4}>
          <IconBtn icon={IconLayersLinked} active={active === "layers"} title="Layers"  onClick={() => toggle("layers")} />
          <IconBtn icon={IconList}         active={active === "legend"} title="Legend"  onClick={() => toggle("legend")} />
          <IconBtn icon={IconSettings}     active={active === "config"} title="Config"  onClick={() => toggle("config")} />
        </Stack>

        {/* Panel content */}
        {active && (
          <Box
            className="bg-white border border-[#E5E5E5]"
            style={{ width: 220, boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}
          >
            {/* ── Layers ── */}
            {active === "layers" && (
              <>
                <PanelHeader>Layers</PanelHeader>
                <Stack gap={0} px={12} py={8}>
                  <SectionLabel>CLEAR Data</SectionLabel>
                  <Radio.Group value={dataView} onChange={(v) => onDataViewChange(v as DataView)}>
                    <Stack gap={0}>
                      {(["crisis", "alert", "event"] as const).map((view) => (
                        <Group
                          key={view} gap={8} py={6} px={4}
                          className="cursor-pointer hover:bg-[#F9FAFB] -mx-1"
                          onClick={() => onDataViewChange(view)}
                          style={{ userSelect: "none" }}
                        >
                          <Radio size="xs" value={view} styles={{ radio: { cursor: "pointer" } }} onClick={(e) => e.stopPropagation()} />
                          <Text size="xs" c="#525252" style={{ fontSize: 12, textTransform: "capitalize" }}>{view}</Text>
                        </Group>
                      ))}
                    </Stack>
                  </Radio.Group>
                  <Divider color="#F5F5F5" my={8} />
                  <Group
                    gap={8} py={6} px={4}
                    className="cursor-pointer hover:bg-[#F9FAFB] -mx-1"
                    onClick={() => onShowPopulationChange(!showPopulation)}
                    style={{ userSelect: "none" }}
                  >
                    <Checkbox
                      size="xs" checked={showPopulation}
                      onChange={(e) => onShowPopulationChange(e.currentTarget.checked)}
                      styles={{ input: { cursor: "pointer" } }}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <Text size="xs" c="#525252" style={{ fontSize: 12 }}>Population</Text>
                  </Group>
                </Stack>
              </>
            )}

            {/* ── Legend ── */}
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
                  {eventTypes.length > 0 && (
                    <>
                      <Divider color="#F5F5F5" my={4} />
                      <SectionLabel>Event Type</SectionLabel>
                      {eventTypes.map((dt) => (
                        <Group key={dt.id} gap={8}>
                          <Text size="xs" c="#737373" style={{ fontSize: 10, fontFamily: "monospace", minWidth: 18 }}>
                            {dt.glideNumber.toUpperCase()}
                          </Text>
                          <Text size="xs" style={{ fontSize: 11, textTransform: "capitalize" }}>{dt.disasterType}</Text>
                        </Group>
                      ))}
                    </>
                  )}
                </Stack>
              </>
            )}

            {/* ── Config ── */}
            {active === "config" && (
              <>
                <PanelHeader>Map Settings</PanelHeader>
                <Stack gap={10} px={12} py={10}>
                  <Group justify="space-between" align="center" gap={8} wrap="nowrap">
                    <Text size="xs" c="#525252" style={{ fontSize: 12, flexShrink: 0 }}>Boundaries</Text>
                    <Select
                      size="xs"
                      value={boundaryLevel}
                      onChange={(v) => onBoundaryLevelChange((v ?? "A1") as BoundaryLevel)}
                      data={BOUNDARY_OPTIONS}
                      style={{ minWidth: 120 }}
                      styles={{ input: { fontWeight: 600, fontSize: 12 } }}
                    />
                  </Group>
                </Stack>
              </>
            )}
          </Box>
        )}
      </Group>
    </Box>
  );
}
