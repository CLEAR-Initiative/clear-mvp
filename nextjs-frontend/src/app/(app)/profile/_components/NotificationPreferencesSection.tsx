"use client";

import { useState } from "react";
import {
  Card,
  Text,
  Switch,
  Group,
  Stack,
  Box,
  TextInput,
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
  const [smsEnabled, setSmsEnabled] = useState(
    user.sms_notifications_enabled ?? false,
  );
  const [mobileNumber, setMobileNumber] = useState(
    user.mobile_number ?? "",
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
      sms_notifications_enabled: smsEnabled,
      mobile_number: mobileNumber,
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

        {/* SMS toggle */}
        <Group justify="space-between">
          <Box>
            <Group gap={6}>
              <IconPhone size={14} color="#737373" />
              <Text size="sm" fw={500}>
                SMS Notifications
              </Text>
            </Group>
            <Text size="xs" c="#737373">
              Receive critical alerts via SMS
            </Text>
          </Box>
          <Switch
            checked={smsEnabled}
            onChange={(e) => setSmsEnabled(e.currentTarget.checked)}
            color="teal"
          />
        </Group>

        {/* Mobile number input (shown when SMS enabled) */}
        {smsEnabled && (
          <TextInput
            label="Mobile Number"
            description="Enter in E.164 format (e.g. +249912345678)"
            placeholder="+249912345678"
            value={mobileNumber}
            onChange={(e) => setMobileNumber(e.currentTarget.value)}
            styles={{
              input: {
                border: "1px solid #E5E5E5",
                borderRadius: 8,
              },
            }}
          />
        )}

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
