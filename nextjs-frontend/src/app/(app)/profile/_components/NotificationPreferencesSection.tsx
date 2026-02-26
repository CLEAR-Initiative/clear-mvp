"use client";

import { useState } from "react";
import {
  Card,
  Text,
  Switch,
  Group,
  Stack,
  Box,
  Button,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconBell, IconMail, IconPhone } from "@tabler/icons-react";
import { api } from "~/trpc/react";

interface NotificationPreferencesSectionProps {
  user: {
    email_notifications_enabled?: boolean;
    sms_notifications_enabled?: boolean;
    mobile_number?: string;
  };
}

export function NotificationPreferencesSection({
  user,
}: NotificationPreferencesSectionProps) {
  const [emailEnabled, setEmailEnabled] = useState(
    user.email_notifications_enabled ?? false,
  );
  const [isSaving, setIsSaving] = useState(false);

  const utils = api.useUtils();
  const updateProfile = api.subscriptions.updateProfile.useMutation({
    onSuccess: () => {
      notifications.show({
        title: "Saved",
        message: "Notification preferences updated.",
        color: "green",
      });
      void utils.auth.me.invalidate();
    },
    onError: (err) => {
      notifications.show({
        title: "Error",
        message: err.message,
        color: "red",
      });
    },
    onSettled: () => setIsSaving(false),
  });

  const handleSave = () => {
    setIsSaving(true);
    updateProfile.mutate({
      email_notifications_enabled: emailEnabled,
    });
  };

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
          Notification Preferences
        </Text>
      </Group>

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
            onChange={(e) => setEmailEnabled(e.currentTarget.checked)}
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
          <Switch
            checked={false}
            disabled
            color="teal"
          />
        </Group>

        <Group justify="flex-end" mt={4}>
          <Button
            size="xs"
            color="dark"
            loading={isSaving}
            onClick={handleSave}
          >
            Save Preferences
          </Button>
        </Group>
      </Stack>
    </Card>
  );
}
