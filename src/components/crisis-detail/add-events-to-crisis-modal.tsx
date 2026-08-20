"use client";

import { useState } from "react";
import { useFormatter, useTranslations } from "next-intl";
import {
  Badge,
  Box,
  Button,
  Group,
  Loader,
  Modal,
  Stack,
  Text,
  TextInput,
  UnstyledButton,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconPlus, IconSearch } from "@tabler/icons-react";
import { api } from "~/trpc/react";
import { mapSeverity, severityColor } from "~/lib/types/graphql";
import type { GqlEvent } from "~/lib/types/graphql";
import { severityColors, severityLabels } from "~/lib/constants/severity";
import { resolveLocationName } from "~/lib/location";
import type { RecommendReason } from "~/lib/crisis/recommend-events";
import { useTeam } from "~/providers/team-provider";

interface AddEventsToCrisisModalProps {
  opened: boolean;
  onClose: () => void;
  crisisId: string;
}

type ScoredRow = {
  event: GqlEvent;
  score: number;
  reasons: RecommendReason[];
};

export function AddEventsToCrisisModal({
  opened,
  onClose,
  crisisId,
}: AddEventsToCrisisModalProps) {
  const t = useTranslations("crisisDetail.events");
  const format = useFormatter();
  const utils = api.useUtils();
  const { activeTeamId } = useTeam();
  const [search, setSearch] = useState("");
  const [addingId, setAddingId] = useState<string | null>(null);

  const query = api.crises.recommendEvents.useQuery(
    {
      crisisId,
      search: search.trim() || undefined,
      teamId: activeTeamId,
      limit: 10,
    },
    { enabled: opened },
  );

  const addEvent = api.crises.addEvent.useMutation({
    onSuccess: async () => {
      await utils.crises.get.invalidate({ id: crisisId });
      await utils.crises.recommendEvents.invalidate();
      void utils.crises.list.invalidate();
      void utils.crises.listMenu.invalidate();
    },
  });

  const recommended = query.data?.recommended ?? [];
  const searchResults = query.data?.searchResults ?? [];
  const showingSearch = search.trim().length > 0;
  const rows: ScoredRow[] = showingSearch ? searchResults : recommended;

  async function handleAdd(eventId: string) {
    setAddingId(eventId);
    try {
      await addEvent.mutateAsync({ crisisId, eventId });
      notifications.show({
        color: "teal",
        title: t("addSuccessTitle"),
        message: t("addSuccessMessage"),
      });
    } catch (err) {
      notifications.show({
        color: "red",
        title: t("addErrorTitle"),
        message: err instanceof Error ? err.message : t("addErrorTitle"),
      });
    } finally {
      setAddingId(null);
    }
  }

  function handleClose() {
    setSearch("");
    onClose();
  }

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title={t("addModalTitle")}
      size="lg"
      centered
      data-testid="add-events-to-crisis-modal"
    >
      <Text size="sm" c="var(--color-text-secondary)" mb={12}>
        {t("addModalHint")}
      </Text>

      <TextInput
        placeholder={t("searchPlaceholder")}
        value={search}
        onChange={(e) => setSearch(e.currentTarget.value)}
        leftSection={<IconSearch size={14} />}
        mb={16}
        data-testid="crisis-add-event-search"
      />

      {query.isLoading ? (
        <Box py={32} style={{ display: "flex", justifyContent: "center" }}>
          <Loader size="sm" />
        </Box>
      ) : rows.length === 0 ? (
        <Box py={24} style={{ textAlign: "center" }}>
          <Text size="sm" c="var(--color-text-muted)">
            {showingSearch ? t("searchEmpty") : t("recommendEmpty")}
          </Text>
        </Box>
      ) : (
        <Stack gap={8} style={{ maxHeight: 420, overflowY: "auto" }}>
          {!showingSearch && (
            <Text size="xs" fw={600} c="var(--color-text-muted)" tt="uppercase">
              {t("recommendedHeading")}
            </Text>
          )}
          {showingSearch && (
            <Text size="xs" fw={600} c="var(--color-text-muted)" tt="uppercase">
              {t("searchHeading")}
            </Text>
          )}
          {rows.map(({ event, reasons }) => (
            <EventCandidateRow
              key={event.id}
              event={event}
              reasons={reasons}
              adding={addingId === event.id}
              disabled={addingId !== null}
              onAdd={() => void handleAdd(event.id)}
              formatRelative={(d) => format.relativeTime(d)}
            />
          ))}
        </Stack>
      )}
    </Modal>
  );
}

function EventCandidateRow({
  event,
  reasons,
  adding,
  disabled,
  onAdd,
  formatRelative,
}: {
  event: GqlEvent;
  reasons: RecommendReason[];
  adding: boolean;
  disabled: boolean;
  onAdd: () => void;
  formatRelative: (d: Date) => string;
}) {
  const t = useTranslations("crisisDetail.events");
  const sev = mapSeverity(event.severity);
  const sevCol = severityColor(event.severity);
  const sevBg = severityColors[sev]?.bg ?? "var(--color-bg-muted)";
  const location = event.generalLocation ?? event.originLocation ?? event.destinationLocation;
  const title = event.title ?? event.description ?? event.types[0] ?? t("fallbackName");
  const when = event.lastSignalCreatedAt || event.firstSignalCreatedAt;

  const reasonLabels = reasons.map((r) => t(`reasons.${r}`));

  return (
    <Box
      px={12}
      py={10}
      style={{
        border: "1px solid var(--color-border)",
        borderRadius: 6,
        display: "flex",
        gap: 12,
        alignItems: "center",
      }}
      data-testid={`crisis-add-candidate-${event.id}`}
    >
      <Box style={{ flex: 1, minWidth: 0 }}>
        <Group gap={6} mb={4}>
          <Badge size="xs" style={{ background: sevBg, color: sevCol, fontWeight: 700 }}>
            {severityLabels[sev]}
          </Badge>
          {when && (
            <Text size="xs" c="var(--color-text-muted)">
              {formatRelative(new Date(when))}
            </Text>
          )}
        </Group>
        <Text fw={600} size="sm" lineClamp={1} mb={4}>
          {title}
        </Text>
        <Group gap={8}>
          {resolveLocationName(location) && (
            <Text size="xs" c="var(--color-text-muted)">
              {resolveLocationName(location)}
            </Text>
          )}
          {reasonLabels.map((label) => (
            <Badge key={label} size="xs" variant="light" color="gray">
              {label}
            </Badge>
          ))}
        </Group>
      </Box>
      <Button
        size="xs"
        leftSection={<IconPlus size={12} />}
        loading={adding}
        disabled={disabled && !adding}
        onClick={onAdd}
        data-testid={`crisis-add-event-${event.id}`}
      >
        {t("add")}
      </Button>
    </Box>
  );
}

/** Compact trigger used above the crisis events timeline. */
export function AddEventsToCrisisButton({
  crisisId,
  canAdd,
}: {
  crisisId: string;
  canAdd: boolean;
}) {
  const t = useTranslations("crisisDetail.events");
  const [opened, setOpened] = useState(false);

  if (!canAdd) return null;

  return (
    <>
      <UnstyledButton
        onClick={() => setOpened(true)}
        data-testid="crisis-add-event-open"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          fontSize: 12,
          fontWeight: 600,
          color: "var(--color-accent)",
        }}
      >
        <IconPlus size={14} />
        {t("addEvent")}
      </UnstyledButton>
      <AddEventsToCrisisModal
        opened={opened}
        onClose={() => setOpened(false)}
        crisisId={crisisId}
      />
    </>
  );
}
