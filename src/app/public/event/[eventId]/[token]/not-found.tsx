import { Box, Stack, Text } from "@mantine/core";

/**
 * Rendered whenever `publicEvent(eventId, token)` returns null —
 * link revoked, expired, evicted from Redis, or simply mistyped.
 * Same UX for all four cases so a leaked URL can't probe for which
 * of the four it is.
 */
export default function PublicEventNotFound() {
  return (
    <Box
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 32,
        background: "var(--color-bg-primary)",
      }}
    >
      <Stack gap={12} align="center" maw={420} ta="center">
        <Box
          style={{
            width: 40,
            height: 40,
            borderRadius: 999,
            background: "#E85D3D",
            color: "white",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 800,
            fontSize: 18,
          }}
        >
          C
        </Box>
        <Text fz={22} fw={700}>
          This share link has expired
        </Text>
        <Text size="sm" c="var(--color-text-muted)">
          Public CLEAR event links live for up to 30 days. Ask whoever
          shared this with you to send a fresh link.
        </Text>
      </Stack>
    </Box>
  );
}
