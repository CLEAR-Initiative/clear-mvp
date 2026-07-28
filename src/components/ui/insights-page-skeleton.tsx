import { Box, Group } from "@mantine/core";
import { SkeletonBone, SkeletonPulseStyles } from "~/components/ui/skeleton-bone";

/** Crisis list rows — reused by Insights ReportsTab while crises load. */
export function InsightsCrisisListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <Box>
      <SkeletonPulseStyles />
      {Array.from({ length: rows }, (_, i) => (
        <Box
          key={i}
          px={16}
          py={20}
          style={{
            borderBottom: "1px solid var(--color-border)",
            display: "flex",
            gap: 12,
            alignItems: "flex-start",
          }}
        >
          <SkeletonBone width={10} height={10} radius={999} style={{ marginTop: 4, flexShrink: 0 }} />
          <Box style={{ flex: 1, minWidth: 0 }}>
            <Group justify="space-between" mb={10} wrap="nowrap">
              <SkeletonBone width="45%" height={14} />
              <SkeletonBone width={64} height={18} radius={999} style={{ flexShrink: 0 }} />
            </Group>
            <SkeletonBone width="35%" height={12} style={{ marginBottom: 10 }} />
            <Group gap={8}>
              <SkeletonBone width={64} height={18} radius={999} />
              <SkeletonBone width={64} height={18} radius={999} />
              <SkeletonBone width={72} height={10} style={{ marginInlineStart: "auto" }} />
            </Group>
          </Box>
        </Box>
      ))}
    </Box>
  );
}

/**
 * Mirrors Insights page chrome:
 * PageHeader (crumbs + title) → tabs → Active Crises card list.
 */
export function InsightsPageSkeleton() {
  return (
    <Box style={{ minHeight: "100%", height: "100%", overflow: "auto" }}>
      <SkeletonPulseStyles />

      <Box
        px={24}
        py={12}
        style={{
          borderBottom: "1px solid var(--color-border)",
          background: "var(--color-bg-white)",
        }}
      >
        <Group gap={4} mb={8}>
          <SkeletonBone width={40} height={10} />
          <SkeletonBone width={8} height={10} />
          <SkeletonBone width={56} height={10} />
        </Group>
        <SkeletonBone width={100} height={22} />
      </Box>

      <Box p={24}>
        <Group gap={0} mb={24} style={{ borderBottom: "1px solid var(--color-border)" }}>
          <Box px={12} py={10}>
            <SkeletonBone width={72} height={14} />
          </Box>
          <Box px={12} py={10}>
            <SkeletonBone width={96} height={14} />
          </Box>
        </Group>

        <Box
          style={{
            border: "1px solid var(--color-border)",
            background: "var(--color-bg-white)",
            borderRadius: 4,
            overflow: "hidden",
          }}
        >
          <Box
            px={16}
            py={14}
            style={{
              borderBottom: "1px solid var(--color-border)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 12,
            }}
          >
            <Box>
              <SkeletonBone width={120} height={14} style={{ marginBottom: 6 }} />
              <SkeletonBone width={160} height={10} />
            </Box>
            <SkeletonBone width={72} height={18} radius={999} />
          </Box>
          <InsightsCrisisListSkeleton />
        </Box>
      </Box>
    </Box>
  );
}
