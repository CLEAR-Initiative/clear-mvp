"use client";

import {
  Box,
  Card,
  Text,
  Button,
  Stack,
} from "@mantine/core";
import { IconLock, IconLogout } from "@tabler/icons-react";
import { authClient } from "~/lib/auth-client";
import { useRouter } from "next/navigation";

export default function NoAccessPage() {
  const router = useRouter();

  const handleSignOut = async () => {
    try { await authClient.signOut(); } catch { /* ignore */ }
    localStorage.clear();
    sessionStorage.clear();
    window.location.href = "/auth/login";
  };

  return (
    <Box
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "var(--color-bg-primary)",
      }}
    >
      <Box w={440}>
        <Card p="xl" style={{ border: "1px solid var(--color-border)" }}>
          <Stack align="center" gap={16}>
            <IconLock size={48} color="#E85D3D" stroke={1.5} />
            <Text size="lg" fw={600} c="var(--color-text-primary)">
              Waiting for Access
            </Text>
            <Text size="sm" c="var(--color-text-muted)" ta="center" maw={360}>
              You&apos;ve signed in but haven&apos;t been assigned to an organisation yet.
              Contact your administrator to receive an invitation.
            </Text>
            <Button
              variant="subtle"
              color="gray"
              leftSection={<IconLogout size={16} />}
              onClick={() => void handleSignOut()}
              mt={8}
              style={{ fontWeight: 500, fontSize: 13 }}
            >
              Sign Out
            </Button>
          </Stack>
        </Card>

        <Text ta="center" size="xs" c="var(--color-text-muted)" mt={16}>
          Norwegian Refugee Council &bull; CLEAR Platform
        </Text>
      </Box>
    </Box>
  );
}
