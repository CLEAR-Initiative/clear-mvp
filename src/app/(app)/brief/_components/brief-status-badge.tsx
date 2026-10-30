"use client";

import { useTranslations } from "next-intl";
import { Badge } from "@mantine/core";
import type { BriefStatus } from "~/lib/brief/types";

/** Draft or sent, in theme tokens. */
export function BriefStatusBadge({ status }: { status: BriefStatus }) {
  const t = useTranslations("brief");
  const tone = status === "sent" ? "success" : "warning";
  return (
    <Badge
      size="sm"
      variant="light"
      style={{ background: `var(--color-${tone}-light)`, color: `var(--color-${tone})` }}
      data-testid="brief-status"
    >
      {t(`status.${status}`)}
    </Badge>
  );
}
