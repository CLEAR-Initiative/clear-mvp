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
  Anchor,
  Group,
} from "@mantine/core";
import { useTranslations } from "next-intl";
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
  const t = useTranslations("auth.login");
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
        setError(signInError.message ?? t("failed"));
      } else {
        router.push(callbackUrl);
      }
    } catch {
      setError(t("unexpectedError"));
    } finally {
      setLoading(false);
    }
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
      <Box w={400}>
        <Card p="xl" style={{ border: "1px solid var(--color-border)" }}>
          {/* Branding */}
          <Stack align="center" gap={4} mb={24}>
            <Text fw={700} size="xl" c="#E85D3D" style={{ letterSpacing: "-0.025em" }}>
              CLEAR
            </Text>
            <Text size="lg" fw={600} c="var(--color-text-primary)">
              {t("title")}
            </Text>
            <Text size="sm" c="var(--color-text-muted)">
              {t("tagline")}
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
                label={t("email")}
                placeholder={t("emailPlaceholder")}
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
                label={t("password")}
                placeholder={t("passwordPlaceholder")}
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
                  label={t("rememberMe")}
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
                  {t("forgotPassword")}
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
                {t("submit")}
              </Button>
            </Stack>
          </form>

        </Card>

        {/* Footer */}
        <Text ta="center" size="xs" c="var(--color-text-muted)" mt={16}>
          {t("footer")}
        </Text>
      </Box>
    </Box>
  );
}
