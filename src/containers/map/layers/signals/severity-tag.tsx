"use client";

import { Badge } from "@mantine/core";
import { useTranslations } from "next-intl";
import { SEVERITY_TOKENS } from "./severity-tokens";
import type { SeverityBucket } from "./to-features";

function tagColors(severity: SeverityBucket) {
  if (severity === "unknown") return { background: "var(--color-bg-muted)", color: "var(--color-text-muted)" };
  return { background: `var(${SEVERITY_TOKENS[severity]})`, color: "var(--color-severity-on)" };
}

export function SeverityTag({ severity }: { severity: SeverityBucket }) {
  const t = useTranslations("common.severities");

  return (
    <Badge size="xs" radius="xl" tt="uppercase" fw={700} style={tagColors(severity)}>
      {t(severity)}
    </Badge>
  );
}
