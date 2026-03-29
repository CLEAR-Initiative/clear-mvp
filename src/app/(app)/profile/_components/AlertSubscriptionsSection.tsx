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
  Select,
  ActionIcon,
  Loader,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconBellRinging, IconPlus, IconTrash, IconCheck } from "@tabler/icons-react";
import { api } from "~/trpc/react";

const FREQUENCY_LABELS: Record<string, string> = {
  immediately: "Immediately",
  daily: "Daily digest",
  weekly: "Weekly digest",
  monthly: "Monthly digest",
};

const CHANNEL_LABELS: Record<string, string> = {
  email: "Email",
  sms: "SMS",
};

export function AlertSubscriptionsSection() {
  const utils = api.useUtils();
  const subsQuery = api.subscriptions.list.useQuery();
  const disasterTypesQuery = api.subscriptions.disasterTypes.useQuery();
  const locationsQuery = api.subscriptions.locations.useQuery();

  const [showForm, setShowForm] = useState(false);
  const [formLocationId, setFormLocationId] = useState<string | null>(null);
  const [formAlertType, setFormAlertType] = useState<string | null>(null);
  const [formChannel, setFormChannel] = useState<string | null>("email");
  const [formFrequency, setFormFrequency] = useState<string | null>("immediately");

  const subscribeMutation = api.subscriptions.subscribe.useMutation({
    onSuccess: () => {
      notifications.show({ title: "Subscribed", message: "Alert subscription created.", color: "green" });
      void utils.subscriptions.list.invalidate();
      setShowForm(false);
      setFormLocationId(null);
      setFormAlertType(null);
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

  const locationOptions = locations
    .filter((l) => l.level <= 2) // country, state, district
    .sort((a, b) => a.level - b.level || a.name.localeCompare(b.name))
    .map((l) => ({
      value: l.id,
      label: `${"  ".repeat(l.level)}${l.name}`,
    }));

  const alertTypeOptions = disasterTypes.map((dt) => ({
    value: dt.glideNumber,
    label: `${dt.disasterType} (${dt.glideNumber.toUpperCase()})`,
  }));

  const handleSubscribe = () => {
    if (!formLocationId || !formAlertType || !formChannel || !formFrequency) return;
    subscribeMutation.mutate({
      locationId: formLocationId,
      alertType: formAlertType,
      channel: formChannel as "email" | "sms",
      frequency: formFrequency as "immediately" | "daily" | "weekly" | "monthly",
    });
  };

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
            <Select
              label="Location"
              placeholder="Select location"
              data={locationOptions}
              value={formLocationId}
              onChange={setFormLocationId}
              searchable
              size="xs"
            />
            <Select
              label="Alert Type"
              placeholder="Select disaster type"
              data={alertTypeOptions}
              value={formAlertType}
              onChange={setFormAlertType}
              searchable
              size="xs"
            />
            <Group grow>
              <Select
                label="Channel"
                data={[
                  { value: "email", label: "Email" },
                  { value: "sms", label: "SMS" },
                ]}
                value={formChannel}
                onChange={setFormChannel}
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
            </Group>
            <Group gap={8} justify="flex-end">
              <Button size="xs" variant="subtle" color="gray" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
              <Button
                size="xs"
                color="dark"
                leftSection={<IconCheck size={12} />}
                loading={subscribeMutation.isPending}
                disabled={!formLocationId || !formAlertType}
                onClick={handleSubscribe}
              >
                Subscribe
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
        <Stack gap={8}>
          {subscriptions.map((sub) => (
            <Group
              key={sub.id}
              justify="space-between"
              p={8}
              style={{
                border: "1px solid #E5E5E5",
                background: sub.active ? "#fff" : "#F5F5F5",
                opacity: sub.active ? 1 : 0.6,
              }}
            >
              <Box>
                <Group gap={6}>
                  <Text size="sm" fw={500}>{sub.location.name}</Text>
                  <Badge size="xs" variant="light" color="blue">{sub.alertType.toUpperCase()}</Badge>
                </Group>
                <Text size="xs" c="#737373">
                  {CHANNEL_LABELS[sub.channel] ?? sub.channel} · {FREQUENCY_LABELS[sub.frequency] ?? sub.frequency}
                </Text>
              </Box>
              <Group gap={4}>
                <Button
                  size="xs"
                  variant="subtle"
                  color={sub.active ? "gray" : "teal"}
                  onClick={() => toggleMutation.mutate({ id: sub.id, active: !sub.active })}
                >
                  {sub.active ? "Pause" : "Resume"}
                </Button>
                <ActionIcon
                  size="sm"
                  variant="subtle"
                  color="red"
                  onClick={() => unsubscribeMutation.mutate({ id: sub.id })}
                >
                  <IconTrash size={14} />
                </ActionIcon>
              </Group>
            </Group>
          ))}
        </Stack>
      )}
    </Card>
  );
}
