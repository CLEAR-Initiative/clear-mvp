"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button, Group, Menu, Text, Loader } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconBellRinging, IconLayoutGridAdd, IconPlus, IconX } from "@tabler/icons-react";
import { api } from "~/trpc/react";
import { canWriteCrisisEvents } from "~/lib/roles";
import { CreateCrisisModal } from "~/components/crisis/create-crisis-modal";
import { CreateAlertModal } from "./create-alert-modal";

interface EventBulkBarProps {
  selectedIds: string[];
  suggestedTitle: string;
  defaultSeverity: number;
  onClear: () => void;
}

export function EventBulkBar({
  selectedIds,
  suggestedTitle,
  defaultSeverity,
  onClear,
}: EventBulkBarProps) {
  const t = useTranslations("detection.bulk");
  const tCrisis = useTranslations("eventDetail.addToCrisis");
  const utils = api.useUtils();
  const { data: authData } = api.auth.me.useQuery(undefined, { staleTime: 60_000 });
  // Raise Alert + Add to existing crisis are requireRole(admin|analyst)
  // on clear-api. Create Crisis is wider (team writers via teamId) so
  // it stays visible even when this is false.
  const canAddToCrisis = canWriteCrisisEvents(authData?.user?.role);
  const [menuOpened, setMenuOpened] = useState(false);
  const [createOpened, setCreateOpened] = useState(false);
  const [alertOpened, setAlertOpened] = useState(false);

  const crisesQuery = api.crises.listMenu.useQuery(undefined, {
    enabled: menuOpened,
  });

  const addEvent = api.crises.addEvent.useMutation();

  async function addSelectedToCrisis(crisisId: string) {
    try {
      for (const eventId of selectedIds) {
        await addEvent.mutateAsync({ crisisId, eventId });
      }
      notifications.show({
        color: "teal",
        title: tCrisis("linkedTitle"),
        message: t("linkedBulk", { count: selectedIds.length }),
      });
      void Promise.all([
        utils.crises.list.invalidate(),
        utils.crises.listMenu.invalidate(),
        utils.crises.get.invalidate({ id: crisisId }),
      ]);
      onClear();
    } catch (err) {
      notifications.show({
        color: "red",
        title: tCrisis("linkErrorTitle"),
        message: err instanceof Error ? err.message : tCrisis("linkErrorTitle"),
      });
    }
  }

  if (selectedIds.length === 0) return null;

  return (
    <>
      <Group
        gap={8}
        mb={12}
        px={12}
        py={8}
        justify="space-between"
        wrap="wrap"
        data-testid="event-bulk-bar"
        style={{
          background: "var(--color-accent-light)",
          border: "1px solid var(--color-accent)",
          borderRadius: 6,
        }}
      >
        <Text size="sm" fw={600} c="var(--color-accent)">
          {t("selected", { count: selectedIds.length })}
        </Text>
        <Group gap={8}>
          <Button
            size="xs"
            variant="subtle"
            color="gray"
            leftSection={<IconX size={12} />}
            onClick={onClear}
          >
            {t("clear")}
          </Button>
          {canAddToCrisis && (
            <Button
              size="xs"
              variant="light"
              color="red"
              leftSection={<IconBellRinging size={12} />}
              onClick={() => setAlertOpened(true)}
              data-testid="bulk-raise-alert"
            >
              {t("raiseAlert")}
            </Button>
          )}
          {canAddToCrisis && (
          <Menu
            position="bottom-end"
            width={260}
            opened={menuOpened}
            onChange={setMenuOpened}
            disabled={addEvent.isPending}
          >
            <Menu.Target>
              <Button
                size="xs"
                variant="light"
                color="gray"
                leftSection={<IconLayoutGridAdd size={12} />}
                loading={addEvent.isPending}
              >
                {t("addToCrisis")}
              </Button>
            </Menu.Target>
            <Menu.Dropdown>
              {crisesQuery.isLoading && (
                <Menu.Item disabled closeMenuOnClick={false}>
                  <Group gap={8}>
                    <Loader size={12} />
                    <Text size="xs" c="var(--color-text-muted)">
                      {tCrisis("loading")}
                    </Text>
                  </Group>
                </Menu.Item>
              )}
              {crisesQuery.data && crisesQuery.data.length === 0 && (
                <Menu.Item disabled>
                  <Text size="xs" c="var(--color-text-muted)">
                    {tCrisis("empty")}
                  </Text>
                </Menu.Item>
              )}
              {(crisesQuery.data ?? []).map((s) => (
                <Menu.Item
                  key={s.id}
                  onClick={() => void addSelectedToCrisis(s.id)}
                >
                  <Group justify="space-between" wrap="nowrap">
                    <Text size="sm" truncate style={{ flex: 1 }}>
                      {s.title ?? tCrisis("untitledCrisis")}
                    </Text>
                    <Text size="xs" c="var(--color-text-muted)" style={{ flexShrink: 0 }}>
                      {tCrisis("eventCount", { count: s.events.length })}
                    </Text>
                  </Group>
                </Menu.Item>
              ))}
            </Menu.Dropdown>
          </Menu>
          )}
          <Button
            size="xs"
            leftSection={<IconPlus size={12} />}
            onClick={() => setCreateOpened(true)}
            style={{ background: "#E85D3D", borderColor: "#E85D3D" }}
          >
            {t("createCrisis")}
          </Button>
        </Group>
      </Group>

      <CreateCrisisModal
        opened={createOpened}
        onClose={() => setCreateOpened(false)}
        onCreated={onClear}
        eventIds={selectedIds}
        suggestedTitle={suggestedTitle}
        defaultSeverity={defaultSeverity}
        from="detection"
      />

      <CreateAlertModal
        opened={alertOpened}
        onClose={() => setAlertOpened(false)}
        onSuccess={onClear}
        eventIds={selectedIds}
        suggestedTitle={suggestedTitle}
        defaultSeverity={defaultSeverity}
      />
    </>
  );
}
