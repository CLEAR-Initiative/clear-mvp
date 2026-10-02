"use client";

import { Box, Loader, Text } from "@mantine/core";

/** Bordered centred message for empty, error and generating states. */
export function Notice({
  title,
  text,
  loading,
  testId,
}: {
  title?: string;
  text: string;
  loading?: boolean;
  testId?: string;
}) {
  return (
    <Box
      p={32}
      style={{ border: "1px solid var(--color-border)", background: "var(--color-bg-white)", textAlign: "center" }}
      data-testid={testId}
    >
      {loading && <Loader size="sm" mb={12} />}
      {title && (
        <Text fw={600} c="var(--color-text-primary)" mb={8}>
          {title}
        </Text>
      )}
      <Text c="var(--color-text-secondary)" style={{ fontSize: 13 }}>
        {text}
      </Text>
    </Box>
  );
}
