"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button, Group, Modal, Text, TextInput } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { api } from "~/trpc/react";
import { useTeam } from "~/providers/team-provider";

export function clampCrisisSeverity(n: number): number {
  if (!Number.isFinite(n)) return 3;
  return Math.min(5, Math.max(1, n));
}

interface CreateCrisisModalProps {
  opened: boolean;
  onClose: () => void;
  eventIds: string[];
  suggestedTitle?: string;
  defaultSeverity?: number;
  /** Query param on the crisis page so Back returns to the right surface. */
  from?: "detection" | "insights";
  onCreated?: () => void;
}

export function CreateCrisisModal({
  opened,
  onClose,
  eventIds,
  suggestedTitle = "",
  defaultSeverity = 3,
  from = "detection",
  onCreated,
}: CreateCrisisModalProps) {
  const t = useTranslations("eventDetail.addToCrisis");
  const router = useRouter();
  const utils = api.useUtils();
  const { activeTeamId } = useTeam();
  const [title, setTitle] = useState(suggestedTitle);

  useEffect(() => {
    if (opened) setTitle(suggestedTitle);
  }, [opened, suggestedTitle]);

  const createCrisis = api.crises.createFromEvents.useMutation({
    onSuccess: (crisis) => {
      notifications.show({
        color: "teal",
        title: t("createdTitle"),
        message: t("createdNamedMessage", { title: crisis.title ?? title.trim() }),
      });
      utils.crises.get.setData({ id: crisis.id }, {
        ...crisis,
        title: crisis.title ?? title.trim(),
        scenarios: crisis.scenarios ?? [],
        attachments: [],
      });
      void utils.crises.list.invalidate();
      void utils.crises.listMenu.invalidate();
      onCreated?.();
      onClose();
      router.push(`/crisis/${crisis.id}?from=${from}`);
    },
    onError: (err) => {
      notifications.show({
        color: "red",
        title: t("createErrorTitle"),
        message: err.message,
      });
    },
  });

  const trimmed = title.trim();
  const canSubmit = trimmed.length > 0 && eventIds.length > 0 && !createCrisis.isPending;

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={t("nameModalTitle")}
      centered
    >
      <Text size="sm" c="var(--color-text-secondary)" mb={12}>
        {t("nameModalHint", { count: eventIds.length })}
      </Text>
      <TextInput
        label={t("nameLabel")}
        placeholder={t("namePlaceholder")}
        value={title}
        onChange={(e) => setTitle(e.currentTarget.value)}
        data-testid="crisis-name-input"
        autoFocus
        onKeyDown={(e) => {
          if (e.key === "Enter" && canSubmit) {
            createCrisis.mutate({
              title: trimmed,
              severity: clampCrisisSeverity(defaultSeverity),
              needs: {},
              eventIds,
              teamId: activeTeamId ?? undefined,
            });
          }
        }}
      />
      <Group justify="flex-end" mt={16}>
        <Button variant="subtle" color="gray" onClick={onClose} disabled={createCrisis.isPending}>
          {t("cancel")}
        </Button>
        <Button
          onClick={() =>
            createCrisis.mutate({
              title: trimmed,
              severity: clampCrisisSeverity(defaultSeverity),
              needs: {},
              eventIds,
              teamId: activeTeamId ?? undefined,
            })
          }
          loading={createCrisis.isPending}
          disabled={!canSubmit}
        >
          {t("confirmCreate")}
        </Button>
      </Group>
    </Modal>
  );
}
