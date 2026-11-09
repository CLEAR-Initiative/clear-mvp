"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";
import { Box, Button, Card, Group, Stack, Text } from "@mantine/core";
import { IconAlertTriangle, IconRefresh } from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import { isChunkLoadError, reloadOnceForChunkError } from "~/lib/chunk-load-error";

/**
 * What a route error boundary (`error.tsx`) shows instead of Next's blank
 * "Application error" page. It reports the error to Sentry and, when the
 * error is a stale chunk from a deploy, reloads once (see chunk-load-error).
 * If the reload is refused (it already happened a moment ago), the card stays
 * up with a Reload button.
 */
export function RouteErrorView({
  error,
  reset,
  fullScreen = false,
}: {
  error: Error & { digest?: string };
  reset: () => void;
  /** Fill the viewport. Use it where the app shell (nav) isn't rendered. */
  fullScreen?: boolean;
}) {
  const t = useTranslations("errorBoundary");
  const stale = isChunkLoadError(error);

  useEffect(() => {
    Sentry.captureException(error, {
      tags: { boundary: "route", chunk_load: String(stale) },
    });
    reloadOnceForChunkError(error);
  }, [error, stale]);

  return (
    <Box
      role="alert"
      data-testid="route-error"
      style={{
        minHeight: fullScreen ? "100vh" : "60vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        backgroundColor: "var(--color-bg-primary)",
      }}
    >
      <Card
        p="xl"
        maw={440}
        w="100%"
        style={{ border: "1px solid var(--color-border)" }}
      >
        <Stack align="center" gap={12}>
          <IconAlertTriangle size={40} stroke={1.5} color="var(--color-warning)" />
          <Text size="lg" fw={600} c="var(--color-text-primary)" ta="center">
            {stale ? t("updatedTitle") : t("title")}
          </Text>
          <Text size="sm" c="var(--color-text-muted)" ta="center" maw={360}>
            {stale ? t("updatedMessage") : t("message")}
          </Text>
          <Group gap={8} mt={8}>
            <Button
              leftSection={<IconRefresh size={16} />}
              onClick={() => window.location.reload()}
            >
              {t("reload")}
            </Button>
            {/* Re-rendering can't fetch a chunk that no longer exists. */}
            {!stale && (
              <Button variant="default" onClick={reset}>
                {t("tryAgain")}
              </Button>
            )}
          </Group>
          {error.digest && (
            <Text size="xs" c="var(--color-text-muted)" ff="monospace">
              {t("reference", { digest: error.digest })}
            </Text>
          )}
        </Stack>
      </Card>
    </Box>
  );
}
