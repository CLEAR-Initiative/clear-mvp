"use client";

import { useRouter } from "next/navigation";
import { Button, Menu, Text, Group, Loader } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconLayoutGridAdd, IconChevronDown, IconPlus } from "@tabler/icons-react";
import { api } from "~/trpc/react";

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
 * Dropdown that lets users link an event to a crisis (Situation):
 *   - "Create new Crisis" creates a situation seeded with the event's
 *     severity. Title, summary and needs are left to the pipeline.
 *   - Existing situations call addEventToSituation directly.
 */
export function AddToCrisisButton({
  eventId,
  defaultSeverity = 3,
}: AddToCrisisButtonProps) {
  const router = useRouter();
  const utils = api.useUtils();

  const situationsQuery = api.situations.list.useQuery();

  const addEvent = api.situations.addEvent.useMutation({
    onSuccess: async (_data, vars) => {
      notifications.show({
        color: "teal",
        title: "Event linked",
        message: "Added to the situation.",
      });
      await utils.situations.list.invalidate();
      await utils.situations.get.invalidate({ id: vars.situationId });
    },
    onError: (err) => {
      notifications.show({
        color: "red",
        title: "Could not link event",
        message: err.message,
      });
    },
  });

  const createSituation = api.situations.createFromEvents.useMutation({
    onSuccess: async (situation) => {
      notifications.show({
        color: "teal",
        title: "Crisis created",
        message: "Pipeline will generate the title and summary shortly.",
      });
      await utils.situations.list.invalidate();
      router.push(`/crisis/${situation.id}`);
    },
    onError: (err) => {
      notifications.show({
        color: "red",
        title: "Could not create crisis",
        message: err.message,
      });
    },
  });

  const pending = addEvent.isPending || createSituation.isPending;

  return (
    <Menu position="bottom-end" width={260} disabled={pending}>
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
          Add to Crisis
        </Button>
      </Menu.Target>

      <Menu.Dropdown>
        <Menu.Item
          leftSection={<IconPlus size={14} />}
          onClick={() =>
            createSituation.mutate({
              severity: clampSeverity(defaultSeverity),
              needs: [],
              eventIds: [eventId],
            })
          }
        >
          Create new Crisis
        </Menu.Item>

        <Menu.Divider />

        {situationsQuery.isLoading && (
          <Menu.Item disabled closeMenuOnClick={false}>
            <Group gap={8}>
              <Loader size={12} />
              <Text size="xs" c="var(--color-text-muted)">
                Loading crises...
              </Text>
            </Group>
          </Menu.Item>
        )}

        {situationsQuery.data && situationsQuery.data.length === 0 && (
          <Menu.Item disabled>
            <Text size="xs" c="var(--color-text-muted)">
              No existing crises yet.
            </Text>
          </Menu.Item>
        )}

        {(situationsQuery.data ?? []).map((s) => (
          <Menu.Item
            key={s.id}
            onClick={() => addEvent.mutate({ situationId: s.id, eventId })}
          >
            <Group justify="space-between" wrap="nowrap">
              <Text size="sm" truncate style={{ flex: 1 }}>
                {s.title ?? "Untitled crisis"}
              </Text>
              <Text size="xs" c="var(--color-text-muted)" style={{ flexShrink: 0 }}>
                {s.events.length} event{s.events.length !== 1 ? "s" : ""}
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
