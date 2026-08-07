"use client";

import { Group, Text } from "@mantine/core";
import { IconHistory } from "@tabler/icons-react";

/**
 * A one-line "what changed" note under a section, rendered only when the
 * pipeline produced a note for it. The note itself is generated pipeline-side
 * (one call diffing the prior vs current snapshot); this just displays it.
 * Renders nothing when there's no note, so it stays invisible until the
 * pipeline ships the change-notes and degrades cleanly on old snapshots.
 */
export function SectionChange({ note }: { note?: string }) {
  if (!note) return null;
  return (
    <Group
      gap={7}
      align="flex-start"
      wrap="nowrap"
      mt={8}
      px={10}
      py={6}
      style={{
        background: "var(--color-bg-muted)",
        borderRadius: 7,
        borderLeft: "2px solid var(--color-accent)",
      }}
    >
      <IconHistory size={13} color="var(--color-accent)" style={{ flexShrink: 0, marginTop: 2 }} />
      <Text c="var(--color-text-secondary)" style={{ fontSize: 12, lineHeight: 1.45 }}>
        {note}
      </Text>
    </Group>
  );
}
