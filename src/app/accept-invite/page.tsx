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
  Alert,
  Stack,
  Anchor,
  Loader,
  Badge,
} from "@mantine/core";
import { useTranslations } from "next-intl";
import { IconAlertCircle, IconCheck, IconArrowLeft } from "@tabler/icons-react";
import { api } from "~/trpc/react";
import { authClient } from "~/lib/auth-client";

export default function AcceptInvitePage() {
  return (
    <Suspense>
      <AcceptInviteForm />
    </Suspense>
  );
}

function AcceptInviteForm() {
  const t = useTranslations("acceptInvite");
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [accepting, setAccepting] = useState(false);

  const inviteQuery = api.invitations.byToken.useQuery(
    { token: token! },
    { enabled: !!token },
  );

  const acceptMutation = api.invitations.accept.useMutation();

  if (!token) {
    return <ErrorState message={t("errors.noToken")} />;
  }

  if (inviteQuery.isLoading) {
    return (
      <CenteredBox>
        <Card p="xl" style={{ border: "1px solid var(--color-border)" }}>
          <Stack align="center" gap={16}>
            <Loader size="sm" />
            <Text size="sm" c="var(--color-text-muted)">{t("loading")}</Text>
          </Stack>
        </Card>
      </CenteredBox>
    );
  }

  const invite = inviteQuery.data;

  if (!invite) {
    return <ErrorState message={t("errors.invalid")} />;
  }

  if (invite.status === "accepted") {
    return <ErrorState message={t("errors.accepted")} showLogin />;
  }

  if (invite.status === "expired") {
    return <ErrorState message={t("errors.expired")} />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!name.trim()) {
      setError(t("errors.nameRequired"));
      return;
    }
    if (password.length < 8) {
      setError(t("errors.tooShort"));
      return;
    }
    if (password !== confirmPassword) {
      setError(t("errors.mismatch"));
      return;
    }

    setAccepting(true);

    try {
      await acceptMutation.mutateAsync({
        token,
        name: name.trim(),
        password,
      });

      // Try auto-login - signIn goes through BFF proxy which sets session cookie
      try {
        const { error: signInError } = await authClient.signIn.email({
          email: invite.email,
          password,
        });

        if (!signInError) {
          router.push("/welcome/profile");
          return;
        }
        console.warn("[accept-invite] Auto-login failed:", signInError.message);
      } catch (loginErr) {
        console.warn("[accept-invite] Auto-login exception:", loginErr);
      }

      // Fallback: redirect to login - account is created, user just needs to sign in
      router.push("/auth/login");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errors.failed"));
      setAccepting(false);
    }
  };

  return (
    <CenteredBox>
      <Card p="xl" style={{ border: "1px solid var(--color-border)" }}>
        <Stack align="center" gap={4} mb={24}>
          <Text fw={700} size="xl" c="var(--color-accent)" style={{ letterSpacing: "-0.025em" }}>
            CLEAR
          </Text>
          <Text size="lg" fw={600} c="var(--color-text-primary)">
            {t("title")}
          </Text>
        </Stack>

        {/* Invitation details */}
        <Box p={16} mb={20} style={{ backgroundColor: "var(--color-bg-muted)", borderRadius: 8 }}>
          <Stack gap={8}>
            <Text size="sm" c="var(--color-text-secondary)">
              {t("invitedToJoin")}
            </Text>
            <Text size="md" fw={600} c="var(--color-text-primary)">
              {invite.organisationName}
            </Text>
            {invite.teamName && (
              <Text size="sm" c="var(--color-text-secondary)">
                {t("team")} <Text component="span" fw={600} c="var(--color-text-primary)">{invite.teamName}</Text>
              </Text>
            )}
            <Badge size="sm" variant="light" color="blue" w="fit-content">
              {t("role", { role: invite.role })}
              {invite.teamRole ? ` / ${invite.teamRole}` : ""}
            </Badge>
          </Stack>
        </Box>

        {error && (
          <Alert icon={<IconAlertCircle size={16} />} color="red" variant="light" mb={16} styles={{ message: { fontSize: 13 } }}>
            {error}
          </Alert>
        )}

        <form onSubmit={(e) => void handleSubmit(e)}>
          <Stack gap={12}>
            <TextInput
              label={t("fullName")}
              placeholder={t("fullNamePlaceholder")}
              value={name}
              onChange={(e) => setName(e.currentTarget.value)}
              required
              autoComplete="name"
              autoFocus
              styles={{
                label: { fontSize: 13, fontWeight: 500, color: "var(--color-text-primary)", marginBottom: 4 },
                input: { borderColor: "var(--color-border)", fontSize: 14 },
              }}
            />

            <TextInput
              label={t("email")}
              value={invite.email}
              disabled
              styles={{
                label: { fontSize: 13, fontWeight: 500, color: "var(--color-text-primary)", marginBottom: 4 },
                input: { borderColor: "var(--color-border)", fontSize: 14, color: "var(--color-text-muted)" },
              }}
            />

            <PasswordInput
              label={t("password")}
              placeholder={t("passwordPlaceholder")}
              value={password}
              onChange={(e) => setPassword(e.currentTarget.value)}
              required
              autoComplete="new-password"
              styles={{
                label: { fontSize: 13, fontWeight: 500, color: "var(--color-text-primary)", marginBottom: 4 },
                input: { borderColor: "var(--color-border)", fontSize: 14 },
              }}
            />

            <PasswordInput
              label={t("confirmPassword")}
              placeholder={t("confirmPlaceholder")}
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
              loading={accepting}
              leftSection={<IconCheck size={16} />}
              mt={8}
              style={{ fontWeight: 600, fontSize: 14 }}
            >
              {t("submit")}
            </Button>
          </Stack>
        </form>
      </Card>
    </CenteredBox>
  );
}

function CenteredBox({ children }: { children: React.ReactNode }) {
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
      <Box w={420}>{children}</Box>
    </Box>
  );
}

function ErrorState({ message, showLogin }: { message: string; showLogin?: boolean }) {
  const t = useTranslations("acceptInvite");
  return (
    <CenteredBox>
      <Card p="xl" style={{ border: "1px solid var(--color-border)" }}>
        <Stack align="center" gap={16}>
          <Text fw={700} size="xl" c="var(--color-accent)">CLEAR</Text>
          <Alert icon={<IconAlertCircle size={16} />} color="red" variant="light" styles={{ message: { fontSize: 13 } }}>
            {message}
          </Alert>
          <Anchor component={Link} href={showLogin ? "/auth/login" : "/"} size="sm" c="var(--color-accent)" fw={500}>
            <IconArrowLeft size={14} style={{ verticalAlign: "middle", marginInlineEnd: 4 }} />
            {showLogin ? t("goToSignIn") : t("goHome")}
          </Anchor>
        </Stack>
      </Card>
    </CenteredBox>
  );
}
