"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Drawer, Box, Group, Text, ActionIcon } from "@mantine/core";
import { IconX, IconExternalLink, IconCopy, IconCheck } from "@tabler/icons-react";
import { api } from "~/trpc/react";
import { SignalDetailContent } from "./signal-detail-content";

interface SignalDetailDrawerProps {
  signalId: string | null;
  opened: boolean;
  onClose: () => void;
}

export function SignalDetailDrawer({ signalId, opened, onClose }: SignalDetailDrawerProps) {
  const router = useRouter();
  const [urlCopied, setUrlCopied] = useState(false);

  const signalQuery = api.signals.get.useQuery(
    { id: signalId! },
    { enabled: signalId != null && opened },
  );

  return (
    <Drawer
      opened={opened}
      onClose={onClose}
      position="right"
      size="min(680px, 85vw)"
      withCloseButton={false}
      styles={{
        body: { padding: 0, height: "100%" },
        content: { display: "flex", flexDirection: "column" },
      }}
    >
      <Box
        px={20}
        py={12}
        style={{
          background: "var(--color-bg-white)",
          borderBottom: "1px solid var(--color-border)",
          flexShrink: 0,
        }}
      >
        <Group justify="space-between">
          <Text fw={600} c="var(--color-text-primary)" size="sm">
            Signal Details
          </Text>
          <Group gap={8}>
            <ActionIcon
              variant="subtle"
              color={urlCopied ? "green" : "gray"}
              size="sm"
              onClick={() => {
                if (signalId == null) return;
                void navigator.clipboard.writeText(`${window.location.origin}/signal/${signalId}`);
                setUrlCopied(true);
                setTimeout(() => setUrlCopied(false), 1500);
              }}
              title={urlCopied ? "Copied!" : "Copy link"}
            >
              {urlCopied ? <IconCheck size={16} /> : <IconCopy size={16} />}
            </ActionIcon>
            <ActionIcon
              variant="subtle"
              color="gray"
              size="sm"
              onClick={() => { if (signalId == null) return; router.push(`/signal/${signalId}`); }}
              title="Open as full page"
            >
              <IconExternalLink size={16} />
            </ActionIcon>
            <ActionIcon variant="subtle" color="gray" size="sm" onClick={onClose}>
              <IconX size={16} />
            </ActionIcon>
          </Group>
        </Group>
      </Box>

      <Box style={{ flex: 1, overflowY: "auto" }}>
        <SignalDetailContent
          signal={signalQuery.data}
          loading={signalQuery.isLoading}
          mode="drawer"
        />
      </Box>
    </Drawer>
  );
}
