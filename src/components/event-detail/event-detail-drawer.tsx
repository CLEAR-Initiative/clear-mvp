"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Drawer, Box, Group, Text, ActionIcon } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import {
  IconX,
  IconExternalLink,
  IconChevronLeft,
  IconChevronRight,
} from "@tabler/icons-react";
import { api } from "~/trpc/react";
import { useTeam } from "~/providers/team-provider";
import { EventDetailContent } from "./event-detail-content";

interface EventDetailDrawerProps {
  eventId: string | null;
  opened: boolean;
  onClose: () => void;
  /** Optional list scrub chrome (Detection feed preview, etc.). */
  navigation?: {
    prevId: string | null;
    nextId: string | null;
    hasPrev: boolean;
    hasNext: boolean;
    position: string;
  };
  onNavigatePrev?: () => void;
  onNavigateNext?: () => void;
}

export function EventDetailDrawer({
  eventId,
  opened,
  onClose,
  navigation,
  onNavigatePrev,
  onNavigateNext,
}: EventDetailDrawerProps) {
  const t = useTranslations("eventDetail");
  const router = useRouter();
  const originalPathRef = useRef<string | null>(null);
  const { activeTeamId } = useTeam();
  const isMobile = useMediaQuery("(max-width: 48em)") === true;

  const eventQuery = api.events.get.useQuery(
    { id: eventId! },
    { enabled: eventId != null && opened },
  );

  const relatedQuery = api.events.related.useQuery(
    { id: eventId!, teamId: activeTeamId },
    { enabled: !!eventQuery.data && opened },
  );

  const utils = api.useUtils();
  useEffect(() => {
    if (!opened || !eventId) return;
    void utils.comments.list.prefetch({ entityId: eventId, entityType: "event" });
  }, [opened, eventId, utils]);

  // Capture original path when drawer opens; restore it when it closes or unmounts.
  // Using a ref ensures the path is only captured once per open, not on each eventId change.
  useEffect(() => {
    if (opened && eventId != null) {
      if (originalPathRef.current === null) {
        originalPathRef.current = window.location.pathname + window.location.search;
      }
      window.history.replaceState(null, "", `/event/${eventId}?from=detection`);
    }
  }, [opened, eventId]);

  useEffect(() => {
    if (!opened && originalPathRef.current !== null) {
      window.history.replaceState(null, "", originalPathRef.current);
      originalPathRef.current = null;
    }
  }, [opened]);

  return (
    <Drawer
      opened={opened}
      onClose={onClose}
      position="right"
      size={isMobile ? "100%" : "min(680px, 85vw)"}
      withCloseButton={false}
      styles={{
        body: { padding: 0, height: "100%" },
        content: { display: "flex", flexDirection: "column" },
      }}
    >
      {/* Custom header */}
      <Box
        px={20}
        py={12}
        style={{
          background: "var(--color-bg-white)",
          borderBottom: "1px solid var(--color-border)",
          flexShrink: 0,
        }}
      >
        <Group justify="space-between">
          <Group gap={10}>
            <Text fw={600} c="var(--color-text-primary)" size="sm">
              {t("drawer.title")}
            </Text>
            {navigation && (
              <Group gap={6}>
                <ActionIcon
                  variant="subtle"
                  color="gray"
                  size="sm"
                  onClick={onNavigatePrev}
                  disabled={!navigation.hasPrev}
                  title={t("nav.previous")}
                  aria-label={t("nav.previous")}
                >
                  <IconChevronLeft size={16} />
                </ActionIcon>
                <Text
                  size="xs"
                  c="var(--color-text-muted)"
                  fw={500}
                  style={{ minWidth: 48, textAlign: "center" }}
                >
                  {navigation.position}
                </Text>
                <ActionIcon
                  variant="subtle"
                  color="gray"
                  size="sm"
                  onClick={onNavigateNext}
                  disabled={!navigation.hasNext}
                  title={t("nav.next")}
                  aria-label={t("nav.next")}
                >
                  <IconChevronRight size={16} />
                </ActionIcon>
              </Group>
            )}
          </Group>
          <Group gap={8}>
            <ActionIcon
              variant="subtle"
              color="gray"
              size="sm"
              onClick={() => {
                if (eventId == null) return;
                // Stay open through the route change — do not close/animate the
                // drawer away first. Clear restore path so unmount does not
                // rewrite the URL back to Detection under the push.
                // replaceState already put `/event/:id` in the bar; Next's
                // router still thinks we are on Detection, so push navigates.
                originalPathRef.current = null;
                router.push(`/event/${eventId}?from=detection`);
              }}
              title={t("drawer.openFullPage")}
            >
              <IconExternalLink size={16} />
            </ActionIcon>
            <ActionIcon
              variant="subtle"
              color="gray"
              size="sm"
              onClick={onClose}
            >
              <IconX size={16} />
            </ActionIcon>
          </Group>
        </Group>
      </Box>

      {/* Scrollable content */}
      <Box style={{ flex: 1, overflowY: "auto" }}>
        <EventDetailContent
          event={eventQuery.data}
          entityId={eventId ?? undefined}
          loading={eventQuery.isLoading}
          mode="drawer"
          relatedEvents={relatedQuery.data ?? []}
          relatedLoading={relatedQuery.isLoading}
          navigation={navigation}
          onNavigatePrev={onNavigatePrev}
          onNavigateNext={onNavigateNext}
        />
      </Box>
    </Drawer>
  );
}
