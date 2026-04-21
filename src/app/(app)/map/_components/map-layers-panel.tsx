import { Box, Text, Stack, Checkbox, Group, Radio, Divider } from "@mantine/core";
import { IconLayersLinked } from "@tabler/icons-react";
import { type LayerDef } from "./map-markers-data";

export type DataView = "crisis" | "alert" | "event";

interface MapLayersPanelProps {
  layers: LayerDef[];
  activeLayers: string[];
  onToggleLayer: (layerId: string) => void;
  dataView: DataView;
  onDataViewChange: (view: DataView) => void;
  showPopulation: boolean;
  onShowPopulationChange: (show: boolean) => void;
}

export function MapLayersPanel({
  layers,
  activeLayers,
  onToggleLayer,
  dataView,
  onDataViewChange,
  showPopulation,
  onShowPopulationChange,
}: MapLayersPanelProps) {
  return (
    <Box
      className="absolute z-10 bg-white border border-[#E5E5E5]"
      style={{ top: 80, left: 16, width: 200 }}
    >
      <Group gap={8} px={12} py={10} className="border-b border-[#E5E5E5]">
        <IconLayersLinked size={14} color="#737373" />
        <Text fw={700} tt="uppercase" c="#737373" style={{ fontSize: 10, letterSpacing: "0.05em" }}>
          Layers
        </Text>
      </Group>

      <Stack gap={0} px={12} py={8}>
        <Text fw={700} tt="uppercase" c="#A3A3A3" style={{ fontSize: 9, letterSpacing: "0.06em" }} mb={8}>
          CLEAR Data
        </Text>
        <Radio.Group value={dataView} onChange={(v) => onDataViewChange(v as DataView)}>
          <Stack gap={0}>
            {(["crisis", "alert", "event"] as const).map((view) => (
              <Group
                key={view}
                gap={8}
                py={6}
                px={4}
                className="cursor-pointer hover:bg-[#F9FAFB] -mx-1"
                onClick={() => onDataViewChange(view)}
                style={{ userSelect: "none" }}
              >
                <Radio
                  size="xs"
                  value={view}
                  styles={{ radio: { cursor: "pointer" } }}
                  onClick={(e) => e.stopPropagation()}
                />
                <Text size="xs" c="#525252" style={{ fontSize: 12, textTransform: "capitalize" }}>
                  {view}
                </Text>
              </Group>
            ))}
          </Stack>
        </Radio.Group>

        <Divider color="#F5F5F5" my={8} />

        <Group
          gap={8}
          py={6}
          px={4}
          className="cursor-pointer hover:bg-[#F9FAFB] -mx-1"
          onClick={() => onShowPopulationChange(!showPopulation)}
          style={{ userSelect: "none" }}
        >
          <Checkbox
            size="xs"
            checked={showPopulation}
            onChange={(e) => onShowPopulationChange(e.currentTarget.checked)}
            styles={{ input: { cursor: "pointer" } }}
            onClick={(e) => e.stopPropagation()}
          />
          <Text size="xs" c="#525252" style={{ fontSize: 12 }}>
            Population
          </Text>
        </Group>
      </Stack>
    </Box>
  );
}
