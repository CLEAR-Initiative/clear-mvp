import type { ReactNode } from "react";
import { Box, Text, Group, Loader } from "@mantine/core";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  breadcrumbs?: string[];
  loading?: boolean;
  children?: ReactNode;
  /**
   * `compact`: one 56px row, title then the children inline (/detection's
   * map-first header). Other pages keep the default.
   */
  variant?: "default" | "compact";
}

export function PageHeader({ title, subtitle, breadcrumbs, loading, children, variant = "default" }: PageHeaderProps) {
  if (variant === "compact") {
    return (
      <Box
        component="header"
        className="border-b border-[var(--color-border)]"
        style={{
          height: 56,
          padding: "0 20px",
          gap: 24,
          display: "flex",
          alignItems: "center",
          background: "var(--color-bg-white)",
          flexShrink: 0,
        }}
      >
        <Text fw={600} c="var(--color-text-primary)" style={{ fontSize: 16, whiteSpace: "nowrap" }}>
          {title}
        </Text>
        {children}
      </Box>
    );
  }
  return (
    <Box px={24} py={12} className="border-b border-[var(--color-border)]" style={{ background: "var(--color-bg-white)" }}>
      {breadcrumbs && breadcrumbs.length > 0 && (
        <Group gap={4} mb={8}>
          {breadcrumbs.map((crumb, i) => (
            <Group key={i} gap={4}>
              {i > 0 && (
                <Text size="xs" c="var(--color-text-muted)">
                  &gt;
                </Text>
              )}
              <Text
                size="xs"
                c={i === 0 ? "#E85D3D" : "#525252"}
                fw={i === 0 ? 600 : 500}
                style={i === 0 ? { cursor: "pointer" } : undefined}
              >
                {crumb}
              </Text>
            </Group>
          ))}
        </Group>
      )}

      {subtitle ? (
        <>
          <Group gap={12} mb={12}>
            <Text fw={700} c="var(--color-text-primary)" style={{ fontSize: 20 }}>
              {title}
            </Text>
            {loading && <Loader size={14} />}
          </Group>
        </>
      ) : (
        <Group justify="space-between">
          <Group gap={12}>
            <Text fw={600} c="var(--color-text-primary)" style={{ fontSize: 16 }}>
              {title}
            </Text>
            {loading && <Loader size={14} />}
          </Group>
          {children && !subtitle && <Group gap={8}>{children}</Group>}
        </Group>
      )}

      {subtitle && children && (
        <Group justify="space-between" align="flex-start" wrap="wrap" gap={12}>
          {children}
        </Group>
      )}
    </Box>
  );
}
