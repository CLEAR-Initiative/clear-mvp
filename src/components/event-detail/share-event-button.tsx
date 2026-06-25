"use client";

import { useEffect, useState } from "react";
import {
  Button,
  Modal,
  Stack,
  Text,
  Group,
  CopyButton,
  TextInput,
  Loader,
  ActionIcon,
} from "@mantine/core";
import {
  IconShare,
  IconCheck,
  IconCopy,
  IconExternalLink,
} from "@tabler/icons-react";
import { api } from "~/trpc/react";

interface ShareEventButtonProps {
  eventId: string;
}

/**
 * "Share publicly" entry point on the event detail page.
 *
 * On modal open we first look up an existing live link for this event
 * via `events.existingPublicLink` — the typical case is "Alice
 * already shared this last week, let's reuse her token". If none
 * exists we mint a fresh one with `events.createPublicLink`. Either
 * way the user sees one URL with copy / open-in-new-tab / revoke
 * affordances.
 *
 * Closing the modal does NOT revoke the link. Revocation is its own
 * action that admins can invoke from the same modal via the "Revoke"
 * button.
 */
export function ShareEventButton({ eventId }: ShareEventButtonProps) {
  const [opened, setOpened] = useState(false);
  const [link, setLink] = useState<{
    token: string;
    url: string;
    expiresAt: string;
  } | null>(null);
  const utils = api.useUtils();

  // Reuses an existing Redis-cached link when present. Disabled until
  // the modal is open and we don't already hold a link in state, so
  // closing + reopening doesn't fire it again unnecessarily.
  const existingQuery = api.events.existingPublicLink.useQuery(
    { eventId },
    { enabled: opened && !link, staleTime: 0 },
  );

  const createLink = api.events.createPublicLink.useMutation({
    onSuccess: (res) => setLink(res),
  });
  const revokeLink = api.events.revokePublicLink.useMutation({
    onSuccess: () => {
      setLink(null);
      // Invalidate the existing-link cache so a subsequent reopen
      // sees the post-revoke state.
      void utils.events.existingPublicLink.invalidate({ eventId });
    },
  });

  // Pull the existing link into local state once the query resolves.
  // Use a separate effect rather than reading directly from the query
  // so revoke + remint can still take their own paths cleanly.
  useEffect(() => {
    if (existingQuery.data && !link) {
      setLink(existingQuery.data);
    }
  }, [existingQuery.data, link]);

  // Auto-mint when the lookup confirms there's no live link. Runs
  // exactly once per modal-open cycle (gated on `opened && !link` +
  // the query resolving with `null`).
  useEffect(() => {
    if (
      opened &&
      !link &&
      existingQuery.isFetched &&
      existingQuery.data === null &&
      !createLink.isPending &&
      !createLink.isError
    ) {
      createLink.mutate({ eventId });
    }
  }, [
    opened,
    link,
    existingQuery.isFetched,
    existingQuery.data,
    createLink,
    eventId,
  ]);

  const handleOpen = () => setOpened(true);

  const handleClose = () => {
    setOpened(false);
    // Discard the in-memory token so the next open re-runs the
    // existing-link lookup. The link itself stays alive in Redis
    // until it expires or the user revokes.
    setLink(null);
  };

  const handleRevoke = () => {
    if (!link) return;
    revokeLink.mutate({ eventId, token: link.token });
  };

  const isLoading =
    existingQuery.isLoading ||
    (existingQuery.isFetched && existingQuery.data === null && createLink.isPending);

  const expiryHint = link
    ? new Date(link.expiresAt).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "";

  return (
    <>
      <Button
        variant="light"
        color="gray"
        size="xs"
        leftSection={<IconShare size={13} />}
        fullWidth
        style={{ fontSize: 12 }}
        onClick={handleOpen}
      >
        Share publicly
      </Button>

      <Modal
        opened={opened}
        onClose={handleClose}
        title="Public share link"
        size="md"
        centered
      >
        <Stack gap={16}>
          <Text size="sm" c="var(--color-text-muted)">
            Anyone with this link can view a snapshot of this event
            (title, description, location and severity — no signals,
            comments, or attached alerts). Links live for up to 30 days.
          </Text>

          {isLoading && !link && (
            <Group gap={8} justify="center" py={16}>
              <Loader size="sm" />
              <Text size="sm" c="var(--color-text-muted)">
                {existingQuery.isLoading
                  ? "Looking up existing link…"
                  : "Generating link…"}
              </Text>
            </Group>
          )}

          {existingQuery.isError && !link && (
            <Text size="sm" c="var(--color-critical)">
              Could not look up an existing link.{" "}
              {existingQuery.error.message}
            </Text>
          )}

          {createLink.isError && !link && (
            <Text size="sm" c="var(--color-critical)">
              Could not generate the link. {createLink.error.message}
            </Text>
          )}

          {link && (
            <Stack gap={8}>
              <Group gap={6} wrap="nowrap">
                <TextInput
                  value={link.url}
                  readOnly
                  style={{ flex: 1 }}
                  styles={{
                    input: { fontFamily: "monospace", fontSize: 12 },
                  }}
                  onFocus={(e) => e.currentTarget.select()}
                />
                <CopyButton value={link.url} timeout={1800}>
                  {({ copied, copy }) => (
                    <ActionIcon
                      variant={copied ? "filled" : "default"}
                      color={copied ? "teal" : "gray"}
                      size="lg"
                      onClick={copy}
                      title={copied ? "Copied" : "Copy URL"}
                    >
                      {copied ? (
                        <IconCheck size={16} />
                      ) : (
                        <IconCopy size={16} />
                      )}
                    </ActionIcon>
                  )}
                </CopyButton>
                <ActionIcon
                  variant="default"
                  color="gray"
                  size="lg"
                  component="a"
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Open in new tab"
                >
                  <IconExternalLink size={16} />
                </ActionIcon>
              </Group>
              <Text size="xs" c="var(--color-text-muted)">
                Link expires on {expiryHint}.
              </Text>

              <Group justify="flex-end" mt={4}>
                <Button
                  variant="subtle"
                  color="red"
                  size="xs"
                  onClick={handleRevoke}
                  loading={revokeLink.isPending}
                >
                  Revoke this link
                </Button>
              </Group>
            </Stack>
          )}
        </Stack>
      </Modal>
    </>
  );
}
