"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Button,
  Menu,
  Modal,
  Stack,
  TextInput,
  Textarea,
  SegmentedControl,
  Text,
  Group,
  Loader,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
  IconLayoutGridAdd,
  IconChevronDown,
  IconPlus,
  IconAlertTriangle,
} from "@tabler/icons-react";
import { api } from "~/trpc/react";

interface AddToCrisisButtonProps {
  eventId: string;
  /** Current event severity on the 1-5 scale, used as the default for new situations. */
  defaultSeverity?: number;
  /** Optional label override for the title prefill. */
  defaultTitle?: string;
}

/**
 * Dropdown that lets users link an event to a crisis (Situation):
 *   - "Create new Crisis"  opens a small modal, then calls createSituationFromEvents
 *   - Existing situations are listed below, each calls addEventToSituation
 */
export function AddToCrisisButton({
  eventId,
  defaultSeverity = 3,
  defaultTitle = "",
}: AddToCrisisButtonProps) {
  const router = useRouter();
  const utils = api.useUtils();
  const [createOpen, setCreateOpen] = useState(false);

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
        message: `\"${situation.title ?? "Untitled"}\" created from this event.`,
      });
      await utils.situations.list.invalidate();
      setCreateOpen(false);
      router.push(`/situation/${situation.id}`);
    },
    onError: (err) => {
      notifications.show({
        color: "red",
        title: "Could not create crisis",
        message: err.message,
      });
    },
  });

  return (
    <>
      <Menu
        position="bottom-end"
        width={260}
        disabled={addEvent.isPending || createSituation.isPending}
      >
        <Menu.Target>
          <Button
            variant="light"
            color="gray"
            size="xs"
            leftSection={<IconLayoutGridAdd size={12} />}
            rightSection={<IconChevronDown size={12} />}
            fullWidth
            style={{ fontSize: 12 }}
          >
            Add to Crisis
          </Button>
        </Menu.Target>

        <Menu.Dropdown>
          <Menu.Item
            leftSection={<IconPlus size={14} />}
            onClick={() => setCreateOpen(true)}
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

      <CreateCrisisModal
        opened={createOpen}
        onClose={() => setCreateOpen(false)}
        defaultTitle={defaultTitle}
        defaultSeverity={defaultSeverity}
        submitting={createSituation.isPending}
        onSubmit={(input) =>
          createSituation.mutate({
            title: input.title || undefined,
            summary: input.summary || undefined,
            severity: input.severity,
            needs: [],
            eventIds: [eventId],
          })
        }
      />
    </>
  );
}

// ── Create crisis modal ──────────────────────────────────────────────────────

const SEVERITY_OPTIONS = [
  { label: "Low", value: "2" },
  { label: "Medium", value: "3" },
  { label: "High", value: "4" },
  { label: "Critical", value: "5" },
];

interface CreateCrisisModalProps {
  opened: boolean;
  onClose: () => void;
  defaultTitle: string;
  defaultSeverity: number;
  submitting: boolean;
  onSubmit: (input: { title: string; summary: string; severity: number }) => void;
}

function CreateCrisisModal({
  opened,
  onClose,
  defaultTitle,
  defaultSeverity,
  submitting,
  onSubmit,
}: CreateCrisisModalProps) {
  const [title, setTitle] = useState(defaultTitle);
  const [summary, setSummary] = useState("");
  const [severity, setSeverity] = useState(
    String(Math.min(5, Math.max(2, Math.round(defaultSeverity)))),
  );

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Group gap={8}>
          <IconAlertTriangle size={16} color="var(--color-accent)" />
          <Text fw={600}>Create new crisis</Text>
        </Group>
      }
      size="md"
      centered
    >
      <Stack gap={14}>
        <Text size="xs" c="var(--color-text-muted)">
          A crisis groups related events into a single situation. This event
          will be linked to the new crisis.
        </Text>

        <TextInput
          label="Title"
          placeholder="e.g. North Kordofan escalation"
          value={title}
          onChange={(e) => setTitle(e.currentTarget.value)}
          data-autofocus
        />

        <Textarea
          label="Short summary"
          placeholder="One or two sentences on what's happening..."
          value={summary}
          onChange={(e) => setSummary(e.currentTarget.value)}
          autosize
          minRows={2}
          maxRows={4}
        />

        <Stack gap={6}>
          <Text size="sm" fw={500}>
            Severity
          </Text>
          <SegmentedControl
            value={severity}
            onChange={setSeverity}
            data={SEVERITY_OPTIONS}
            fullWidth
          />
        </Stack>

        <Group justify="flex-end" gap={8} mt={4}>
          <Button variant="default" size="sm" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            size="sm"
            loading={submitting}
            onClick={() =>
              onSubmit({
                title: title.trim(),
                summary: summary.trim(),
                severity: Number(severity),
              })
            }
          >
            Create crisis
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
