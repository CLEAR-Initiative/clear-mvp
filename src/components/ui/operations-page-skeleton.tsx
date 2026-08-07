import { Box, Group, SimpleGrid } from "@mantine/core";
import { SkeletonBone, SkeletonPulseStyles } from "~/components/ui/skeleton-bone";

export function OperationsPageSkeleton() {
  return (
    <Box>
      <SkeletonPulseStyles />
      <Box
        px={24}
        py={12}
        style={{
          borderBottom: "1px solid var(--color-border)",
          background: "var(--color-bg-white)",
        }}
      >
        <Group justify="space-between" align="center">
          <SkeletonBone width={160} height={22} />
          <Group gap={8}>
            <SkeletonBone width={120} height={30} />
            <SkeletonBone width={140} height={30} />
          </Group>
        </Group>
      </Box>

      <Box p={24}>
        <Group gap={16} mb={24}>
          <SkeletonBone width={88} height={28} />
          <SkeletonBone width={88} height={28} />
          <SkeletonBone width={96} height={28} />
          <SkeletonBone width={112} height={28} />
        </Group>

        <SimpleGrid cols={{ base: 2, sm: 4 }} spacing={16} mb={24}>
          {Array.from({ length: 4 }, (_, i) => (
            <Box
              key={i}
              p={16}
              style={{
                border: "1px solid var(--color-border)",
                background: "var(--color-bg-white)",
              }}
            >
              <SkeletonBone width={72} height={10} style={{ marginBottom: 10 }} />
              <SkeletonBone width={48} height={22} />
            </Box>
          ))}
        </SimpleGrid>

        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing={16} mb={24}>
          {Array.from({ length: 2 }, (_, i) => (
            <Box
              key={i}
              p={16}
              style={{
                border: "1px solid var(--color-border)",
                background: "var(--color-bg-white)",
                minHeight: 180,
              }}
            >
              <SkeletonBone width="40%" height={14} style={{ marginBottom: 16 }} />
              <SkeletonBone width="100%" height={64} style={{ marginBottom: 12 }} />
              <SkeletonBone width="70%" height={12} />
            </Box>
          ))}
        </SimpleGrid>

        <Box
          style={{
            border: "1px solid var(--color-border)",
            background: "var(--color-bg-white)",
          }}
        >
          <Box px={20} py={14} style={{ borderBottom: "1px solid var(--color-border)" }}>
            <SkeletonBone width={180} height={14} />
          </Box>
          {Array.from({ length: 3 }, (_, i) => (
            <Box
              key={i}
              px={20}
              py={20}
              style={{ borderBottom: "1px solid var(--color-border)" }}
            >
              <SkeletonBone width="50%" height={14} style={{ marginBottom: 10 }} />
              <SkeletonBone width="80%" height={10} />
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  );
}
