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
import {
  IconBell,
  IconMail,
  IconVolume,
  IconDeviceDesktop,
  IconMoon,
} from "@tabler/icons-react";

export default function NotificationPreferencesPage() {
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
          <Text size="xl" fw={700} c="#171717">
            Notification Preferences
          </Text>
          <Text size="sm" c="#737373">
            Manage how you receive alerts and updates
          </Text>
        </Box>
        <Button
          component={Link}
          href="/profile"
          variant="subtle"
          color="gray"
          size="sm"
        >
          Back to Profile
        </Button>
      </Group>

      {/* Email Notifications */}
      <Card p="lg" mb={16} style={{ border: "1px solid #E5E5E5" }}>
        <Group gap={8} mb={16}>
          <IconMail size={18} color="#E85D3D" />
          <Text fw={700} size="sm" tt="uppercase" style={{ letterSpacing: "0.05em", fontSize: 11 }}>
            Email Notifications
          </Text>
        </Group>
        <Group justify="space-between">
          <Box>
            <Text size="sm" fw={500}>Enable Email Alerts</Text>
            <Text size="xs" c="#737373">
              Receive crisis alerts and system notifications via email
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
            Internal Notifications
          </Text>
        </Group>
        <Stack gap={16}>
          <Group justify="space-between">
            <Box>
              <Text size="sm" fw={500}>Crisis Alerts</Text>
              <Text size="xs" c="#737373">New alerts and severity changes</Text>
            </Box>
            <Switch
              checked={internalAlerts}
              onChange={(e) => setInternalAlerts(e.currentTarget.checked)}
              color="teal"
            />
          </Group>
          <Group justify="space-between">
            <Box>
              <Text size="sm" fw={500}>System Notifications</Text>
              <Text size="xs" c="#737373">Pipeline status, task assignments</Text>
            </Box>
            <Switch
              checked={systemNotifications}
              onChange={(e) => setSystemNotifications(e.currentTarget.checked)}
              color="teal"
            />
          </Group>
          <Group justify="space-between">
            <Box>
              <Text size="sm" fw={500}>Updates & Reports</Text>
              <Text size="xs" c="#737373">Weekly summaries and analysis reports</Text>
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
            Display Settings
          </Text>
        </Group>
        <Stack gap={16}>
          <Group justify="space-between">
            <Box>
              <Text size="sm" fw={500}>Desktop Notifications</Text>
              <Text size="xs" c="#737373">Show browser push notifications</Text>
            </Box>
            <Switch
              checked={desktopNotifications}
              onChange={(e) => setDesktopNotifications(e.currentTarget.checked)}
              color="teal"
            />
          </Group>
          <Group justify="space-between">
            <Box>
              <Text size="sm" fw={500}>Sound Alerts</Text>
              <Text size="xs" c="#737373">Play sound for critical alerts</Text>
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
            Quiet Hours
          </Text>
        </Group>
        <Group justify="space-between">
          <Box>
            <Text size="sm" fw={500}>Enable Quiet Hours</Text>
            <Text size="xs" c="#737373">
              Suppress non-critical notifications during set hours
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
          Cancel
        </Button>
        <Button color="dark" style={{ fontWeight: 600 }}>
          Save Preferences
        </Button>
      </Group>
    </Box>
  );
}
