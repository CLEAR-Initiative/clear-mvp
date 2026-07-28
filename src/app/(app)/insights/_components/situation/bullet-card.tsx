import { Box, Card, Group, Text } from "@mantine/core";
import type { SaBullet, SaSource } from "~/server/api/mappers/situation-analysis";
import { Citations } from "./citations";

type BulletTone = "critical" | "warning" | "info" | "success";

const TONE_COLORS: Record<BulletTone, string> = {
  critical: "var(--color-critical)",
  warning: "var(--color-warning)",
  info: "var(--color-info)",
  success: "var(--color-success)",
};

/**
 * A titled list of narrative bullets, each with its own inline citation. Used
 * for the paired panels on the Overview sub-view (hazards / vulnerabilities,
 * push factors / return intentions). These carry genuine per-bullet source
 * ids, so the `[n]` sits right after each claim, in the text.
 */
export function BulletCard({
  label,
  items,
  tone,
  sources,
  onOpenSources,
}: {
  label: string;
  items: SaBullet[];
  tone: BulletTone;
  sources: SaSource[];
  onOpenSources?: () => void;
}) {
  const color = TONE_COLORS[tone];

  return (
    <Card p={16} style={{ border: "1px solid var(--color-border)", height: "100%" }}>
      <Group gap={8} mb={12} align="center">
        <Box style={{ width: 6, height: 6, borderRadius: "50%", background: color, flexShrink: 0 }} />
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
            {item.text}
            <Citations refs={item.refs} sources={sources} onOpen={onOpenSources} variant="inline" />
          </Text>
        </Group>
      ))}
    </Card>
  );
}
