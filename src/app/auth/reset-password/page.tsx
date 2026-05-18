"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Box,
  Card,
  Text,
  PasswordInput,
  Button,
  Alert,
  Stack,
  Anchor,
} from "@mantine/core";
import { IconAlertCircle, IconCheck, IconArrowLeft } from "@tabler/icons-react";
import { api } from "~/trpc/react";

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  );
}

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const resetMutation = api.invitations.resetPassword.useMutation({
    onSuccess: () => {
      setSuccess(true);
      setTimeout(() => router.push("/auth/login"), 2000);
    },
    onError: (err) => setError(err.message),
  });

  if (!token) {
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
            <Stack align="center" gap={16}>
              <Alert icon={<IconAlertCircle size={16} />} color="red" variant="light" styles={{ message: { fontSize: 13 } }}>
                Invalid reset link. Please request a new password reset.
              </Alert>
              <Anchor component={Link} href="/auth/forgot-password" size="sm" c="#E85D3D" fw={500}>
                Request New Reset Link
              </Anchor>
            </Stack>
          </Card>
        </Box>
      </Box>
    );
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    resetMutation.mutate({ token, newPassword: password });
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
              Set New Password
            </Text>
          </Stack>

          {error && (
            <Alert icon={<IconAlertCircle size={16} />} color="red" variant="light" mb={16} styles={{ message: { fontSize: 13 } }}>
              {error}
            </Alert>
          )}

          {success ? (
            <Stack align="center" gap={16}>
              <Alert icon={<IconCheck size={16} />} color="green" variant="light" styles={{ message: { fontSize: 13 } }}>
                Password reset successfully. Redirecting to login...
              </Alert>
            </Stack>
          ) : (
            <form onSubmit={handleSubmit}>
              <Stack gap={12}>
                <PasswordInput
                  label="New Password"
                  placeholder="Min 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.currentTarget.value)}
                  required
                  autoComplete="new-password"
                  autoFocus
                  styles={{
                    label: { fontSize: 13, fontWeight: 500, color: "var(--color-text-primary)", marginBottom: 4 },
                    input: { borderColor: "var(--color-border)", fontSize: 14 },
                  }}
                />

                <PasswordInput
                  label="Confirm Password"
                  placeholder="Re-enter your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.currentTarget.value)}
                  required
                  autoComplete="new-password"
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
                  Reset Password
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
