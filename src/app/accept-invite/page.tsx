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
    return <ErrorState message="No invitation token found in the URL." />;
  }

  if (inviteQuery.isLoading) {
    return (
      <CenteredBox>
        <Card p="xl" style={{ border: "1px solid #E5E5E5" }}>
          <Stack align="center" gap={16}>
            <Loader size="sm" />
            <Text size="sm" c="#737373">Loading invitation...</Text>
          </Stack>
        </Card>
      </CenteredBox>
    );
  }

  const invite = inviteQuery.data;

  if (!invite) {
    return <ErrorState message="Invalid invitation link. It may have been cancelled." />;
  }

  if (invite.status === "accepted") {
    return <ErrorState message="This invitation has already been accepted." showLogin />;
  }

  if (invite.status === "expired") {
    return <ErrorState message="This invitation has expired. Please contact your administrator for a new one." />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("Please enter your name");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setAccepting(true);

    try {
      await acceptMutation.mutateAsync({
        token,
        name: name.trim(),
        password,
      });

      // Try auto-login — signIn goes through BFF proxy which sets session cookie
      try {
        const { error: signInError } = await authClient.signIn.email({
          email: invite.email,
          password,
        });

        if (!signInError) {
          router.push("/dashboard");
          return;
        }
        console.warn("[accept-invite] Auto-login failed:", signInError.message);
      } catch (loginErr) {
        console.warn("[accept-invite] Auto-login exception:", loginErr);
      }

      // Fallback: redirect to login — account is created, user just needs to sign in
      router.push("/auth/login");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to accept invitation");
      setAccepting(false);
    }
  };

  return (
    <CenteredBox>
      <Card p="xl" style={{ border: "1px solid #E5E5E5" }}>
        <Stack align="center" gap={4} mb={24}>
          <Text fw={700} size="xl" c="#E85D3D" style={{ letterSpacing: "-0.025em" }}>
            CLEAR
          </Text>
          <Text size="lg" fw={600} c="#171717">
            Accept Invitation
          </Text>
        </Stack>

        {/* Invitation details */}
        <Box p={16} mb={20} style={{ backgroundColor: "#F5F5F5", borderRadius: 8 }}>
          <Stack gap={8}>
            <Text size="sm" c="#525252">
              You&apos;ve been invited to join:
            </Text>
            <Text size="md" fw={600} c="#171717">
              {invite.organisationName}
            </Text>
            {invite.teamName && (
              <Text size="sm" c="#525252">
                Team: <Text component="span" fw={600} c="#171717">{invite.teamName}</Text>
              </Text>
            )}
            <Badge size="sm" variant="light" color="blue" w="fit-content">
              Role: {invite.role}
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
              label="Full Name"
              placeholder="Enter your name"
              value={name}
              onChange={(e) => setName(e.currentTarget.value)}
              required
              autoComplete="name"
              autoFocus
              styles={{
                label: { fontSize: 13, fontWeight: 500, color: "#171717", marginBottom: 4 },
                input: { borderColor: "#E5E5E5", fontSize: 14 },
              }}
            />

            <TextInput
              label="Email"
              value={invite.email}
              disabled
              styles={{
                label: { fontSize: 13, fontWeight: 500, color: "#171717", marginBottom: 4 },
                input: { borderColor: "#E5E5E5", fontSize: 14, color: "#737373" },
              }}
            />

            <PasswordInput
              label="Password"
              placeholder="Min 8 characters"
              value={password}
              onChange={(e) => setPassword(e.currentTarget.value)}
              required
              autoComplete="new-password"
              styles={{
                label: { fontSize: 13, fontWeight: 500, color: "#171717", marginBottom: 4 },
                input: { borderColor: "#E5E5E5", fontSize: 14 },
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
                label: { fontSize: 13, fontWeight: 500, color: "#171717", marginBottom: 4 },
                input: { borderColor: "#E5E5E5", fontSize: 14 },
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
              Accept & Create Account
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
        backgroundColor: "#FAFAFA",
      }}
    >
      <Box w={420}>{children}</Box>
    </Box>
  );
}

function ErrorState({ message, showLogin }: { message: string; showLogin?: boolean }) {
  return (
    <CenteredBox>
      <Card p="xl" style={{ border: "1px solid #E5E5E5" }}>
        <Stack align="center" gap={16}>
          <Text fw={700} size="xl" c="#E85D3D">CLEAR</Text>
          <Alert icon={<IconAlertCircle size={16} />} color="red" variant="light" styles={{ message: { fontSize: 13 } }}>
            {message}
          </Alert>
          <Anchor component={Link} href={showLogin ? "/auth/login" : "/"} size="sm" c="#E85D3D" fw={500}>
            <IconArrowLeft size={14} style={{ verticalAlign: "middle", marginRight: 4 }} />
            {showLogin ? "Go to Sign In" : "Go Home"}
          </Anchor>
        </Stack>
      </Card>
    </CenteredBox>
  );
}
