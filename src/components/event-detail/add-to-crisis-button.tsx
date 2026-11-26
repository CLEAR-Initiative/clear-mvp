"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button, Menu, Text, Group, Loader } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconLayoutGridAdd, IconChevronDown, IconPlus } from "@tabler/icons-react";
import { api } from "~/trpc/react";
import { CreateCrisisModal } from "~/components/crisis/create-crisis-modal";

interface AddToCrisisButtonProps {
  eventId: string;
  eventTitle?: string | null;
  /**
   * Event severity on the 1-5 scale. Used as the severity seed for a newly
   * created crisis since the mutation requires it.
   */
  defaultSeverity?: number;
}

/**
 * Dropdown that lets users link an event to a crisis:
 *   - "Create new Crisis" opens a name prompt, then createFromEvents.
 *   - Existing crises call addEventToCrisis directly.
 */
export function AddToCrisisButton({
  eventId,
  eventTitle,
  defaultSeverity = 3,
}: AddToCrisisButtonProps) {
  const t = useTranslations("eventDetail");
  const utils = api.useUtils();
  const [menuOpened, setMenuOpened] = useState(false);
  const [createOpened, setCreateOpened] = useState(false);

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

  const pending = addEvent.isPending;

  return (
    <>
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
            onClick={() => setCreateOpened(true)}
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

      <CreateCrisisModal
        opened={createOpened}
        onClose={() => setCreateOpened(false)}
        eventIds={[eventId]}
        suggestedTitle={eventTitle ?? ""}
        defaultSeverity={defaultSeverity}
        from="insights"
      />
    </>
  );
}
