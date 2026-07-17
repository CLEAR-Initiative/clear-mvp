"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useFormatter, useTranslations } from "next-intl";
import { Box, Button, Group, Loader, Stack, Text } from "@mantine/core";
import { IconAlertTriangle } from "@tabler/icons-react";
import { mapFocusHref } from "~/lib/map-focus-href";
import { severityColor } from "~/lib/types/graphql";
import { smartDestination, type Situation } from "~/lib/situations";

interface AttentionQueueProps {
  situations: Situation[];
  isLoading: boolean;
  hoveredEventId?: string | null;
  onHover?: (eventId: string | null) => void;
  /**
   * When true, grow with content and let a parent scroller own overflow
   * (Overview sticky-globe layout). Default: fill height and scroll inside.
   */
  embedScroll?: boolean;
}

function SituationCard({
  situation,
  highlighted,
  onOpen,
  onHover,
}: {
  situation: Situation;
  highlighted: boolean;
  onOpen: (s: Situation) => void;
  onHover?: (eventId: string | null) => void;
}) {
  const t = useTranslations("dashboard.attentionQueue");
  const format = useFormatter();
  const rail = severityColor(situation.severity);
  const mapHref = mapFocusHref("event", situation.eventId);

  return (
    <Box
      component="article"
      role="button"
      tabIndex={0}
      onClick={() => onOpen(situation)}
      onMouseEnter={() => onHover?.(situation.eventId)}
      onMouseLeave={() => onHover?.(null)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen(situation);
        }
      }}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 16,
        padding: 16,
        borderRadius: 12,
        border: highlighted
          ? "1px solid var(--color-accent, #E85D3D)"
          : "1px solid var(--color-border)",
        background: highlighted ? "var(--color-bg-muted)" : "var(--color-bg-white)",
        cursor: "pointer",
        transition: "border-color 120ms ease, background 120ms ease",
      }}
      className="hover:bg-[var(--color-bg-muted)]"
    >
      <Box
        aria-hidden
        style={{
          width: 6,
          height: 28,
          borderRadius: 9999,
          background: rail,
          flexShrink: 0,
        }}
      />
      <Box style={{ flex: 1, minWidth: 0 }}>
        <Group justify="space-between" align="center" gap={8} wrap="nowrap">
          <Text
            fw={700}
            style={{ fontSize: 14, color: "var(--color-text-primary)", lineHeight: "20px" }}
            lineClamp={1}
          >
            {situation.title}
          </Text>
          <Text
            fw={500}
            style={{
              fontSize: 10,
              color: "var(--color-text-muted)",
              whiteSpace: "nowrap",
              flexShrink: 0,
              lineHeight: "15px",
            }}
          >
            {format.relativeTime(new Date(situation.lastSignalAt))}
          </Text>
        </Group>
      </Box>
      <Button
        component={Link}
        href={mapHref}
        size="compact-xs"
        variant="default"
        onClick={(e) => e.stopPropagation()}
        styles={{
          root: {
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: "0.02em",
            textTransform: "uppercase",
            background: "var(--color-bg-muted)",
            border: "none",
            color: "var(--color-text-secondary)",
            flexShrink: 0,
          },
        }}
      >
        {t("viewOnMap")}
      </Button>
    </Box>
  );
}

export function AttentionQueue({
  situations,
  isLoading,
  hoveredEventId = null,
  onHover,
  embedScroll = false,
}: AttentionQueueProps) {
  const t = useTranslations("dashboard.attentionQueue");
  const router = useRouter();

  const handleOpen = (situation: Situation) => {
    const dest = smartDestination(situation);
    router.push(dest.href);
  };

  return (
    <Box
      style={{
        display: "flex",
        flexDirection: "column",
        height: embedScroll ? "auto" : "100%",
        minHeight: embedScroll ? undefined : 0,
        background: "var(--color-bg-primary)",
      }}
    >
      <Group
        justify="space-between"
        px={24}
        py={20}
        style={{ borderBottom: "1px solid var(--color-border)", flexShrink: 0 }}
      >
        <Group gap={8}>
          <IconAlertTriangle size={14} color="var(--color-text-primary)" />
          <Text
            fw={700}
            tt="uppercase"
            style={{
              fontSize: 14,
              letterSpacing: "0.1em",
              color: "var(--color-text-primary)",
            }}
          >
            {t("title")}
          </Text>
        </Group>
        <Text size="xs" c="var(--color-text-muted)">
          {t("countLabel", { count: situations.length })}
        </Text>
      </Group>

      <Box
        style={
          embedScroll
            ? undefined
            : { flex: 1, minHeight: 0, overflowY: "auto" }
        }
        p={24}
        pb={embedScroll ? 48 : 24}
      >
        {isLoading ? (
          <Group justify="center" py={48}>
            <Loader size="sm" />
          </Group>
        ) : situations.length === 0 ? (
          <Text c="var(--color-text-muted)" size="sm" ta="center" py={48}>
            {t("empty")}
          </Text>
        ) : (
          <Stack gap={16}>
            {situations.map((s) => (
              <SituationCard
                key={s.eventId}
                situation={s}
                highlighted={hoveredEventId === s.eventId}
                onOpen={handleOpen}
                onHover={onHover}
              />
            ))}
          </Stack>
        )}
      </Box>
    </Box>
  );
}
