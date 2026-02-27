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
import {
  IconCircleCheck,
  IconAlertCircle,
  IconMailForward,
  IconArrowRight,
} from "@tabler/icons-react";
import { api } from "~/trpc/react";

type VerifyState = "loading" | "success" | "already_verified" | "error";

export default function VerifyEmailPage() {
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
      setResendMessage("A new verification email has been sent. Please check your inbox.");
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
        background: "#FAFAFA",
      }}
    >
      <Card
        p="xl"
        style={{
          border: "1px solid #E5E5E5",
          maxWidth: 440,
          width: "100%",
        }}
      >
        {state === "loading" && (
          <Stack align="center" gap={16}>
            <Loader size="lg" color="gray" />
            <Text size="sm" c="#737373">
              Verifying your email...
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
                background: "#ECFDF5",
              }}
            >
              <IconCircleCheck size={32} color="#059669" />
            </Center>
            <Text size="lg" fw={700} c="#171717" ta="center">
              Email Verified
            </Text>
            <Text size="sm" c="#737373" ta="center">
              Your email has been verified successfully. You can now receive
              email notifications.
            </Text>
            <Button
              color="dark"
              fullWidth
              mt={8}
              rightSection={<IconArrowRight size={16} />}
              onClick={() => router.push("/profile")}
            >
              Go to Profile
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
                background: "#EFF6FF",
              }}
            >
              <IconCircleCheck size={32} color="#3B82F6" />
            </Center>
            <Text size="lg" fw={700} c="#171717" ta="center">
              Already Verified
            </Text>
            <Text size="sm" c="#737373" ta="center">
              Your email is already verified. No further action needed.
            </Text>
            <Button
              color="dark"
              fullWidth
              mt={8}
              rightSection={<IconArrowRight size={16} />}
              onClick={() => router.push("/profile")}
            >
              Go to Profile
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
                background: "#FEF2F2",
              }}
            >
              <IconAlertCircle size={32} color="#DC2626" />
            </Center>
            <Text size="lg" fw={700} c="#171717" ta="center">
              Verification Failed
            </Text>
            <Text size="sm" c="#737373" ta="center">
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
                Resend Verification Email
              </Button>
              <Button
                variant="outline"
                color="gray"
                fullWidth
                onClick={() => router.push("/profile")}
              >
                Go to Profile
              </Button>
            </Stack>
          </Stack>
        )}
      </Card>
    </Box>
  );
}
