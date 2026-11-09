"use client";

import { Tooltip } from "@mantine/core";
import { useFormatter, useTranslations } from "next-intl";
import { IconRoute } from "@tabler/icons-react";
import type { GqlSignalLocationChallenge } from "~/lib/types/graphql";

/**
 * A small route icon after a Signal's place name, for a place that moves:
 * grey while a location change waits for a decision, green once an admin
 * changed the location. An open change wins, since it is what happens next.
 * Nothing otherwise.
 */
export function LocationChangeIndicator({
  challenge,
  correctedAt,
}: {
  /** The Signal's open change, if any. */
  challenge: GqlSignalLocationChallenge | null | undefined;
  /** When a decision last wrote the Signal's location, if one did. */
  correctedAt: string | null | undefined;
}) {
  const t = useTranslations("locationChallenge");
  const format = useFormatter();
  if (!challenge && !correctedAt) return null;

  let label: string;
  if (challenge) {
    const place =
      challenge.proposedName ??
      (challenge.proposedLat != null && challenge.proposedLng != null
        ? `${challenge.proposedLat.toFixed(5)}, ${challenge.proposedLng.toFixed(5)}`
        : null);
    label = place ? t("indicator.requestedTo", { place }) : t("indicator.requested");
  } else {
    label = t("indicator.changed", { date: format.dateTime(new Date(correctedAt!), "short") });
  }

  return (
    <Tooltip label={label} withArrow multiline maw={260} fz="xs" events={{ hover: true, focus: true, touch: true }}>
      <span
        role="img"
        aria-label={label}
        tabIndex={0}
        data-testid="location-change-indicator"
        data-state={challenge ? "requested" : "changed"}
        style={{ display: "inline-flex" }}
      >
        <IconRoute
          size={13}
          color={challenge ? "var(--color-text-muted)" : "var(--color-success)"}
        />
      </span>
    </Tooltip>
  );
}
