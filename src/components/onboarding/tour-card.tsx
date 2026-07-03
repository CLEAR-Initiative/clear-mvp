"use client";

import { Box, Button, Group, Stack, Text, UnstyledButton } from "@mantine/core";
import { useTranslations } from "next-intl";

interface TourCardProps {
  title: string;
  body: string;
  stepIndex: number;
  totalSteps: number;
  showBack: boolean;
  primaryLabel: string;
  primaryDark?: boolean;
  skipLabel: string;
  onBack: () => void;
  onPrimary: () => void;
  onSkip: () => void;
}

function ProgressDots({ activeIndex, total }: { activeIndex: number; total: number }) {
  return (
    <Group gap={6}>
      {Array.from({ length: total }, (_, i) => (
        <Box
          key={i}
          style={{
            width: i === activeIndex ? 24 : 6,
            height: 6,
            borderRadius: 9999,
            background: i === activeIndex ? "#ff5a1f" : "#e4e4e7",
            transition: "width 150ms ease",
          }}
        />
      ))}
    </Group>
  );
}

export function TourCard({
  title,
  body,
  stepIndex,
  totalSteps,
  showBack,
  primaryLabel,
  primaryDark = false,
  skipLabel,
  onBack,
  onPrimary,
  onSkip,
}: TourCardProps) {
  const t = useTranslations("onboarding.tour");

  return (
    <Box
      style={{
        width: "min(340px, calc(100vw - 32px))",
        background: "white",
        borderRadius: 16,
        border: "1px solid white",
        boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
        overflow: "hidden",
        pointerEvents: "auto",
      }}
    >
      <Box h={6} bg="#ff5a1f" />
      <Stack gap={12} p={24} pb={16}>
        <Text fw={700} size="lg" c="#161618" lh="28px">
          {title}
        </Text>
        <Text size="sm" c="#71717a" lh="22.75px">
          {body}
        </Text>
        <Group justify="space-between" align="center" pt={8} wrap="nowrap">
          <ProgressDots activeIndex={stepIndex} total={totalSteps} />
          <Group gap={12} wrap="nowrap">
            {showBack && (
              <UnstyledButton onClick={onBack}>
                <Text fw={700} size="sm" c="#71717a">
                  {t("back")}
                </Text>
              </UnstyledButton>
            )}
            <Button
              onClick={onPrimary}
              radius="md"
              size="sm"
              px={primaryDark ? 32 : 24}
              styles={{
                root: {
                  background: primaryDark ? "#161618" : "#ff5a1f",
                  fontWeight: 700,
                  boxShadow: primaryDark
                    ? "0 10px 15px -3px rgba(22, 22, 24, 0.2)"
                    : "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                },
              }}
            >
              {primaryLabel}
            </Button>
          </Group>
        </Group>
      </Stack>
      <Box
        py={12}
        style={{
          background: "#f4f4f5",
          borderTop: "1px solid #e4e4e7",
          textAlign: "center",
        }}
      >
        <UnstyledButton onClick={onSkip}>
          <Text fw={700} size="xs" c="#a1a1aa">
            {skipLabel}
          </Text>
        </UnstyledButton>
      </Box>
    </Box>
  );
}
