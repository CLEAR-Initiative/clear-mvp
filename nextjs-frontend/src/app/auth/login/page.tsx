"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
  const callbackUrl = searchParams.get("callbackUrl") ?? "/dashboard";

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
        backgroundColor: "#FAFAFA",
      }}
    >
      <Box w={400}>
        <Card p="xl" style={{ border: "1px solid #E5E5E5" }}>
          {/* Branding */}
          <Stack align="center" gap={4} mb={24}>
            <Text fw={700} size="xl" c="#E85D3D" style={{ letterSpacing: "-0.025em" }}>
              CLEAR
            </Text>
            <Text size="lg" fw={600} c="#171717">
              Sign In
            </Text>
            <Text size="sm" c="#737373">
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
                  label: { fontSize: 13, fontWeight: 500, color: "#171717", marginBottom: 4 },
                  input: { borderColor: "#E5E5E5", fontSize: 14 },
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
                  label: { fontSize: 13, fontWeight: 500, color: "#171717", marginBottom: 4 },
                  input: { borderColor: "#E5E5E5", fontSize: 14 },
                }}
              />

              <Checkbox
                label="Remember me"
                size="sm"
                styles={{
                  label: { fontSize: 13, color: "#525252" },
                }}
              />

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
          <Box p={12} style={{ backgroundColor: "#F5F5F5" }}>
            <Text size="xs" c="#737373" mb={8}>
              Available demo accounts (all use password: password123):
            </Text>
            <SimpleGrid cols={1} spacing={4}>
              {demoUsers.map((user) => (
                <Text
                  key={user.email}
                  size="xs"
                  fw={600}
                  c="#171717"
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
        <Text ta="center" size="xs" c="#737373" mt={16}>
          Norwegian Refugee Council &bull; Early Warning and Alert System for Sudan
        </Text>
      </Box>
    </Box>
  );
}
