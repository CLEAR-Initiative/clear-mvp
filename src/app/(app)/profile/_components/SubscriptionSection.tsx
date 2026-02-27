"use client";

import { useState } from "react";
import {
  Card,
  Text,
  Group,
  Badge,
  Button,
  Stack,
  Box,
  Switch,
  ActionIcon,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
  IconBellPlus,
  IconMail,
  IconPhone,
  IconPencil,
  IconTrash,
} from "@tabler/icons-react";
import { api } from "~/trpc/react";
import type { DjangoSubscription } from "~/lib/types/django";
import { SubscriptionFormModal } from "./SubscriptionFormModal";

interface SubscriptionSectionProps {
  hasMobileNumber: boolean;
  smsEnabled: boolean;
}

const frequencyLabel: Record<string, string> = {
  immediate: "Immediate",
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
};

export function SubscriptionSection({
  hasMobileNumber,
  smsEnabled,
}: SubscriptionSectionProps) {
  const [modalOpened, setModalOpened] = useState(false);
  const [editingSub, setEditingSub] = useState<DjangoSubscription | null>(null);

  const { data, isLoading, isError, error } = api.subscriptions.list.useQuery();
  const utils = api.useUtils();

  const deleteMutation = api.subscriptions.delete.useMutation({
    onSuccess: () => {
      notifications.show({
        title: "Deleted",
        message: "Subscription removed.",
        color: "green",
      });
      void utils.subscriptions.list.invalidate();
    },
    onError: (err) => {
      notifications.show({
        title: "Error",
        message: err.message,
        color: "red",
      });
    },
  });

  const toggleMutation = api.subscriptions.update.useMutation({
    onSuccess: () => {
      void utils.subscriptions.list.invalidate();
    },
  });

  const subscriptions = data?.subscriptions ?? [];

  const handleEdit = (sub: DjangoSubscription) => {
    setEditingSub(sub);
    setModalOpened(true);
  };

  const handleCreate = () => {
    setEditingSub(null);
    setModalOpened(true);
  };

  const handleToggle = (sub: DjangoSubscription) => {
    toggleMutation.mutate({ id: sub.id, active: !sub.active });
  };

  return (
    <>
      <Card p="lg" mb={16} style={{ border: "1px solid #E5E5E5" }}>
        <Group justify="space-between" mb={16}>
          <Group gap={8}>
            <IconBellPlus size={18} color="#E85D3D" />
            <Text
              fw={700}
              size="sm"
              tt="uppercase"
              style={{ letterSpacing: "0.05em", fontSize: 11 }}
            >
              Alert Subscriptions
            </Text>
          </Group>
          <Button
            size="xs"
            color="dark"
            leftSection={<IconBellPlus size={14} />}
            onClick={handleCreate}
          >
            Add Subscription
          </Button>
        </Group>

        {isLoading ? (
          <Text size="sm" c="#737373">
            Loading subscriptions...
          </Text>
        ) : isError ? (
          <Text size="sm" c="red">
            Failed to load subscriptions: {error?.message ?? "Unknown error"}
          </Text>
        ) : subscriptions.length === 0 ? (
          <Text size="sm" c="#737373">
            No subscriptions yet. Create one to start receiving alerts.
          </Text>
        ) : (
          <Stack gap={12}>
            {subscriptions.map((sub) => (
              <Card
                key={sub.id}
                p="sm"
                style={{
                  border: "1px solid #F0F0F0",
                  backgroundColor: sub.active ? "#FAFAFA" : "#F5F5F5",
                  opacity: sub.active ? 1 : 0.7,
                }}
              >
                <Group justify="space-between" wrap="nowrap">
                  <Box style={{ flex: 1, minWidth: 0 }}>
                    {/* Method + Frequency */}
                    <Group gap={6} mb={4}>
                      {sub.method === "email" ? (
                        <IconMail size={14} color="#487795" />
                      ) : (
                        <IconPhone size={14} color="#487795" />
                      )}
                      <Badge size="xs" variant="light" color="blue">
                        {sub.method.toUpperCase()}
                      </Badge>
                      <Badge size="xs" variant="light" color="gray">
                        {frequencyLabel[sub.frequency] ?? sub.frequency}
                      </Badge>
                    </Group>

                    {/* Shock types */}
                    <Group gap={4} mb={2}>
                      {sub.shock_types.map((st) => (
                        <Badge
                          key={st.id}
                          size="xs"
                          variant="dot"
                          color="orange"
                        >
                          {st.name}
                        </Badge>
                      ))}
                    </Group>

                    {/* Locations */}
                    <Text size="xs" c="#737373" lineClamp={1}>
                      {sub.locations.map((l) => l.name).join(", ")}
                    </Text>
                  </Box>

                  {/* Actions */}
                  <Group gap={4} wrap="nowrap">
                    <Switch
                      size="xs"
                      checked={sub.active}
                      onChange={() => handleToggle(sub)}
                      color="teal"
                    />
                    <ActionIcon
                      variant="subtle"
                      color="gray"
                      size="sm"
                      onClick={() => handleEdit(sub)}
                    >
                      <IconPencil size={14} />
                    </ActionIcon>
                    <ActionIcon
                      variant="subtle"
                      color="red"
                      size="sm"
                      onClick={() => deleteMutation.mutate({ id: sub.id })}
                      loading={deleteMutation.isPending}
                    >
                      <IconTrash size={14} />
                    </ActionIcon>
                  </Group>
                </Group>
              </Card>
            ))}
          </Stack>
        )}
      </Card>

      <SubscriptionFormModal
        opened={modalOpened}
        onClose={() => setModalOpened(false)}
        subscription={editingSub}
        hasMobileNumber={hasMobileNumber}
        smsEnabled={smsEnabled}
      />
    </>
  );
}
