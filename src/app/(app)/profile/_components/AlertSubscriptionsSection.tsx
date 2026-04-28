"use client";

import { useState } from "react";
import {
  Card, Text, Group, Stack, Box, Button, Badge,
  MultiSelect, Select, ActionIcon, Loader, Divider,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconBellRinging, IconPlus, IconTrash, IconCheck, IconPlayerPause, IconPlayerPlay } from "@tabler/icons-react";
import { api } from "~/trpc/react";
import { DisasterTypePicker, expandSelectionsToCodes } from "~/components/disaster-type-picker";
import { getDisasterPills } from "~/lib/disaster-types";

const SEVERITY_LABELS: Record<number, string> = {
  1: "All severities",
  2: "Low+",
  3: "Medium+",
  4: "High+",
  5: "Critical only",
};

const FREQUENCY_LABELS: Record<string, string> = {
  immediately: "Immediately",
  daily:       "Daily digest",
  weekly:      "Weekly digest",
  monthly:     "Monthly digest",
};

const LEVEL_GROUP: Record<number, string> = { 0: "Country", 1: "State", 2: "District" };

export function AlertSubscriptionsSection() {
  const utils = api.useUtils();
  const subsQuery = api.subscriptions.list.useQuery();
  const hierarchyQuery = api.alerts.getDisasterTypeHierarchy.useQuery(undefined, {
    staleTime: Infinity, refetchOnWindowFocus: false,
  });
  const locationsQuery = api.subscriptions.locations.useQuery();

  const [showForm, setShowForm] = useState(false);
  const [formLocationIds, setFormLocationIds] = useState<string[]>([]);
  const [formAlertTypes, setFormAlertTypes] = useState<string[]>([]);
  const [formFrequency, setFormFrequency] = useState<string | null>("immediately");
  const [formMinSeverity, setFormMinSeverity] = useState<string>("4");
  const [deletingGroup, setDeletingGroup] = useState<string | null>(null);
  const [togglingGroup, setTogglingGroup] = useState<string | null>(null);

  const subscribeBatchMutation = api.subscriptions.subscribeBatch.useMutation();
  const unsubscribeMutation = api.subscriptions.unsubscribe.useMutation();
  const toggleMutation = api.subscriptions.update.useMutation();

  const subscriptions = subsQuery.data ?? [];
  const hierarchy = hierarchyQuery.data ?? [];
  const locations = locationsQuery.data ?? [];

  const locationOptions = [0, 1, 2].flatMap((level) => {
    const items = locations
      .filter((l) => l.level === level)
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((l) => ({ value: l.id, label: l.name }));
    return items.length > 0 ? [{ group: LEVEL_GROUP[level]!, items }] : [];
  });

  // Group subscriptions by (locationId, frequency, minSeverity) - each group = one card
  const groups = Object.values(
    subscriptions.reduce<Record<string, { key: string; locationId: string; locationName: string; locationLevel: number; frequency: string; minSeverity: number; active: boolean; ids: string[]; types: string[] }>>(
      (acc, sub) => {
        const key = `${sub.location.id}::${sub.frequency}::${sub.minSeverity ?? 1}`;
        if (!acc[key]) {
          acc[key] = {
            key,
            locationId: sub.location.id,
            locationName: sub.location.name,
            locationLevel: sub.location.level,
            frequency: sub.frequency,
            minSeverity: sub.minSeverity ?? 1,
            active: sub.active,
            ids: [],
            types: [],
          };
        }
        acc[key].ids.push(sub.id);
        acc[key].types.push(sub.alertType);
        if (sub.active) acc[key].active = true;
        return acc;
      },
      {},
    ),
  );

  async function handleSubscribe() {
    if (formLocationIds.length === 0 || !formFrequency) return;
    const resolvedTypes = formAlertTypes.length > 0
      ? expandSelectionsToCodes(formAlertTypes, hierarchy)
      : hierarchy.flatMap((h) => h.groups.flatMap((g) => g.codes));

    const typesToCreate = resolvedTypes.length > 0 ? resolvedTypes : ["ot"];

    try {
      for (const locationId of formLocationIds) {
        await subscribeBatchMutation.mutateAsync({
          locationIds: [locationId],
          alertTypes: typesToCreate,
          channel: "email" as const,
          frequency: formFrequency as "immediately" | "daily" | "weekly" | "monthly",
          minSeverity: parseInt(formMinSeverity),
        });
      }
      notifications.show({ title: "Subscribed", message: "Alert subscriptions created.", color: "green" });
      void utils.subscriptions.list.invalidate();
      setShowForm(false);
      setFormLocationIds([]);
      setFormAlertTypes([]);
      setFormMinSeverity("4");
    } catch (err: unknown) {
      notifications.show({ title: "Error", message: err instanceof Error ? err.message : "Failed", color: "red" });
    }
  }

  async function handleDeleteGroup(ids: string[]) {
    const key = ids[0] ?? "";
    setDeletingGroup(key);
    try {
      for (const id of ids) {
        await unsubscribeMutation.mutateAsync({ id });
      }
      void utils.subscriptions.list.invalidate();
    } finally {
      setDeletingGroup(null);
    }
  }

  async function handleToggleGroup(ids: string[], currentActive: boolean) {
    const key = ids[0] ?? "";
    setTogglingGroup(key);
    try {
      for (const id of ids) {
        await toggleMutation.mutateAsync({ id, active: !currentActive });
      }
      void utils.subscriptions.list.invalidate();
    } finally {
      setTogglingGroup(null);
    }
  }

  return (
    <Card p="lg" mb={16} style={{ border: "1px solid #E5E5E5" }}>
      <Group gap={8} mb={16} justify="space-between">
        <Group gap={8}>
          <IconBellRinging size={18} color="#E85D3D" />
          <Text fw={700} size="sm" tt="uppercase" style={{ letterSpacing: "0.05em", fontSize: 11 }}>
            Alert Subscriptions
          </Text>
          {groups.length > 0 && (
            <Badge size="xs" color="teal" variant="light">{groups.length}</Badge>
          )}
        </Group>
        {!showForm && (
          <Button
            size="xs"
            variant="light"
            color="dark"
            leftSection={<IconPlus size={12} />}
            onClick={() => setShowForm(true)}
          >
            Add
          </Button>
        )}
      </Group>

      {/* New subscription form */}
      {showForm && (
        <Card p="sm" mb={16} style={{ background: "#F9FAFB", border: "1px solid #E5E5E5" }}>
          <Text size="xs" fw={600} mb={12} tt="uppercase" style={{ letterSpacing: "0.05em", fontSize: 10 }}>
            New Subscription
          </Text>
          <Stack gap={10}>
            <MultiSelect
              label="Location"
              placeholder="Select one or more locations"
              data={locationOptions}
              value={formLocationIds}
              onChange={setFormLocationIds}
              searchable
              size="xs"
              maxDropdownHeight={200}
              styles={{ groupLabel: { paddingTop: 12, paddingBottom: 4 } }}
            />
            <DisasterTypePicker
              label="Alert Types (leave empty for all)"
              hierarchy={hierarchy}
              selected={formAlertTypes}
              onChange={setFormAlertTypes}
            />
            <Select
              label="Minimum Severity"
              data={[
                { value: "1", label: "All (Minimal and above)" },
                { value: "2", label: "Low and above" },
                { value: "3", label: "Medium and above" },
                { value: "4", label: "High and above" },
                { value: "5", label: "Critical only" },
              ]}
              value={formMinSeverity}
              onChange={(v) => v && setFormMinSeverity(v)}
              size="xs"
            />
            <Select
              label="Frequency"
              data={[
                { value: "immediately", label: "Immediately" },
                { value: "daily",       label: "Daily digest" },
                { value: "weekly",      label: "Weekly digest" },
                { value: "monthly",     label: "Monthly digest" },
              ]}
              value={formFrequency}
              onChange={setFormFrequency}
              size="xs"
            />
            <Group gap={8} justify="flex-end" mt={4}>
              <Button size="xs" variant="subtle" color="gray" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
              <Button
                size="xs"
                color="dark"
                leftSection={<IconCheck size={12} />}
                loading={subscribeBatchMutation.isPending}
                disabled={formLocationIds.length === 0}
                onClick={() => void handleSubscribe()}
              >
                Subscribe
              </Button>
            </Group>
          </Stack>
        </Card>
      )}

      {/* Subscription cards */}
      {subsQuery.isLoading ? (
        <Box py={16} style={{ textAlign: "center" }}><Loader size={16} /></Box>
      ) : groups.length === 0 ? (
        <Text size="sm" c="#737373">
          No alert subscriptions yet. Click &quot;Add&quot; to get started.
        </Text>
      ) : (
        <Stack gap={8}>
          {groups.map((group) => {
            const pills = getDisasterPills(group.types);
            const typeLabel = pills.length === 0
              ? "All types"
              : pills.length <= 3
              ? pills.map((p) => p.label).join(", ")
              : `${pills.slice(0, 2).map((p) => p.label).join(", ")} +${pills.length - 2} more`;

            const isDeleting = deletingGroup === group.ids[0];
            const isToggling = togglingGroup === group.ids[0];

            return (
              <Box
                key={group.key}
                p={12}
                style={{
                  border: "1px solid #E5E5E5",
                  background: group.active ? "#fff" : "#F9FAFB",
                  opacity: group.active ? 1 : 0.65,
                }}
              >
                <Group justify="space-between" wrap="nowrap">
                  <Box style={{ flex: 1, minWidth: 0 }}>
                    <Group gap={6} mb={4}>
                      <Text fw={600} size="sm" c="#171717" truncate="end">
                        {group.locationName}
                      </Text>
                      <Badge size="xs" variant="light" color="gray" style={{ fontSize: 9, textTransform: "uppercase" }}>
                        {["Country", "State", "District"][group.locationLevel] ?? ""}
                      </Badge>
                    </Group>
                    <Group gap={6}>
                      <Text size="xs" c="#737373">{typeLabel}</Text>
                      <Divider orientation="vertical" />
                      <Text size="xs" c="#737373">{SEVERITY_LABELS[group.minSeverity] ?? `Severity ${group.minSeverity}+`}</Text>
                      <Divider orientation="vertical" />
                      <Text size="xs" c="#737373">{FREQUENCY_LABELS[group.frequency] ?? group.frequency}</Text>
                    </Group>
                  </Box>
                  <Group gap={4} wrap="nowrap">
                    <ActionIcon
                      size="sm"
                      variant="subtle"
                      color={group.active ? "gray" : "teal"}
                      loading={isToggling}
                      title={group.active ? "Pause" : "Resume"}
                      onClick={() => void handleToggleGroup(group.ids, group.active)}
                    >
                      {group.active
                        ? <IconPlayerPause size={13} />
                        : <IconPlayerPlay size={13} />}
                    </ActionIcon>
                    <ActionIcon
                      size="sm"
                      variant="subtle"
                      color="red"
                      loading={isDeleting}
                      title="Delete subscription"
                      onClick={() => void handleDeleteGroup(group.ids)}
                    >
                      <IconTrash size={13} />
                    </ActionIcon>
                  </Group>
                </Group>
              </Box>
            );
          })}
        </Stack>
      )}
    </Card>
  );
}
