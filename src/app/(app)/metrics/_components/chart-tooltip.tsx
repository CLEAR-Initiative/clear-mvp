import type { ReactNode } from "react";
import { Box, Text } from "@mantine/core";

/** A chart tooltip card in theme tokens, so it reads in light and dark. */
export function ChartTooltipCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Box
      px={10}
      py={8}
      style={{
        background: "var(--color-bg-white)",
        border: "1px solid var(--color-border)",
        borderRadius: 6,
        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.12)",
        minWidth: 140,
      }}
    >
      <Text fw={600} size="xs" c="var(--color-text-primary)" mb={4}>
        {title}
      </Text>
      {children}
    </Box>
  );
}

/** Axis and grid styling shared by the metrics charts. */
export const AXIS_TICK = { fill: "var(--color-text-muted)", fontSize: 11 };
export const GRID_STROKE = "var(--color-border)";
