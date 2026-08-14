import type { ReactNode } from "react";
import { Group, Text } from "@mantine/core";

/**
 * One bulleted line in the Situation Analysis views.
 *
 * Extracted because the marker geometry had been copied three times (hazard
 * cards, sector pillars, context risks) and drifted apart - different bottom
 * margins and marker colours, so the same list read differently in each
 * section. Everything visual lives here; callers pass only the content and,
 * where the list carries a severity tone, the marker colour.
 */
export function BulletRow({
  children,
  color = "var(--color-text-muted)",
  last = false,
}: {
  children: ReactNode;
  /** Marker colour. Defaults to muted for lists with no severity tone. */
  color?: string;
  /** Drops the bottom margin so a list does not pad its container. */
  last?: boolean;
}) {
  return (
    <Group gap={8} align="flex-start" wrap="nowrap" mb={last ? 0 : 8}>
      <Text c={color} style={{ fontSize: 13, lineHeight: 1.5 }}>
        &bull;
      </Text>
      <Text c="var(--color-text-primary)" style={{ fontSize: 13, lineHeight: 1.5 }}>
        {children}
      </Text>
    </Group>
  );
}
