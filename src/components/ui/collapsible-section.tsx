"use client";

import { useState } from "react";
import { Box, Text, Collapse, UnstyledButton, Badge } from "@mantine/core";
import { cn } from "~/lib/utils";

interface CollapsibleSectionProps {
  title: string;
  defaultOpen?: boolean;
  children?: React.ReactNode;
  /** When true: always collapsed, non-interactive, greyed out, shows Coming Soon badge */
  locked?: boolean;
}

export function CollapsibleSection({ title, defaultOpen = false, children, locked = false }: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  if (locked) {
    return (
      <Box className="border-b border-[var(--color-border)]" style={{ opacity: 0.45 }}>
        <Box
          w="100%"
          px={24}
          py={16}
          className="flex justify-between items-center"
          style={{ cursor: "not-allowed" }}
        >
          <Text fw={700} tt="uppercase" style={{ letterSpacing: "0.08em", fontSize: 11 }}>
            {title}
          </Text>
          <Badge size="xs" variant="light" color="gray" style={{ fontSize: 9, fontWeight: 600 }}>
            Coming Soon
          </Badge>
        </Box>
      </Box>
    );
  }

  return (
    <Box className="border-b border-[var(--color-border)]">
      <UnstyledButton
        onClick={() => setOpen(!open)}
        w="100%"
        px={24}
        py={16}
        className="flex justify-between items-center cursor-pointer hover:bg-[var(--color-bg-muted)] transition-colors"
      >
        <Text fw={700} tt="uppercase" style={{ letterSpacing: "0.08em", fontSize: 11 }}>
          {title}
        </Text>
        <Box
          w={24}
          h={24}
          className={cn(
            "border flex items-center justify-center",
            open
              ? "border-transparent text-[#171717]"
              : "border-transparent text-[#737373]",
          )}
          style={{ fontSize: 14 }}
        >
          {open ? "\u2212" : "+"}
        </Box>
      </UnstyledButton>
      <Collapse in={open}>
        {children && <Box px={24} pb={24}>{children}</Box>}
      </Collapse>
    </Box>
  );
}
