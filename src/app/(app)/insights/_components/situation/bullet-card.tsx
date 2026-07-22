import { Box, Card, Group, Text } from "@mantine/core";

type BulletTone = "critical" | "warning" | "info" | "success";

const TONE_COLORS: Record<BulletTone, string> = {
  critical: "var(--color-critical)",
  warning: "var(--color-warning)",
  info: "var(--color-info)",
  success: "var(--color-success)",
};

/**
 * A titled list of narrative bullets. Used for the paired panels on the
 * Overview sub-view (hazards / vulnerabilities, push factors / return
 * intentions), where the tone carries the only visual distinction between the
 * two halves of a pair.
 */
export function BulletCard({
  label,
  items,
  tone,
}: {
  label: string;
  items: string[];
  tone: BulletTone;
}) {
  const color = TONE_COLORS[tone];

  return (
    <Card p={16} style={{ border: "1px solid var(--color-border)", height: "100%" }}>
      <Group gap={8} mb={12} align="center">
        <Box
          style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: color,
            flexShrink: 0,
          }}
        />
        <Text
          fw={700}
          tt="uppercase"
          c="var(--color-text-secondary)"
          style={{ fontSize: 11, letterSpacing: "0.5px" }}
        >
          {label}
        </Text>
      </Group>

      {items.map((item, i) => (
        <Group key={i} gap={8} align="flex-start" wrap="nowrap" mb={i === items.length - 1 ? 0 : 8}>
          <Text c={color} style={{ fontSize: 13, lineHeight: 1.5 }}>
            &bull;
          </Text>
          <Text c="var(--color-text-primary)" style={{ fontSize: 13, lineHeight: 1.5 }}>
            {item}
          </Text>
        </Group>
      ))}
    </Card>
  );
}
