"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Box,
  Card,
  Text,
  Switch,
  Button,
  Group,
  Stack,
  Divider,
} from "@mantine/core";
import { useTranslations } from "next-intl";
import {
  IconBell,
  IconMail,
  IconVolume,
  IconDeviceDesktop,
  IconMoon,
} from "@tabler/icons-react";

export default function NotificationPreferencesPage() {
  const t = useTranslations("notificationPreferences");
  const tActions = useTranslations("common.actions");
  const [emailNotifications, setEmailNotifications] = useState(false);
  const [internalAlerts, setInternalAlerts] = useState(true);
  const [systemNotifications, setSystemNotifications] = useState(true);
  const [updates, setUpdates] = useState(false);
  const [desktopNotifications, setDesktopNotifications] = useState(false);
  const [soundAlerts, setSoundAlerts] = useState(true);
  const [quietHours, setQuietHours] = useState(false);

  return (
    <Box p={32} style={{ maxWidth: 600 }}>
      <Group justify="space-between" mb={24}>
        <Box>
          <Text size="xl" fw={700} c="var(--color-text-primary)">
            {t("title")}
          </Text>
          <Text size="sm" c="var(--color-text-muted)">
            {t("subtitle")}
          </Text>
        </Box>
        <Button
          component={Link}
          href="/profile"
          variant="subtle"
          color="gray"
          size="sm"
        >
          {t("backToProfile")}
        </Button>
      </Group>

      {/* Email Notifications */}
      <Card p="lg" mb={16} style={{ border: "1px solid #E5E5E5" }}>
        <Group gap={8} mb={16}>
          <IconMail size={18} color="#E85D3D" />
          <Text fw={700} size="sm" tt="uppercase" style={{ letterSpacing: "0.05em", fontSize: 11 }}>
            {t("email.title")}
          </Text>
        </Group>
        <Group justify="space-between">
          <Box>
            <Text size="sm" fw={500}>{t("email.enable")}</Text>
            <Text size="xs" c="var(--color-text-muted)">
              {t("email.description")}
            </Text>
          </Box>
          <Switch
            checked={emailNotifications}
            onChange={(e) => setEmailNotifications(e.currentTarget.checked)}
            color="teal"
          />
        </Group>
      </Card>

      {/* Internal Notifications */}
      <Card p="lg" mb={16} style={{ border: "1px solid #E5E5E5" }}>
        <Group gap={8} mb={16}>
          <IconBell size={18} color="#E85D3D" />
          <Text fw={700} size="sm" tt="uppercase" style={{ letterSpacing: "0.05em", fontSize: 11 }}>
            {t("internal.title")}
          </Text>
        </Group>
        <Stack gap={16}>
          <Group justify="space-between">
            <Box>
              <Text size="sm" fw={500}>{t("internal.crisisAlerts")}</Text>
              <Text size="xs" c="var(--color-text-muted)">{t("internal.crisisAlertsDescription")}</Text>
            </Box>
            <Switch
              checked={internalAlerts}
              onChange={(e) => setInternalAlerts(e.currentTarget.checked)}
              color="teal"
            />
          </Group>
          <Group justify="space-between">
            <Box>
              <Text size="sm" fw={500}>{t("internal.system")}</Text>
              <Text size="xs" c="var(--color-text-muted)">{t("internal.systemDescription")}</Text>
            </Box>
            <Switch
              checked={systemNotifications}
              onChange={(e) => setSystemNotifications(e.currentTarget.checked)}
              color="teal"
            />
          </Group>
          <Group justify="space-between">
            <Box>
              <Text size="sm" fw={500}>{t("internal.updates")}</Text>
              <Text size="xs" c="var(--color-text-muted)">{t("internal.updatesDescription")}</Text>
            </Box>
            <Switch
              checked={updates}
              onChange={(e) => setUpdates(e.currentTarget.checked)}
              color="teal"
            />
          </Group>
        </Stack>
      </Card>

      {/* Display Settings */}
      <Card p="lg" mb={16} style={{ border: "1px solid #E5E5E5" }}>
        <Group gap={8} mb={16}>
          <IconDeviceDesktop size={18} color="#E85D3D" />
          <Text fw={700} size="sm" tt="uppercase" style={{ letterSpacing: "0.05em", fontSize: 11 }}>
            {t("display.title")}
          </Text>
        </Group>
        <Stack gap={16}>
          <Group justify="space-between">
            <Box>
              <Text size="sm" fw={500}>{t("display.desktop")}</Text>
              <Text size="xs" c="var(--color-text-muted)">{t("display.desktopDescription")}</Text>
            </Box>
            <Switch
              checked={desktopNotifications}
              onChange={(e) => setDesktopNotifications(e.currentTarget.checked)}
              color="teal"
            />
          </Group>
          <Group justify="space-between">
            <Box>
              <Text size="sm" fw={500}>{t("display.sound")}</Text>
              <Text size="xs" c="var(--color-text-muted)">{t("display.soundDescription")}</Text>
            </Box>
            <Switch
              checked={soundAlerts}
              onChange={(e) => setSoundAlerts(e.currentTarget.checked)}
              color="teal"
            />
          </Group>
        </Stack>
      </Card>

      {/* Quiet Hours */}
      <Card p="lg" mb={16} style={{ border: "1px solid #E5E5E5" }}>
        <Group gap={8} mb={16}>
          <IconMoon size={18} color="#E85D3D" />
          <Text fw={700} size="sm" tt="uppercase" style={{ letterSpacing: "0.05em", fontSize: 11 }}>
            {t("quietHours.title")}
          </Text>
        </Group>
        <Group justify="space-between">
          <Box>
            <Text size="sm" fw={500}>{t("quietHours.enable")}</Text>
            <Text size="xs" c="var(--color-text-muted)">
              {t("quietHours.description")}
            </Text>
          </Box>
          <Switch
            checked={quietHours}
            onChange={(e) => setQuietHours(e.currentTarget.checked)}
            color="teal"
          />
        </Group>
      </Card>

      <Divider my={16} />

      <Group justify="flex-end">
        <Button variant="outline" color="gray" component={Link} href="/profile">
          {tActions("cancel")}
        </Button>
        <Button color="dark" style={{ fontWeight: 600 }}>
          {t("save")}
        </Button>
      </Group>
    </Box>
  );
}
