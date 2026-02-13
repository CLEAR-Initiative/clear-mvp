import { Box, Text, Group, Stack } from "@mantine/core";
import { type LayerDef } from "./map-markers-data";

interface MapLegendPanelProps {
  layers: LayerDef[];
}

export function MapLegendPanel({ layers }: MapLegendPanelProps) {
  return (
    <Box
      className="absolute z-10 bg-white border border-[#E5E5E5]"
      p={12}
      style={{ bottom: 100, left: 16, minWidth: 140 }}
    >
      <Text fw={700} tt="uppercase" c="#737373" style={{ fontSize: 10, letterSpacing: "0.05em" }} mb={8}>
        Legend
      </Text>
      <Stack gap={6}>
        {layers.map((item) => (
          <Group key={item.id} gap={8}>
            <Box w={10} h={10} style={{ backgroundColor: item.color }} />
            <Text size="xs" style={{ fontSize: 11 }}>{item.label}</Text>
          </Group>
        ))}
      </Stack>
    </Box>
  );
}
