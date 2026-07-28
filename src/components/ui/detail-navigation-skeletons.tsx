"use client";

import { Box, Group, Skeleton, Stack } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";

/** Card shell matching DetailCard layout (header bar + body). */
export function DetailCardSkeleton({
  bodyHeight = 120,
  mb = 20,
  headerWidth = "30%",
  subtitle = false,
  showBadge = false,
}: {
  bodyHeight?: number;
  mb?: number;
  headerWidth?: string | number;
  subtitle?: boolean;
  showBadge?: boolean;
}) {
  return (
    <Box
      mb={mb}
      style={{
        border: "1px solid var(--color-border)",
        borderRadius: 8,
        overflow: "hidden",
        background: "var(--color-bg-white)",
      }}
    >
      <Box px={16} py={12} style={{ borderBottom: "1px solid var(--color-border)" }}>
        <Group justify="space-between" wrap="nowrap">
          <Skeleton height={14} width={headerWidth} />
          {showBadge && <Skeleton height={18} width={72} radius="xl" />}
        </Group>
        {subtitle && <Skeleton height={10} width="55%" mt={6} />}
      </Box>
      <Box p={16}>
        <Skeleton height={bodyHeight} radius="sm" />
      </Box>
    </Box>
  );
}

/** Event summary card (title + AI badge + paragraph). */
export function SummaryCardSkeleton() {
  return <DetailCardSkeleton bodyHeight={88} headerWidth="28%" showBadge />;
}

export function EventHeaderSkeleton({ isCompact = false }: { isCompact?: boolean }) {
  return (
    <>
      <Skeleton height={18} width={80} mb={10} radius="xl" />
      <Skeleton height={isCompact ? 18 : 24} width="85%" mb={10} />
      <Group gap={6} mb={14}>
        <Skeleton height={24} width={80} radius="xl" />
        <Skeleton height={24} width={100} radius="xl" />
      </Group>
      <Group gap={12}>
        <Skeleton height={12} width={100} />
        <Skeleton height={12} width={120} />
        <Skeleton height={12} width={90} />
      </Group>
    </>
  );
}

export function SignalHeaderSkeleton({ isCompact = false }: { isCompact?: boolean }) {
  return (
    <>
      <Skeleton height={18} width={80} mb={10} radius="xl" />
      <Skeleton height={isCompact ? 18 : 24} width="85%" mb={10} />
      <Group gap={6} mb={14}>
        <Skeleton height={20} width={70} radius="xl" />
        <Skeleton height={14} width={120} />
      </Group>
      <Group gap={12}>
        <Skeleton height={12} width={100} />
        <Skeleton height={12} width={120} />
        <Skeleton height={12} width={90} />
      </Group>
    </>
  );
}

export function KpiStripSkeleton() {
  // Match KpiStack / event-detail: only treat as mobile once the query resolves true
  // (undefined on first paint must stay desktop width to avoid a shrink flash).
  const isMobile = useMediaQuery("(max-width: 48em)") === true;

  return (
    <Box
      style={{
        display: "flex",
        flexDirection: isMobile ? "column" : "row",
        width: "100%",
        background: "var(--color-bg-white)",
        border: "1px solid var(--color-border)",
        borderRadius: 8,
        overflow: "hidden",
      }}
    >
      {[0, 1].map((section) => (
        <Box
          key={section}
          style={{
            flex: 1,
            minWidth: 0,
            borderInlineEnd:
              !isMobile && section === 0 ? "1px solid var(--color-border)" : undefined,
            borderBottom:
              isMobile && section === 0 ? "1px solid var(--color-border)" : undefined,
          }}
        >
          <Box
            px={12}
            py={6}
            style={{ borderBottom: "1px solid var(--color-border)", background: "var(--color-bg-muted)" }}
          >
            <Skeleton height={10} width={70} />
          </Box>
          <Box style={{ display: "flex" }}>
            {[0, 1].map((item) => (
              <Box
                key={item}
                px={12}
                py={10}
                style={{
                  flex: 1,
                  minWidth: 0,
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  borderInlineEnd: item === 0 ? "1px solid var(--color-border)" : undefined,
                }}
              >
                <Skeleton height={28} width={28} radius="sm" style={{ flexShrink: 0 }} />
                <Box style={{ flex: 1, minWidth: 0 }}>
                  <Skeleton height={17} width={48} mb={6} />
                  <Skeleton height={10} width="80%" />
                </Box>
              </Box>
            ))}
          </Box>
        </Box>
      ))}
    </Box>
  );
}

export function DiscussionCardSkeleton() {
  return (
    <Box
      mb={20}
      style={{
        border: "1px solid var(--color-border)",
        borderRadius: 8,
        overflow: "hidden",
        background: "var(--color-bg-white)",
      }}
    >
      <Box px={16} py={12} style={{ borderBottom: "1px solid var(--color-border)" }}>
        <Skeleton height={14} width={100} />
      </Box>
      {/* Compact body — matches empty/loading discussion, not a fake 2-post thread */}
      <Box px={16} py={20} style={{ display: "flex", justifyContent: "center" }}>
        <Skeleton height={12} width={160} radius={4} />
      </Box>
      <Box px={16} py={12} style={{ borderTop: "1px solid var(--color-border)" }}>
        <Skeleton height={72} radius="sm" />
      </Box>
    </Box>
  );
}

export function SignalsListCardSkeleton() {
  return (
    <Box
      mb={20}
      style={{
        border: "1px solid var(--color-border)",
        borderRadius: 8,
        overflow: "hidden",
        background: "var(--color-bg-white)",
      }}
    >
      <Box px={16} py={12} style={{ borderBottom: "1px solid var(--color-border)" }}>
        <Skeleton height={14} width="40%" mb={6} />
        <Skeleton height={10} width="55%" />
      </Box>
      {[0, 1, 2].map((i) => (
        <Box key={i} px={16} py={12} style={{ borderBottom: "1px solid var(--color-border)" }}>
          <Group justify="space-between" mb={8}>
            <Skeleton height={18} width={80} radius="xl" />
            <Skeleton height={10} width={60} />
          </Group>
          <Skeleton height={14} width="88%" />
        </Box>
      ))}
    </Box>
  );
}

export function FeedbackCardSkeleton() {
  return (
    <Box
      style={{
        border: "1px solid var(--color-border)",
        borderRadius: 8,
        overflow: "hidden",
        background: "var(--color-bg-white)",
      }}
    >
      <Box px={16} py={12} style={{ borderBottom: "1px solid var(--color-border)" }}>
        <Skeleton height={14} width={140} />
      </Box>
      <Box p={16}>
        <Group gap={8} mb={12}>
          <Skeleton height={32} style={{ flex: 1 }} radius="sm" />
          <Skeleton height={32} style={{ flex: 1 }} radius="sm" />
        </Group>
        <Skeleton height={10} width="80%" />
      </Box>
    </Box>
  );
}

export function ActionsCardSkeleton() {
  return (
    <Box
      style={{
        border: "1px solid var(--color-border)",
        borderRadius: 8,
        overflow: "hidden",
        background: "var(--color-bg-white)",
      }}
    >
      <Box px={16} py={10} style={{ borderBottom: "1px solid var(--color-border)" }}>
        <Skeleton height={13} width={60} />
      </Box>
      <Box p={16}>
        <Stack gap={8}>
          <Skeleton height={28} radius="sm" />
          <Skeleton height={28} radius="sm" />
        </Stack>
      </Box>
    </Box>
  );
}

export function MinimapCardSkeleton() {
  return (
    <Box
      style={{
        border: "1px solid var(--color-border)",
        borderRadius: 8,
        overflow: "hidden",
        background: "var(--color-bg-white)",
      }}
    >
      <Box px={16} py={10} style={{ borderBottom: "1px solid var(--color-border)" }}>
        <Skeleton height={14} width={80} />
      </Box>
      <Skeleton height={225} radius={0} />
    </Box>
  );
}

export function RelatedEventsCardSkeleton() {
  return (
    <Box
      style={{
        border: "1px solid var(--color-border)",
        borderRadius: 8,
        overflow: "hidden",
        background: "var(--color-bg-white)",
      }}
    >
      <Box px={16} py={12} style={{ borderBottom: "1px solid var(--color-border)" }}>
        <Skeleton height={14} width="35%" />
      </Box>
      {[0, 1, 2].map((i) => (
        <Box key={i} px={16} py={12} style={{ borderBottom: "1px solid var(--color-border)" }}>
          <Group justify="space-between" mb={8}>
            <Group gap={6}>
              <Skeleton height={18} width={64} radius="xl" />
              <Skeleton height={18} width={72} radius="xl" />
            </Group>
            <Skeleton height={10} width={48} />
          </Group>
          <Skeleton height={14} width="90%" />
        </Box>
      ))}
    </Box>
  );
}

export function SystemDataCardSkeleton() {
  return (
    <Box
      style={{
        border: "1px solid var(--color-border)",
        borderRadius: 8,
        overflow: "hidden",
        background: "var(--color-bg-white)",
      }}
    >
      <Box px={16} py={10} style={{ borderBottom: "1px solid var(--color-border)" }}>
        <Skeleton height={13} width={90} />
      </Box>
      <Box p={16}>
        <Stack gap={8}>
          <Skeleton height={12} width="100%" />
          <Skeleton height={12} width="85%" />
          <Skeleton height={12} width="92%" />
        </Stack>
      </Box>
    </Box>
  );
}

export function SignalSourceCardSkeleton() {
  return (
    <Box
      mb={20}
      style={{
        border: "1px solid var(--color-border)",
        borderRadius: 8,
        overflow: "hidden",
        background: "var(--color-bg-white)",
      }}
    >
      <Box px={16} py={12} style={{ borderBottom: "1px solid var(--color-border)" }}>
        <Skeleton height={14} width="25%" />
      </Box>
      <Box p={12} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} height={72} radius="sm" />
        ))}
      </Box>
    </Box>
  );
}

export function DescriptionCardSkeleton() {
  return <DetailCardSkeleton bodyHeight={88} headerWidth="25%" />;
}

export function SourceDetailCardSkeleton() {
  return (
    <Box style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
      <DetailCardSkeleton bodyHeight={140} mb={0} headerWidth="50%" />
      <DetailCardSkeleton bodyHeight={140} mb={0} headerWidth="50%" />
    </Box>
  );
}

/** @deprecated Use SourceDetailCardSkeleton */
export const EventGridCardsSkeleton = SourceDetailCardSkeleton;
