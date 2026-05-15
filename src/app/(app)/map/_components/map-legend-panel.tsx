import { Box, Text, Group, Stack } from "@mantine/core";

const SEVERITY_ITEMS = [
  { label: "Critical", color: "#DC2626" },
  { label: "High",     color: "#D97706" },
  { label: "Medium",   color: "#FBBF24" },
  { label: "Low",      color: "#059669" },
];

interface DisasterType {
  id: string;
  disasterType: string;
  disasterClass: string;
  glideNumber: string;
}

interface MapLegendPanelProps {
  eventTypes?: DisasterType[];
}

export function MapLegendPanel({ eventTypes = [] }: MapLegendPanelProps) {
  return (
    <Box
      className="absolute z-10 bg-[var(--color-bg-white)] border border-[var(--color-border)]"
      p={12}
      style={{ bottom: 100, left: 16, minWidth: 140 }}
    >
      <Text fw={700} tt="uppercase" c="var(--color-text-muted)" style={{ fontSize: 10, letterSpacing: "0.05em" }} mb={8}>
        Legend
      </Text>

      <Stack gap={4}>
        <Text fw={700} tt="uppercase" c="var(--color-text-muted)" style={{ fontSize: 9, letterSpacing: "0.06em" }} mb={2}>
          Severity
        </Text>
        {SEVERITY_ITEMS.map((item) => (
          <Group key={item.label} gap={8}>
            <Box w={10} h={10} style={{ borderRadius: "50%", backgroundColor: item.color, flexShrink: 0 }} />
            <Text size="xs" style={{ fontSize: 11 }}>{item.label}</Text>
          </Group>
        ))}
      </Stack>

      {eventTypes.length > 0 && (
        <Stack gap={4} mt={10}>
          <Text fw={700} tt="uppercase" c="var(--color-text-muted)" style={{ fontSize: 9, letterSpacing: "0.06em" }} mb={2}>
            Event Type
          </Text>
          {eventTypes.map((dt) => (
            <Group key={dt.id} gap={8}>
              <Text size="xs" c="var(--color-text-muted)" style={{ fontSize: 10, fontFamily: "monospace", minWidth: 18 }}>
                {dt.glideNumber.toUpperCase()}
              </Text>
              <Text size="xs" style={{ fontSize: 11, textTransform: "capitalize" }}>{dt.disasterType}</Text>
            </Group>
          ))}
        </Stack>
      )}
    </Box>
  );
}
