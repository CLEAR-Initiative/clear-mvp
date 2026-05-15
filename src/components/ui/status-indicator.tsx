import { Group, Text } from "@mantine/core";
import { IconPointFilled } from "@tabler/icons-react";

interface StatusIndicatorProps {
  status: string;
  color: string;
}

export function StatusIndicator({ status, color }: StatusIndicatorProps) {
  return (
    <Group gap={6}>
      <IconPointFilled size={10} color={color} />
      <Text c="var(--color-text-secondary)" style={{ fontSize: 13 }}>
        {status}
      </Text>
    </Group>
  );
}
