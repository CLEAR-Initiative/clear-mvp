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
            width: i === activeIndex ? 20 : 6,
            height: 6,
            borderRadius: 9999,
            background: i === activeIndex ? "#161618" : "#d4d4d8",
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
        background: "#ffffff",
        borderRadius: 12,
        border: "1px solid #e4e4e7",
        boxShadow: "0 16px 40px -12px rgba(0, 0, 0, 0.28)",
        overflow: "hidden",
        pointerEvents: "auto",
      }}
    >
      <Stack gap={12} p={20} pb={14}>
        <Text fw={700} size="md" c="#09090b" lh="24px">
          {title}
        </Text>
        <Text size="sm" c="#3f3f46" lh="22px">
          {body}
        </Text>
        <Group justify="space-between" align="center" pt={4} wrap="nowrap">
          <ProgressDots activeIndex={stepIndex} total={totalSteps} />
          <Group gap={12} wrap="nowrap">
            {showBack && (
              <UnstyledButton onClick={onBack}>
                <Text fw={600} size="sm" c="#52525b">
                  {t("back")}
                </Text>
              </UnstyledButton>
            )}
            <Button
              onClick={onPrimary}
              radius="md"
              size="sm"
              px={primaryDark ? 28 : 20}
              styles={{
                root: {
                  background: "#161618",
                  color: "#ffffff",
                  fontWeight: 700,
                  border: "1px solid #161618",
                  boxShadow: "none",
                },
              }}
            >
              {primaryLabel}
            </Button>
          </Group>
        </Group>
      </Stack>
      <Box
        py={10}
        style={{
          background: "#fafafa",
          borderTop: "1px solid #f4f4f5",
          textAlign: "center",
        }}
      >
        <UnstyledButton onClick={onSkip}>
          <Text fw={600} size="xs" c="#71717a">
            {skipLabel}
          </Text>
        </UnstyledButton>
      </Box>
    </Box>
  );
}
