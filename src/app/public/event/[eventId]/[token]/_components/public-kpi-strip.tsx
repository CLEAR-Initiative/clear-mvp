"use client";

import { Box, Text } from "@mantine/core";
import { IconUsers, IconUsersGroup } from "@tabler/icons-react";

function formatCompact(n: number | null): string {
  if (n === null) return "-";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}K`;
  return String(n);
}

interface KpiItemProps {
  icon: React.ReactNode;
  iconBg: string;
  value: string;
  label: string;
}

function KpiItem({ icon, iconBg, value, label }: KpiItemProps) {
  return (
    <Box px={12} py={10} style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <Box
        style={{
          width: 28,
          height: 28,
          borderRadius: 6,
          background: iconBg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        {icon}
      </Box>
      <Box style={{ minWidth: 0 }}>
        <Text fw={700} c="var(--color-text-primary)" style={{ fontSize: 17, lineHeight: 1, letterSpacing: "-0.02em" }}>
          {value}
        </Text>
        <Text size="xs" c="var(--color-text-muted)" mt={2} truncate>
          {label}
        </Text>
      </Box>
    </Box>
  );
}

export function PublicKpiStrip({
  affected,
  displaced,
}: {
  affected: number | null;
  displaced: number | null;
}) {
  const items: KpiItemProps[] = [
    {
      icon: <IconUsers size={14} color="var(--color-accent)" />,
      iconBg: "var(--color-accent-light)",
      value: formatCompact(affected),
      label: "People affected",
    },
    {
      icon: <IconUsersGroup size={14} color="var(--color-warning)" />,
      iconBg: "var(--color-warning-light)",
      value: formatCompact(displaced),
      label: "People displaced",
    },
  ];

  return (
    <Box
      style={{
        display: "flex",
        background: "var(--color-bg-white)",
        border: "1px solid var(--color-border)",
        borderRadius: 8,
        overflow: "hidden",
      }}
    >
      <Box style={{ flex: 1, minWidth: 0 }}>
        <Box
          px={12}
          py={6}
          style={{ borderBottom: "1px solid var(--color-border)", background: "var(--color-bg-muted)" }}
        >
          <Text
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.05em",
              textTransform: "uppercase",
              color: "var(--color-text-muted)",
            }}
          >
            Impact
          </Text>
        </Box>
        <Box style={{ display: "flex" }}>
          {items.map((item, ii) => (
            <Box
              key={ii}
              style={{
                flex: 1,
                minWidth: 0,
                borderInlineEnd: ii < items.length - 1 ? "1px solid var(--color-border)" : undefined,
              }}
            >
              <KpiItem {...item} />
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  );
}
