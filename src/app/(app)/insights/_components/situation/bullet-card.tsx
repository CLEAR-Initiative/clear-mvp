import { Box, Card, Group, Text } from "@mantine/core";
import type { SaBullet, SaSource } from "~/server/api/mappers/situation-analysis";
import { Citations } from "./citations";
import { BulletRow } from "./bullet-row";

type BulletTone = "critical" | "warning" | "info" | "success";

const TONE_COLORS: Record<BulletTone, string> = {
  critical: "var(--color-critical)",
  warning: "var(--color-warning)",
  info: "var(--color-info)",
  success: "var(--color-success)",
};

/**
 * A titled list of narrative bullets with a single source attribution at the
 * foot. Used for the paired panels on the Overview sub-view (hazards /
 * vulnerabilities, push factors / return intentions).
 *
 * Attribution is shown ONCE, not per bullet: the pipeline stamps the same
 * component-level report set on every bullet (it does not record which claim
 * came from which report), so a per-bullet citation would repeat identical
 * numbers on every line and imply a precision the data does not have.
 * Per-fact citation is pipeline work (inline `[R1]` markers at generation).
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
  const refs = [...new Set(items.flatMap((i) => i.refs))].sort((a, b) => a - b);

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
        <BulletRow key={i} color={color} last={i === items.length - 1}>
          {item.text}
        </BulletRow>
      ))}

      <Citations refs={refs} sources={sources} onOpen={onOpenSources} />
    </Card>
  );
}
