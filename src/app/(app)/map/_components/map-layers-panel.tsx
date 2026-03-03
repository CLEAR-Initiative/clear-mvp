import { Box, Text, Stack, Checkbox, Group } from "@mantine/core";
import { IconLayersLinked } from "@tabler/icons-react";
import { type LayerDef } from "./map-markers-data";

interface MapLayersPanelProps {
  layers: LayerDef[];
  activeLayers: string[];
  onToggleLayer: (layerId: string) => void;
}

export function MapLayersPanel({ layers, activeLayers, onToggleLayer }: MapLayersPanelProps) {
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
        <Text fw={700} tt="uppercase" c="#A3A3A3" style={{ fontSize: 9, letterSpacing: "0.06em" }} mb={6}>
          CLEAR Data
        </Text>
        {layers.map((layer) => (
          <Group
            key={layer.id}
            gap={8}
            py={6}
            px={4}
            className="cursor-pointer hover:bg-[#F9FAFB] -mx-1"
            onClick={() => onToggleLayer(layer.id)}
            style={{ userSelect: "none" }}
          >
            <Checkbox
              size="xs"
              checked={activeLayers.includes(layer.id)}
              onChange={() => onToggleLayer(layer.id)}
              styles={{ input: { cursor: "pointer" } }}
            />
            <Box w={10} h={10} style={{ backgroundColor: layer.color, flexShrink: 0 }} />
            <Text size="xs" c="#525252" style={{ fontSize: 12 }}>
              {layer.label}
            </Text>
          </Group>
        ))}
      </Stack>
    </Box>
  );
}
