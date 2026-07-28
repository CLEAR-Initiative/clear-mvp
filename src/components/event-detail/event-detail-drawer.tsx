"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Drawer, Box, Group, Text, ActionIcon } from "@mantine/core";
import { IconX, IconExternalLink } from "@tabler/icons-react";
import { api } from "~/trpc/react";
import { useTeam } from "~/providers/team-provider";
import { EventDetailContent } from "./event-detail-content";

interface EventDetailDrawerProps {
  eventId: string | null;
  opened: boolean;
  onClose: () => void;
}

export function EventDetailDrawer({
  eventId,
  opened,
  onClose,
}: EventDetailDrawerProps) {
  const t = useTranslations("eventDetail");
  const router = useRouter();
  const originalPathRef = useRef<string | null>(null);
  const { activeTeamId } = useTeam();

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
        originalPathRef.current = window.location.pathname;
      }
      window.history.replaceState(null, "", `/event/${eventId}`);
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
      size="min(680px, 85vw)"
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
          <Text fw={600} c="var(--color-text-primary)" size="sm">
            {t("drawer.title")}
          </Text>
          <Group gap={8}>
            <ActionIcon
              variant="subtle"
              color="gray"
              size="sm"
              onClick={() => {
                if (eventId == null) return;
                onClose();
                router.push(`/event/${eventId}`);
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
        />
      </Box>
    </Drawer>
  );
}
