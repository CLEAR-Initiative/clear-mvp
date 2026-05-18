"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Box,
  Card,
  Text,
  TextInput,
  PasswordInput,
  Button,
  Checkbox,
  Alert,
  Stack,
  SimpleGrid,
  Divider,
  Anchor,
  Group,
} from "@mantine/core";
import { IconAlertCircle, IconLogin } from "@tabler/icons-react";
import { authClient } from "~/lib/auth-client";

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawCallback = searchParams.get("callbackUrl") ?? "/dashboard";
  const callbackUrl =
    rawCallback.startsWith("/") && !rawCallback.startsWith("//")
      ? rawCallback
      : "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { error: signInError } = await authClient.signIn.email({
        email: email.trim(),
        password,
      });
      if (signInError) {
        setError(signInError.message ?? "Login failed");
      } else {
        router.push(callbackUrl);
      }
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const demoUsers = [
    { label: "Admin", email: "admin@clear.dev" },
    { label: "Analyst", email: "analyst@clear.dev" },
    { label: "Viewer", email: "viewer@clear.dev" },
  ];

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
      <Box w={400}>
        <Card p="xl" style={{ border: "1px solid var(--color-border)" }}>
          {/* Branding */}
          <Stack align="center" gap={4} mb={24}>
            <Text fw={700} size="xl" c="#E85D3D" style={{ letterSpacing: "-0.025em" }}>
              CLEAR
            </Text>
            <Text size="lg" fw={600} c="var(--color-text-primary)">
              Sign In
            </Text>
            <Text size="sm" c="var(--color-text-muted)">
              Crisis Early Warning & Response
            </Text>
          </Stack>

          {/* Error */}
          {error && (
            <Alert
              icon={<IconAlertCircle size={16} />}
              color="red"
              variant="light"
              mb={16}
              styles={{ message: { fontSize: 13 } }}
            >
              {error}
            </Alert>
          )}

          {/* Login Form */}
          <form onSubmit={(e) => void handleSubmit(e)}>
            <Stack gap={12}>
              <TextInput
                label="Email"
                placeholder="Enter your email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.currentTarget.value)}
                required
                autoComplete="email"
                autoFocus
                styles={{
                  label: { fontSize: 13, fontWeight: 500, color: "var(--color-text-primary)", marginBottom: 4 },
                  input: { borderColor: "var(--color-border)", fontSize: 14 },
                }}
              />

              <PasswordInput
                label="Password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.currentTarget.value)}
                required
                autoComplete="current-password"
                styles={{
                  label: { fontSize: 13, fontWeight: 500, color: "var(--color-text-primary)", marginBottom: 4 },
                  input: { borderColor: "var(--color-border)", fontSize: 14 },
                }}
              />

              <Group justify="space-between">
                <Checkbox
                  label="Remember me"
                  size="sm"
                  styles={{ label: { fontSize: 13, color: "var(--color-text-secondary)" } }}
                />
                <Anchor
                  component={Link}
                  href="/auth/forgot-password"
                  size="sm"
                  c="#E85D3D"
                  fw={500}
                >
                  Forgot password?
                </Anchor>
              </Group>

              <Button
                type="submit"
                fullWidth
                color="dark"
                loading={loading}
                leftSection={<IconLogin size={16} />}
                mt={8}
                style={{ fontWeight: 600, fontSize: 14 }}
              >
                Sign In
              </Button>
            </Stack>
          </form>

          {/* Demo Users */}
          <Divider my={20} label="Demo Users" labelPosition="center" />
          <Box p={12} style={{ backgroundColor: "var(--color-bg-muted)" }}>
            <Text size="xs" c="var(--color-text-muted)" mb={8}>
              Available demo accounts (all use password: password123):
            </Text>
            <SimpleGrid cols={1} spacing={4}>
              {demoUsers.map((user) => (
                <Text
                  key={user.email}
                  size="xs"
                  fw={600}
                  c="var(--color-text-primary)"
                  style={{ cursor: "pointer" }}
                  onClick={() => setEmail(user.email)}
                >
                  {user.label} — {user.email}
                </Text>
              ))}
            </SimpleGrid>
          </Box>
        </Card>

        {/* Footer */}
        <Text ta="center" size="xs" c="var(--color-text-muted)" mt={16}>
          Norwegian Refugee Council &bull; Early Warning and Alert System for Sudan
        </Text>
      </Box>
    </Box>
  );
}
