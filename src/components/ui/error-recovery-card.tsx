"use client";

import { Box, Button, Text } from "@mantine/core";
import { useTranslations } from "next-intl";

interface ErrorRecoveryCardProps {
  reset: () => void;
}

/** Minimal themed recovery UI for route error boundaries (ADR-0002 tokens). */
export function ErrorRecoveryCard({ reset }: ErrorRecoveryCardProps) {
  const t = useTranslations("common");

  return (
    <Box
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        gap: 12,
        padding: 24,
        maxWidth: 420,
        margin: "48px auto",
        background: "var(--color-bg-white)",
        border: "1px solid var(--color-border)",
        borderRadius: 8,
      }}
    >
      <Text fw={700} c="var(--color-text-primary)" style={{ fontSize: 18 }}>
        {t("states.error")}
      </Text>
      <Text size="sm" c="var(--color-text-muted)">
        {t("errorBoundary.description")}
      </Text>
      <Button
        size="sm"
        onClick={reset}
        style={{
          background: "var(--color-accent)",
          borderColor: "var(--color-accent)",
        }}
      >
        {t("actions.retry")}
      </Button>
    </Box>
  );
}
