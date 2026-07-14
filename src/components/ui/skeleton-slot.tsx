"use client";

import React, { type ReactNode } from "react";
import { Box } from "@mantine/core";

interface SkeletonSlotProps {
  pending: boolean;
  skeleton: ReactNode;
  children: ReactNode;
  className?: string;
}

/**
 * Shows a structured skeleton placeholder while pending; swaps to children when resolved.
 * Slot dimensions should be defined by the skeleton shape to prevent layout shift.
 */
export function SkeletonSlot({ pending, skeleton, children, className }: SkeletonSlotProps) {
  // Instant swap — no fade-from-transparent on resolve (see Navigation Transition in CONTEXT.md).
  if (pending) {
    return <Box className={className}>{skeleton}</Box>;
  }

  return <Box className={className}>{children}</Box>;
}
