"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Box,
  Card,
  Text,
  Button,
  Loader,
  Stack,
  Center,
} from "@mantine/core";
import { useTranslations } from "next-intl";
import {
  IconCircleCheck,
  IconAlertCircle,
  IconMailForward,
  IconArrowRight,
} from "@tabler/icons-react";
import { api } from "~/trpc/react";

type VerifyState = "loading" | "success" | "already_verified" | "error";

export default function VerifyEmailPage() {
  const t = useTranslations("verifyEmail");
  const params = useParams<{ token: string }>();
  const router = useRouter();
  const [state, setState] = useState<VerifyState>("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [resendMessage, setResendMessage] = useState("");

  const verifyMutation = api.auth.verifyEmailToken.useMutation({
    onSuccess: (data) => {
      if (data.already_verified) {
        setState("already_verified");
      } else {
        setState("success");
      }
    },
    onError: (err) => {
      setState("error");
      setErrorMessage(err.message);
    },
  });

  const resendMutation = api.auth.requestEmailVerification.useMutation({
    onSuccess: () => {
      setResendMessage(t("resent"));
    },
    onError: (err) => {
      setResendMessage("");
      setErrorMessage(err.message);
    },
  });

  useEffect(() => {
    if (params.token) {
      verifyMutation.mutate({ token: params.token });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.token]);

  return (
    <Box
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--color-bg-primary)",
      }}
    >
      <Card
        p="xl"
        style={{
          border: "1px solid var(--color-border)",
          maxWidth: 440,
          width: "100%",
        }}
      >
        {state === "loading" && (
          <Stack align="center" gap={16}>
            <Loader size="lg" color="gray" />
            <Text size="sm" c="var(--color-text-muted)">
              {t("verifying")}
            </Text>
          </Stack>
        )}

        {state === "success" && (
          <Stack align="center" gap={16}>
            <Center
              style={{
                width: 56,
                height: 56,
                borderRadius: "50%",
                background: "var(--color-success-light)",
              }}
            >
              <IconCircleCheck size={32} color="var(--color-success)" />
            </Center>
            <Text size="lg" fw={700} c="var(--color-text-primary)" ta="center">
              {t("success.title")}
            </Text>
            <Text size="sm" c="var(--color-text-muted)" ta="center">
              {t("success.text")}
            </Text>
            <Button
              color="dark"
              fullWidth
              mt={8}
              rightSection={<IconArrowRight size={16} />}
              onClick={() => router.push("/profile")}
            >
              {t("goToProfile")}
            </Button>
          </Stack>
        )}

        {state === "already_verified" && (
          <Stack align="center" gap={16}>
            <Center
              style={{
                width: 56,
                height: 56,
                borderRadius: "50%",
                background: "var(--color-info-light)",
              }}
            >
              <IconCircleCheck size={32} color="var(--color-info)" />
            </Center>
            <Text size="lg" fw={700} c="var(--color-text-primary)" ta="center">
              {t("already.title")}
            </Text>
            <Text size="sm" c="var(--color-text-muted)" ta="center">
              {t("already.text")}
            </Text>
            <Button
              color="dark"
              fullWidth
              mt={8}
              rightSection={<IconArrowRight size={16} />}
              onClick={() => router.push("/profile")}
            >
              {t("goToProfile")}
            </Button>
          </Stack>
        )}

        {state === "error" && (
          <Stack align="center" gap={16}>
            <Center
              style={{
                width: 56,
                height: 56,
                borderRadius: "50%",
                background: "var(--color-critical-light)",
              }}
            >
              <IconAlertCircle size={32} color="var(--color-critical)" />
            </Center>
            <Text size="lg" fw={700} c="var(--color-text-primary)" ta="center">
              {t("failed")}
            </Text>
            <Text size="sm" c="var(--color-text-muted)" ta="center">
              {errorMessage}
            </Text>
            {resendMessage && (
              <Text size="sm" c="green" ta="center" fw={500}>
                {resendMessage}
              </Text>
            )}
            <Stack gap={8} w="100%" mt={8}>
              <Button
                color="dark"
                fullWidth
                leftSection={<IconMailForward size={16} />}
                loading={resendMutation.isPending}
                onClick={() => resendMutation.mutate()}
              >
                {t("resend")}
              </Button>
              <Button
                variant="outline"
                color="gray"
                fullWidth
                onClick={() => router.push("/profile")}
              >
                {t("goToProfile")}
              </Button>
            </Stack>
          </Stack>
        )}
      </Card>
    </Box>
  );
}
