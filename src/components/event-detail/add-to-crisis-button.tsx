"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button, Menu, Text, Group, Loader } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconLayoutGridAdd, IconChevronDown, IconPlus } from "@tabler/icons-react";
import { api } from "~/trpc/react";
import { useTeam } from "~/providers/team-provider";

interface AddToCrisisButtonProps {
  eventId: string;
  /**
   * Event severity on the 1-5 scale. Used as the severity seed for a newly
   * created crisis since the mutation requires it. The pipeline will refine
   * title, summary and needs afterwards.
   */
  defaultSeverity?: number;
}

/**
 * Dropdown that lets users link an event to a crisis:
 *   - "Create new Crisis" creates a crisis seeded with the event's severity.
 *     Title, summary and needs are left to the pipeline.
 *   - Existing crises call addEventToCrisis directly.
 */
export function AddToCrisisButton({
  eventId,
  defaultSeverity = 3,
}: AddToCrisisButtonProps) {
  const t = useTranslations("eventDetail");
  const router = useRouter();
  const utils = api.useUtils();
  const { activeTeamId } = useTeam();
  const [menuOpened, setMenuOpened] = useState(false);

  // Lazy + slim — only fetch when the dropdown opens.
  const crisesQuery = api.crises.listMenu.useQuery(undefined, {
    enabled: menuOpened,
  });

  const addEvent = api.crises.addEvent.useMutation({
    onSuccess: (_data, vars) => {
      notifications.show({
        color: "teal",
        title: t("addToCrisis.linkedTitle"),
        message: t("addToCrisis.linkedMessage"),
      });
      void Promise.all([
        utils.crises.list.invalidate(),
        utils.crises.listMenu.invalidate(),
        utils.crises.get.invalidate({ id: vars.crisisId }),
      ]);
    },
    onError: (err) => {
      notifications.show({
        color: "red",
        title: t("addToCrisis.linkErrorTitle"),
        message: err.message,
      });
    },
  });

  const createCrisis = api.crises.createFromEvents.useMutation({
    onSuccess: (crisis) => {
      notifications.show({
        color: "teal",
        title: t("addToCrisis.createdTitle"),
        message: t("addToCrisis.createdMessage"),
      });
      // Seed slim enrichment status so the crisis page can show the
      // preparing screen without a fat get round-trip first.
      utils.crises.enrichmentStatus.setData(
        { id: crisis.id },
        {
          id: crisis.id,
          title: crisis.title,
          summary: crisis.summary,
          scenarios: crisis.scenarios,
        },
      );
      void utils.crises.list.invalidate();
      void utils.crises.listMenu.invalidate();
      router.push(`/crisis/${crisis.id}`);
    },
    onError: (err) => {
      notifications.show({
        color: "red",
        title: t("addToCrisis.createErrorTitle"),
        message: err.message,
      });
    },
  });

  const pending = addEvent.isPending || createCrisis.isPending;

  return (
    <Menu
      position="bottom-end"
      width={260}
      disabled={pending}
      opened={menuOpened}
      onChange={setMenuOpened}
    >
      <Menu.Target>
        <Button
          variant="light"
          color="gray"
          size="xs"
          leftSection={<IconLayoutGridAdd size={12} />}
          rightSection={<IconChevronDown size={12} />}
          fullWidth
          loading={pending}
          style={{ fontSize: 12 }}
        >
          {t("addToCrisis.button")}
        </Button>
      </Menu.Target>

      <Menu.Dropdown>
        <Menu.Item
          leftSection={<IconPlus size={14} />}
          onClick={() =>
            createCrisis.mutate({
              severity: clampSeverity(defaultSeverity),
              needs: {},
              eventIds: [eventId],
              // Backend admits team_admin / field_coordinator on this
              // team even without a global admin/analyst role. No-op for
              // platform callers.
              teamId: activeTeamId ?? undefined,
            })
          }
        >
          {t("addToCrisis.createNew")}
        </Menu.Item>

        <Menu.Divider />

        {crisesQuery.isLoading && (
          <Menu.Item disabled closeMenuOnClick={false}>
            <Group gap={8}>
              <Loader size={12} />
              <Text size="xs" c="var(--color-text-muted)">
                {t("addToCrisis.loading")}
              </Text>
            </Group>
          </Menu.Item>
        )}

        {crisesQuery.data && crisesQuery.data.length === 0 && (
          <Menu.Item disabled>
            <Text size="xs" c="var(--color-text-muted)">
              {t("addToCrisis.empty")}
            </Text>
          </Menu.Item>
        )}

        {(crisesQuery.data ?? []).map((s) => (
          <Menu.Item
            key={s.id}
            onClick={() => addEvent.mutate({ crisisId: s.id, eventId })}
          >
            <Group justify="space-between" wrap="nowrap">
              <Text size="sm" truncate style={{ flex: 1 }}>
                {s.title ?? t("addToCrisis.untitledCrisis")}
              </Text>
              <Text size="xs" c="var(--color-text-muted)" style={{ flexShrink: 0 }}>
                {t("addToCrisis.eventCount", { count: s.events.length })}
              </Text>
            </Group>
          </Menu.Item>
        ))}
      </Menu.Dropdown>
    </Menu>
  );
}

/** The backend severity is a Float but effectively 1-5 across the platform. */
function clampSeverity(n: number): number {
  if (!Number.isFinite(n)) return 3;
  return Math.min(5, Math.max(1, n));
}
