import { Box, Group, Progress, Text } from "@mantine/core";
import { useFormatter } from "next-intl";

interface ResourceBarProps {
  name: string;
  current: number;
  total: number;
  color: string;
  status?: string;
  statusColor?: string;
  showBorder?: boolean;
}

export function ResourceBar({
  name,
  current,
  total,
  color,
  status,
  statusColor,
  showBorder = true,
}: ResourceBarProps) {
  const format = useFormatter();
  const pct = (current / total) * 100;

  return (
    <Box py={12} className={showBorder ? "border-b border-[var(--color-border)] last:border-b-0" : ""}>
      <Group justify="space-between" mb={8}>
        <Text fw={500} size="sm">
          {name}
        </Text>
        {status && (
          <Text size="xs" c={statusColor ?? color}>
            {status}
          </Text>
        )}
      </Group>
      <Group gap={8}>
        <Progress value={pct} size={6} color={color} style={{ flex: 1 }} />
        <Text size="xs" c="var(--color-text-muted)">
          {format.number(current)} / {format.number(total)}
        </Text>
      </Group>
    </Box>
  );
}
