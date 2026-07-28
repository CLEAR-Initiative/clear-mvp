import { Box, Group } from "@mantine/core";
import { SkeletonBone, SkeletonPulseStyles } from "~/components/ui/skeleton-bone";

/** Feed list rows — reused by Detection tabs while queries load. */
export function DetectionFeedListSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <Box>
      <SkeletonPulseStyles />
      {Array.from({ length: rows }, (_, i) => (
        <Box
          key={i}
          px={16}
          py={12}
          style={{
            display: "flex",
            gap: 12,
            borderBottom: "1px solid var(--color-border)",
          }}
        >
          <SkeletonBone width={3} height={48} radius={2} style={{ flexShrink: 0 }} />
          <Box style={{ flex: 1, minWidth: 0 }}>
            <Group justify="space-between" mb={8}>
              <SkeletonBone width={72} height={18} radius={999} />
              <SkeletonBone width={48} height={10} />
            </Group>
            <SkeletonBone width="70%" height={14} style={{ marginBottom: 8 }} />
            <SkeletonBone width="40%" height={10} />
          </Box>
        </Box>
      ))}
    </Box>
  );
}

/** History tab table chrome — 7-column header + rows (FeedToolbar stays above). */
export function DetectionHistoryTableSkeleton({ rows = 8 }: { rows?: number }) {
  const colWidths = [220, 72, 100, 80, 110, 88, 100] as const;

  return (
    <Box>
      <SkeletonPulseStyles />
      <Box style={{ overflowX: "auto" }}>
        <Box style={{ minWidth: 760 }}>
          <Box
            px={12}
            py={10}
            style={{
              display: "flex",
              gap: 12,
              background: "var(--color-bg-muted)",
              borderBottom: "1px solid var(--color-border)",
            }}
          >
            {colWidths.map((w, i) => (
              <SkeletonBone key={i} width={w} height={10} style={{ flexShrink: 0 }} />
            ))}
          </Box>
          {Array.from({ length: rows }, (_, r) => (
            <Box
              key={r}
              px={12}
              py={14}
              style={{
                display: "flex",
                gap: 12,
                alignItems: "center",
                borderBottom: "1px solid var(--color-border)",
              }}
            >
              <SkeletonBone width={colWidths[0]} height={28} style={{ flexShrink: 0 }} />
              <SkeletonBone width={colWidths[1]} height={18} radius={999} style={{ flexShrink: 0 }} />
              <SkeletonBone width={colWidths[2]} height={18} radius={999} style={{ flexShrink: 0 }} />
              <SkeletonBone width={colWidths[3]} height={18} radius={999} style={{ flexShrink: 0 }} />
              <SkeletonBone width={colWidths[4]} height={12} style={{ flexShrink: 0 }} />
              <SkeletonBone width={colWidths[5]} height={12} style={{ flexShrink: 0 }} />
              <SkeletonBone width={colWidths[6]} height={12} style={{ flexShrink: 0 }} />
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  );
}

function FilterFieldBone({ width = 130 }: { width?: number }) {
  return (
    <Box style={{ minWidth: width, flex: `1 1 ${width}px`, maxWidth: 200 }}>
      <SkeletonBone width={48} height={10} style={{ marginBottom: 5 }} />
      <SkeletonBone width="100%" height={30} radius={4} />
    </Box>
  );
}

/**
 * In-page tab destination chrome — paints on click before URL/`activeTab` content settles.
 * Matches live/events/signals feed|map layout, or history table.
 */
export function DetectionTabContentSkeleton({ tab }: { tab: string }) {
  if (tab === "history") {
    return (
      <Box>
        <SkeletonPulseStyles />
        <Group justify="space-between" mb={12} align="center" style={{ minHeight: 32 }}>
          <SkeletonBone width={140} height={16} />
          <Group gap={8}>
            <SkeletonBone width={28} height={28} radius={4} />
            <SkeletonBone width={220} height={30} radius={4} />
          </Group>
        </Group>
        <Box
          style={{
            border: "1px solid var(--color-border)",
            background: "var(--color-bg-white)",
            overflow: "hidden",
          }}
        >
          <DetectionHistoryTableSkeleton />
        </Box>
      </Box>
    );
  }

  return (
    <Box style={{ display: "flex", gap: 24 }}>
      <SkeletonPulseStyles />
      <Box style={{ flex: 1, minWidth: 0 }}>
        <Group justify="space-between" mb={12} align="center" style={{ minHeight: 32 }}>
          <SkeletonBone width={160} height={16} />
          <SkeletonBone width={220} height={30} radius={4} />
        </Group>
        <Box
          style={{
            border: "1px solid var(--color-border)",
            background: "var(--color-bg-white)",
            maxHeight: 524,
            overflow: "hidden",
          }}
        >
          <DetectionFeedListSkeleton />
        </Box>
      </Box>

      <Box
        style={{
          width: 480,
          flexShrink: 0,
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
        visibleFrom="sm"
      >
        <Group justify="space-between" align="center" style={{ minHeight: 32 }}>
          <SkeletonBone width={88} height={14} />
          <SkeletonBone width={28} height={28} radius={4} />
        </Group>
        <Box
          style={{
            height: 524,
            border: "1px solid var(--color-border)",
            background: "var(--color-bg-muted)",
            borderRadius: 4,
          }}
        />
      </Box>
    </Box>
  );
}

/**
 * Mirrors Detection page chrome:
 * PageHeader (crumbs + title + FilterBar row + create) → full-width tabs → feed | map.
 */
export function DetectionPageSkeleton() {
  return (
    <Box style={{ minHeight: "100%", height: "100%", overflow: "auto" }}>
      <SkeletonPulseStyles />

      {/* PageHeader */}
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
          <SkeletonBone width={64} height={10} />
        </Group>
        <Group gap={12} mb={12}>
          <SkeletonBone width={120} height={22} />
        </Group>
        <Group justify="space-between" align="flex-end" wrap="wrap" gap={12}>
          <Group gap={12} wrap="wrap" align="flex-end" style={{ flex: 1, minWidth: 0 }}>
            <FilterFieldBone />
            <FilterFieldBone />
            <FilterFieldBone width={140} />
            <Box>
              <SkeletonBone width={36} height={10} style={{ marginBottom: 5 }} />
              <SkeletonBone width={30} height={30} radius={4} />
            </Box>
          </Group>
          <SkeletonBone width={118} height={30} radius={4} />
        </Group>
      </Box>

      {/* Body: tabs + feed/map */}
      <Box px={{ base: 12, sm: 24 }} py={{ base: 16, sm: 24 }}>
        {/* Full-width tab strip (4 equal segments) */}
        <Box mb={{ base: 16, sm: 24 }} style={{ position: "relative" }}>
          <Box style={{ display: "flex", width: "100%" }}>
            {Array.from({ length: 4 }, (_, i) => (
              <Box key={i} style={{ flex: 1, paddingInline: 4 }}>
                <SkeletonBone width="100%" height={36} radius={4} />
              </Box>
            ))}
          </Box>
          <Box
            style={{
              position: "absolute",
              bottom: 0,
              left: "25%",
              width: "25%",
              height: 2,
              background: "var(--color-accent)",
              opacity: 0.45,
            }}
          />
        </Box>

        <DetectionTabContentSkeleton tab="events" />
      </Box>
    </Box>
  );
}
