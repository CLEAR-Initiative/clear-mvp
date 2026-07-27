import type { ReactNode } from "react";
import { Box, Text } from "@mantine/core";
import { IconAlertTriangle } from "@tabler/icons-react";

interface EntityNotFoundProps {
  title: string;
  description: string;
  action?: ReactNode;
}

/** Centered empty state for bad / missing entity detail URLs. */
export function EntityNotFound({ title, description, action }: EntityNotFoundProps) {
  return (
    <Box
      style={{
        flex: 1,
        alignSelf: "stretch",
        width: "100%",
        minHeight: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        padding: 48,
        boxSizing: "border-box",
      }}
    >
      <IconAlertTriangle
        size={40}
        color="var(--color-warning, #D97706)"
        style={{ marginBottom: 16 }}
      />
      <Text fw={600} size="lg">
        {title}
      </Text>
      <Text size="sm" c="var(--color-text-muted)" mt={8}>
        {description}
      </Text>
      {action}
    </Box>
  );
}
