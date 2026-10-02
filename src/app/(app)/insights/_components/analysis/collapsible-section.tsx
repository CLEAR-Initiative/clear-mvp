"use client";

import { useId, useState, type ReactNode } from "react";
import { Badge, Box, Collapse, Group, Text, UnstyledButton } from "@mantine/core";
import { IconChevronDown } from "@tabler/icons-react";

export type SectionTone = "critical" | "warning" | "info" | "ai" | "neutral";

const TONES: Record<SectionTone, { fg: string; bg: string }> = {
  critical: { fg: "var(--color-critical)", bg: "var(--color-critical-light)" },
  warning: { fg: "var(--color-warning)", bg: "var(--color-warning-light)" },
  info: { fg: "var(--color-info)", bg: "var(--color-info-light)" },
  ai: { fg: "var(--color-ai)", bg: "var(--color-ai-light)" },
  neutral: { fg: "var(--color-text-secondary)", bg: "var(--color-bg-muted)" },
};

/**
 * A titled analysis section that expands on demand (PRD: sections are
 * collapsed by default). The header stays informative while closed: title,
 * tag and a count.
 */
export function CollapsibleSection({
  icon: Icon,
  tone = "neutral",
  title,
  tag,
  meta,
  defaultOpen = false,
  children,
  testId,
}: {
  icon?: React.ComponentType<{ size?: number; color?: string }>;
  tone?: SectionTone;
  title: string;
  tag?: string;
  meta?: string;
  defaultOpen?: boolean;
  children: ReactNode;
  testId?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const bodyId = useId();
  const c = TONES[tone];

  return (
    <Box mb={16} style={{ border: "1px solid var(--color-border)", background: "var(--color-bg-white)" }} data-testid={testId}>
      <UnstyledButton
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls={bodyId}
        w="100%"
        px={20}
        py={16}
        className="hover:bg-[var(--color-bg-muted)]"
        style={{ display: "flex", alignItems: "center", gap: 14 }}
      >
        {Icon && (
          <Box
            style={{
              width: 36,
              height: 36,
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: c.bg,
            }}
          >
            <Icon size={18} color={c.fg} />
          </Box>
        )}
        <Group gap={10} style={{ flex: 1, minWidth: 0 }}>
          <Text fw={700} c="var(--color-text-primary)" style={{ fontSize: 16 }}>
            {title}
          </Text>
          {tag && (
            <Badge size="sm" radius="sm" style={{ background: c.bg, color: c.fg, textTransform: "none" }}>
              {tag}
            </Badge>
          )}
          {meta && (
            <Text c="var(--color-text-muted)" style={{ fontSize: 12 }}>
              {meta}
            </Text>
          )}
        </Group>
        <IconChevronDown
          size={18}
          color="var(--color-text-muted)"
          style={{ transform: open ? "rotate(180deg)" : undefined, transition: "transform 150ms ease", flexShrink: 0 }}
        />
      </UnstyledButton>
      <Collapse in={open} id={bodyId}>
        <Box style={{ borderTop: "1px solid var(--color-border)" }}>{children}</Box>
      </Collapse>
    </Box>
  );
}
