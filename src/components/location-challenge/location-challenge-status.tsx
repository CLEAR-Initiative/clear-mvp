"use client";

import { Badge, Group, Text } from "@mantine/core";
import { useTranslations } from "next-intl";
import { IconMapPinOff } from "@tabler/icons-react";
import type { GqlSignalLocationChallenge } from "~/lib/types/graphql";

interface LocationChallengeStatusProps {
  challenge: GqlSignalLocationChallenge | null | undefined;
  compact?: boolean;
}

export function LocationChallengeStatus({
  challenge,
  compact = false,
}: LocationChallengeStatusProps) {
  const t = useTranslations("locationChallenge");
  if (!challenge) return null;

  const label = challenge.hasProposedPoint
    ? t("status.correctionQueued")
    : t("status.challenged");

  return (
    <Group gap={6} wrap="nowrap">
      <Badge
        size={compact ? "xs" : "sm"}
        leftSection={<IconMapPinOff size={compact ? 10 : 12} />}
        style={{
          background: "var(--color-warning-light)",
          color: "#B45309",
          fontWeight: 600,
          textTransform: "none",
          border: "1px solid #D9770633",
        }}
      >
        {label}
      </Badge>
      {!compact && challenge.proposedName && (
        <Text size="xs" c="var(--color-text-muted)" lineClamp={1}>
          {challenge.proposedName}
        </Text>
      )}
    </Group>
  );
}
