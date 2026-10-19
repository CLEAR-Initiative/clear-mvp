import { Box, Group, SimpleGrid } from "@mantine/core";
import { SkeletonBone, SkeletonPulseStyles } from "~/components/ui/skeleton-bone";

const CARD = {
  border: "1px solid var(--color-border)",
  background: "var(--color-bg-white)",
  borderRadius: 4,
} as const;

/** A chart card: title, subtitle, plot area. */
function ChartCardSkeleton() {
  return (
    <Box style={CARD}>
      <Box px={16} py={12} style={{ borderBottom: "1px solid var(--color-border)" }}>
        <SkeletonBone width={180} height={14} style={{ marginBottom: 6 }} />
        <SkeletonBone width="60%" height={10} />
      </Box>
      <Box p={16}>
        <SkeletonBone height={240} />
      </Box>
    </Box>
  );
}

/** The /metrics body while its first result loads: tiles, the trend, then
 * the histogram and exclusions. */
export function MetricsBodySkeleton() {
  return (
    <Box>
      <SkeletonPulseStyles />
      <SimpleGrid cols={{ base: 2, sm: 4 }} spacing={{ base: 10, sm: 16 }} mb={16}>
        {Array.from({ length: 4 }, (_, i) => (
          <Box key={i} p="lg" style={CARD}>
            <SkeletonBone width="70%" height={10} style={{ marginBottom: 12 }} />
            <SkeletonBone width={64} height={28} style={{ marginBottom: 10 }} />
            <SkeletonBone width="55%" height={10} />
          </Box>
        ))}
      </SimpleGrid>
      <Box mb={16}>
        <ChartCardSkeleton />
      </Box>
      <SimpleGrid cols={{ base: 1, lg: 2 }} spacing={16}>
        <ChartCardSkeleton />
        <ChartCardSkeleton />
      </SimpleGrid>
    </Box>
  );
}

/** Mirrors the /metrics page: header, the range and country controls, body. */
export function MetricsPageSkeleton() {
  return (
    <Box style={{ minHeight: "100%", height: "100%", overflow: "auto" }}>
      <SkeletonPulseStyles />
      <Box px={24} py={12} style={{ borderBottom: "1px solid var(--color-border)", background: "var(--color-bg-white)" }}>
        <Group gap={4} mb={8}>
          <SkeletonBone width={40} height={10} />
          <SkeletonBone width={8} height={10} />
          <SkeletonBone width={56} height={10} />
        </Group>
        <SkeletonBone width={100} height={18} />
      </Box>
      <Box p={{ base: 16, sm: 24 }}>
        <Group gap={12} mb={16} wrap="wrap">
          <SkeletonBone width={160} height={30} />
          <SkeletonBone width={160} height={30} />
          <SkeletonBone width={220} height={30} />
        </Group>
        <MetricsBodySkeleton />
      </Box>
    </Box>
  );
}
