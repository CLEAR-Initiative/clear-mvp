"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Box,
  Card,
  Text,
  TextInput,
  Button,
  Alert,
  Stack,
  Anchor,
} from "@mantine/core";
import { IconAlertCircle, IconCheck, IconArrowLeft } from "@tabler/icons-react";
import { api } from "~/trpc/react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const resetMutation = api.invitations.requestPasswordReset.useMutation({
    onSuccess: () => setSent(true),
    onError: (err) => setError(err.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email.trim()) {
      setError("Please enter your email address");
      return;
    }
    resetMutation.mutate({ email: email.trim() });
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
          <Stack align="center" gap={4} mb={24}>
            <Text fw={700} size="xl" c="#E85D3D" style={{ letterSpacing: "-0.025em" }}>
              CLEAR
            </Text>
            <Text size="lg" fw={600} c="var(--color-text-primary)">
              Reset Password
            </Text>
            <Text size="sm" c="var(--color-text-muted)" ta="center">
              Enter your email and we&apos;ll send you a link to reset your password.
            </Text>
          </Stack>

          {error && (
            <Alert icon={<IconAlertCircle size={16} />} color="red" variant="light" mb={16} styles={{ message: { fontSize: 13 } }}>
              {error}
            </Alert>
          )}

          {sent ? (
            <Stack align="center" gap={16}>
              <Alert icon={<IconCheck size={16} />} color="green" variant="light" styles={{ message: { fontSize: 13 } }}>
                If an account exists with that email, we&apos;ve sent a password reset link.
                Check your inbox.
              </Alert>
              <Anchor component={Link} href="/auth/login" size="sm" c="#E85D3D" fw={500}>
                <IconArrowLeft size={14} style={{ verticalAlign: "middle", marginRight: 4 }} />
                Back to Sign In
              </Anchor>
            </Stack>
          ) : (
            <form onSubmit={handleSubmit}>
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

                <Button
                  type="submit"
                  fullWidth
                  color="dark"
                  loading={resetMutation.isPending}
                  mt={8}
                  style={{ fontWeight: 600, fontSize: 14 }}
                >
                  Send Reset Link
                </Button>

                <Text ta="center" size="sm" mt={8}>
                  <Anchor component={Link} href="/auth/login" c="var(--color-text-muted)" fw={500} size="sm">
                    <IconArrowLeft size={14} style={{ verticalAlign: "middle", marginRight: 4 }} />
                    Back to Sign In
                  </Anchor>
                </Text>
              </Stack>
            </form>
          )}
        </Card>
      </Box>
    </Box>
  );
}
