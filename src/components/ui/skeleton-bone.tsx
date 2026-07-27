import type { CSSProperties } from "react";
import { Box } from "@mantine/core";

interface SkeletonBoneProps {
  width?: number | string;
  height?: number | string;
  radius?: number;
  style?: CSSProperties;
}

/** Theme-token pulse bar for layout skeletons (instant swap — no fade). */
export function SkeletonBone({
  width = "100%",
  height = 12,
  radius = 4,
  style,
}: SkeletonBoneProps) {
  return (
    <Box
      style={{
        width,
        height,
        borderRadius: radius,
        background: "var(--color-bg-muted)",
        animation: "clear-skeleton-pulse 1.2s ease-in-out infinite",
        ...style,
      }}
      aria-hidden
    />
  );
}

export function SkeletonPulseStyles() {
  return (
    <style>{`
      @keyframes clear-skeleton-pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.55; }
      }
    `}</style>
  );
}
