"use client";

import { Box, Group, Stack, Text } from "@mantine/core";
import { NrcLogoMark } from "~/components/ui/nrc-logo-mark";

interface WelcomeStepperProps {
  activeStep: 0 | 1;
}

export function WelcomeStepper({ activeStep }: WelcomeStepperProps) {
  const steps = ["Profile", "Settings"];

  return (
    <Group justify="center" gap={8} mb={32}>
      {steps.map((label, index) => {
        const active = index === activeStep;
        const done = index < activeStep;
        return (
          <Group key={label} gap={8}>
            <Box
              style={{
                width: 28,
                height: 28,
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: active || done ? "#ff5a1f" : "#e4e4e7",
                color: active || done ? "white" : "#71717a",
                fontWeight: 700,
                fontSize: 12,
              }}
            >
              {index + 1}
            </Box>
            <Text size="sm" fw={active ? 700 : 500} c={active ? "#161618" : "#71717a"}>
              {label}
            </Text>
            {index < steps.length - 1 && (
              <Box w={32} h={2} bg={done ? "#ff5a1f" : "#e4e4e7"} style={{ borderRadius: 1 }} />
            )}
          </Group>
        );
      })}
    </Group>
  );
}

export function WelcomeShell({ children }: { children: React.ReactNode }) {
  return (
    <Box
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--color-bg-primary)",
        padding: 24,
      }}
    >
      <Stack align="center" gap={4} mb={8}>
        <Group gap={8}>
          <NrcLogoMark size={32} />
          <Text fw={700} size="xl" c="#E85D3D" style={{ letterSpacing: "-0.025em" }}>
            CLEAR
          </Text>
        </Group>
      </Stack>
      <Box w="100%" maw={480}>
        {children}
      </Box>
    </Box>
  );
}
