"use client";

import { useState } from "react";
import {
  Card,
  Text,
  Group,
  Stack,
  Box,
  Button,
  Badge,
  MultiSelect,
  Select,
  ActionIcon,
  Loader,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconBellRinging, IconPlus, IconTrash, IconCheck } from "@tabler/icons-react";
import { api } from "~/trpc/react";
import { getDisasterLabel } from "~/lib/disaster-types";
import { severityLabels } from "~/lib/constants/severity";

const FREQUENCY_LABELS: Record<string, string> = {
  immediately: "Immediately",
  daily: "Daily digest",
  weekly: "Weekly digest",
  monthly: "Monthly digest",
};

export function AlertSubscriptionsSection() {
  const utils = api.useUtils();
  const subsQuery = api.subscriptions.list.useQuery();
  const disasterTypesQuery = api.subscriptions.disasterTypes.useQuery();
  const locationsQuery = api.subscriptions.locations.useQuery();

  const [showForm, setShowForm] = useState(false);
  const [formLocationIds, setFormLocationIds] = useState<string[]>([]);
  const [formAlertTypes, setFormAlertTypes] = useState<string[]>([]);
  const [formSeverities, setFormSeverities] = useState<string[]>(["critical", "high"]);
  const [formFrequency, setFormFrequency] = useState<string | null>("immediately");

  const subscribeMutation = api.subscriptions.subscribe.useMutation({
    onSuccess: () => {
      notifications.show({ title: "Subscribed", message: "Alert subscriptions created.", color: "green" });
      void utils.subscriptions.list.invalidate();
      setShowForm(false);
      setFormLocationIds([]);
      setFormAlertTypes([]);
      setFormSeverities(["critical", "high"]);
    },
    onError: (err) => {
      notifications.show({ title: "Error", message: err.message, color: "red" });
    },
  });

  const unsubscribeMutation = api.subscriptions.unsubscribe.useMutation({
    onSuccess: () => {
      notifications.show({ title: "Unsubscribed", message: "Subscription removed.", color: "gray" });
      void utils.subscriptions.list.invalidate();
    },
  });

  const toggleMutation = api.subscriptions.update.useMutation({
    onSuccess: () => {
      void utils.subscriptions.list.invalidate();
    },
  });

  const subscriptions = subsQuery.data ?? [];
  const disasterTypes = disasterTypesQuery.data ?? [];
  const locations = locationsQuery.data ?? [];

  const LEVEL_GROUP: Record<number, string> = {
    0: "Country",
    1: "State",
    2: "District",
  };

  const locationOptions = [0, 1, 2].flatMap((level) => {
    const items = locations
      .filter((l) => l.level === level)
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((l) => ({ value: l.id, label: l.name }));
    return items.length > 0 ? [{ group: LEVEL_GROUP[level]!, items }] : [];
  });

  const alertTypeOptions = [
    { value: "__all__", label: "All Types" },
    ...disasterTypes.map((dt) => ({
      value: dt.glideNumber,
      label: `${getDisasterLabel(dt.glideNumber)} (${dt.glideNumber.toUpperCase()})`,
    })),
  ];

  const handleSubscribe = async () => {
    if (formLocationIds.length === 0 || formAlertTypes.length === 0 || !formFrequency) return;

    const resolvedTypes = formAlertTypes.includes("__all__")
      ? disasterTypes.map((dt) => dt.glideNumber)
      : formAlertTypes;

    for (const locationId of formLocationIds) {
      for (const alertType of resolvedTypes) {
        try {
          await subscribeMutation.mutateAsync({
            locationId,
            alertType,
            severity: formSeverities.length > 0 ? formSeverities : undefined,
            channel: "email" as const,
            frequency: formFrequency as "immediately" | "daily" | "weekly" | "monthly",
          });
        } catch {
          // Error already shown by onError handler
        }
      }
    }
  };

  // Group subscriptions by location for display
  const groupedByLocation = subscriptions.reduce<Record<string, typeof subscriptions>>((acc, sub) => {
    const locName = sub.location.name;
    if (!acc[locName]) acc[locName] = [];
    acc[locName].push(sub);
    return acc;
  }, {});

  return (
    <Card p="lg" mb={16} style={{ border: "1px solid #E5E5E5" }}>
      <Group gap={8} mb={16} justify="space-between">
        <Group gap={8}>
          <IconBellRinging size={18} color="#E85D3D" />
          <Text fw={700} size="sm" tt="uppercase" style={{ letterSpacing: "0.05em", fontSize: 11 }}>
            Alert Subscriptions
          </Text>
          {subscriptions.length > 0 && (
            <Badge size="xs" color="teal" variant="light">{subscriptions.length}</Badge>
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
          <Text size="xs" fw={600} mb={8} tt="uppercase" style={{ letterSpacing: "0.05em", fontSize: 10 }}>
            New Subscription
          </Text>
          <Stack gap={8}>
            <MultiSelect
              label="Locations"
              placeholder="Select one or more locations"
              data={locationOptions}
              value={formLocationIds}
              onChange={setFormLocationIds}
              searchable
              size="xs"
              maxDropdownHeight={200}
              styles={{ groupLabel: { paddingTop: 12, paddingBottom: 4 } }}
            />
            <MultiSelect
              label="Alert Types"
              placeholder="Select one or more disaster types"
              data={alertTypeOptions}
              value={formAlertTypes}
              onChange={setFormAlertTypes}
              searchable
              size="xs"
              maxDropdownHeight={200}
            />
            <MultiSelect
              label="Minimum Severity"
              placeholder="Select severity levels"
              data={[
                { value: "critical", label: severityLabels.critical! },
                { value: "high", label: severityLabels.high! },
                { value: "medium", label: severityLabels.medium! },
                { value: "low", label: severityLabels.low! },
              ]}
              value={formSeverities}
              onChange={setFormSeverities}
              size="xs"
            />
            <Select
              label="Frequency"
              data={[
                { value: "immediately", label: "Immediately" },
                { value: "daily", label: "Daily digest" },
                { value: "weekly", label: "Weekly digest" },
                { value: "monthly", label: "Monthly digest" },
              ]}
              value={formFrequency}
              onChange={setFormFrequency}
              size="xs"
            />
            <Group gap={8} justify="flex-end">
              <Button size="xs" variant="subtle" color="gray" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
              <Button
                size="xs"
                color="dark"
                leftSection={<IconCheck size={12} />}
                loading={subscribeMutation.isPending}
                disabled={formLocationIds.length === 0 || formAlertTypes.length === 0}
                onClick={() => void handleSubscribe()}
              >
                Subscribe ({formLocationIds.length} × {formAlertTypes.length})
              </Button>
            </Group>
          </Stack>
        </Card>
      )}

      {/* Subscription list */}
      {subsQuery.isLoading ? (
        <Box py={16} style={{ textAlign: "center" }}>
          <Loader size={16} />
        </Box>
      ) : subscriptions.length === 0 ? (
        <Text size="sm" c="#737373">
          No alert subscriptions yet. Click &quot;Add&quot; to subscribe to alerts for specific locations and types.
        </Text>
      ) : (
        <Stack gap={12}>
          {Object.entries(groupedByLocation).map(([locName, subs]) => (
            <Box key={locName}>
              <Text size="xs" fw={600} c="#525252" mb={4}>{locName}</Text>
              <Stack gap={4}>
                {subs.map((sub) => (
                  <Group
                    key={sub.id}
                    justify="space-between"
                    px={8}
                    py={6}
                    style={{
                      border: "1px solid #E5E5E5",
                      background: sub.active ? "#fff" : "#F5F5F5",
                      opacity: sub.active ? 1 : 0.6,
                    }}
                  >
                    <Group gap={6}>
                      <Badge size="xs" variant="light" color="blue">{sub.alertType.toUpperCase()}</Badge>
                      <Text size="xs" c="#737373">
                        {FREQUENCY_LABELS[sub.frequency] ?? sub.frequency}
                      </Text>
                    </Group>
                    <Group gap={4}>
                      <Button
                        size="compact-xs"
                        variant="subtle"
                        color={sub.active ? "gray" : "teal"}
                        onClick={() => toggleMutation.mutate({ id: sub.id, active: !sub.active })}
                        style={{ fontSize: 10 }}
                      >
                        {sub.active ? "Pause" : "Resume"}
                      </Button>
                      <ActionIcon
                        size="xs"
                        variant="subtle"
                        color="red"
                        onClick={() => unsubscribeMutation.mutate({ id: sub.id })}
                      >
                        <IconTrash size={12} />
                      </ActionIcon>
                    </Group>
                  </Group>
                ))}
              </Stack>
            </Box>
          ))}
        </Stack>
      )}
    </Card>
  );
}
