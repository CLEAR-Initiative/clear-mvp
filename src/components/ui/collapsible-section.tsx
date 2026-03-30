"use client";

import { useState } from "react";
import { Box, Text, Collapse, UnstyledButton } from "@mantine/core";
import { cn } from "~/lib/utils";

interface CollapsibleSectionProps {
  title: string;
  defaultOpen?: boolean;
  children?: React.ReactNode;
}

export function CollapsibleSection({ title, defaultOpen = false, children }: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <Box className="border-b border-[#E5E5E5]">
      <UnstyledButton
        onClick={() => setOpen(!open)}
        w="100%"
        px={24}
        py={16}
        className="flex justify-between items-center cursor-pointer hover:bg-[#F5F5F5] transition-colors"
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
