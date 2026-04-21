import { Box, Text, Group, Stack } from "@mantine/core";
import { type LayerDef } from "./map-markers-data";

const SEVERITY_ITEMS = [
  { label: "Critical", color: "#DC2626" },
  { label: "High",     color: "#D97706" },
  { label: "Medium",   color: "#FBBF24" },
  { label: "Low",      color: "#059669" },
];

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

      <Stack gap={4}>
        <Text fw={700} tt="uppercase" c="#A3A3A3" style={{ fontSize: 9, letterSpacing: "0.06em" }} mb={2}>
          Severity
        </Text>
        {SEVERITY_ITEMS.map((item) => (
          <Group key={item.label} gap={8}>
            <Box w={10} h={10} style={{ borderRadius: "50%", backgroundColor: item.color, flexShrink: 0 }} />
            <Text size="xs" style={{ fontSize: 11 }}>{item.label}</Text>
          </Group>
        ))}
      </Stack>

      {layers.length > 0 && (
        <Stack gap={4} mt={10}>
          <Text fw={700} tt="uppercase" c="#A3A3A3" style={{ fontSize: 9, letterSpacing: "0.06em" }} mb={2}>
            Event Type
          </Text>
          {layers.map((item) => (
            <Group key={item.id} gap={8}>
              <Box w={10} h={10} style={{ backgroundColor: item.color, flexShrink: 0 }} />
              <Text size="xs" style={{ fontSize: 11 }}>{item.label}</Text>
            </Group>
          ))}
        </Stack>
      )}
    </Box>
  );
}
