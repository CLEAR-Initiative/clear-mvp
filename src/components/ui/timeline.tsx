import { Box, Group, Stack, Text } from "@mantine/core";

export interface TimelineItem {
  title: string;
  meta: string;
  color: string;
}

interface TimelineProps {
  items: TimelineItem[];
}

export function Timeline({ items }: TimelineProps) {
  return (
    <Box pl={32} style={{ position: "relative" }}>
      <Box
        style={{
          position: "absolute",
          left: 28,
          top: 16,
          bottom: 16,
          width: 2,
          background: "var(--color-border)",
        }}
      />
      <Stack gap={20}>
        {items.map((item, i) => (
          <Group key={i} gap={16} style={{ position: "relative" }}>
            <Box
              style={{
                width: 10,
                height: 10,
                background: item.color,
                borderRadius: "50%",
                flexShrink: 0,
                zIndex: 1,
                border: item.color === "#E5E5E5" ? "2px solid #D4D4D4" : "none",
              }}
            />
            <Box style={{ flex: 1 }}>
              <Text fw={600} style={{ fontSize: 13 }}>
                {item.title}
              </Text>
              <Text c="var(--color-text-muted)" style={{ fontSize: 12 }}>
                {item.meta}
              </Text>
            </Box>
          </Group>
        ))}
      </Stack>
    </Box>
  );
}
