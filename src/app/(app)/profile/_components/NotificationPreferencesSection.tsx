"use client";

import {
  Card,
  Text,
  Switch,
  Group,
  Stack,
  Box,
  Loader,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconBell, IconMail, IconPhone } from "@tabler/icons-react";
import { api } from "~/trpc/react";

export function NotificationPreferencesSection() {
  const utils = api.useUtils();
  const prefsQuery = api.auth.myNotificationPrefs.useQuery();

  const updatePrefs = api.auth.updateNotificationPrefs.useMutation({
    onSuccess: () => {
      notifications.show({
        title: "Saved",
        message: "Notification channels updated.",
        color: "green",
        autoClose: 2000,
      });
      void utils.auth.myNotificationPrefs.invalidate();
    },
    onError: (err) => {
      notifications.show({
        title: "Error",
        message: err.message,
        color: "red",
      });
      void utils.auth.myNotificationPrefs.invalidate();
    },
  });

  const emailEnabled = prefsQuery.data?.emailEnabled ?? false;
  const isSaving = updatePrefs.isPending;

  return (
    <Card p="lg" mb={16} style={{ border: "1px solid #E5E5E5" }}>
      <Group gap={8} mb={16}>
        <IconBell size={18} color="#E85D3D" />
        <Text
          fw={700}
          size="sm"
          tt="uppercase"
          style={{ letterSpacing: "0.05em", fontSize: 11 }}
        >
          Notification Channels
        </Text>
      </Group>

      {prefsQuery.isLoading ? (
        <Loader size="xs" />
      ) : (
        <Stack gap={16}>
          {/* Email toggle */}
          <Group justify="space-between">
            <Box>
              <Group gap={6}>
                <IconMail size={14} color="#737373" />
                <Text size="sm" fw={500}>
                  Email Notifications
                </Text>
              </Group>
              <Text size="xs" c="#737373">
                Receive crisis alerts and digests via email
              </Text>
            </Box>
            <Switch
              checked={emailEnabled}
              disabled={isSaving}
              onChange={(e) =>
                updatePrefs.mutate({ enableEmailNotification: e.currentTarget.checked })
              }
              color="teal"
            />
          </Group>

          {/* SMS toggle (disabled until backend is ready) */}
          <Group justify="space-between" style={{ opacity: 0.5 }}>
            <Box>
              <Group gap={6}>
                <IconPhone size={14} color="#737373" />
                <Text size="sm" fw={500}>
                  SMS Notifications
                </Text>
              </Group>
              <Text size="xs" c="#737373">
                Coming soon
              </Text>
            </Box>
            <Switch checked={false} disabled color="teal" />
          </Group>
        </Stack>
      )}
    </Card>
  );
}
