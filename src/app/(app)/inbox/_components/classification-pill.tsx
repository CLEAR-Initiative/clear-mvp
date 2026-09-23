"use client";

import { useTranslations } from "next-intl";
import type { InboxClassification } from "~/lib/hotline-inbox";

const STYLES: Record<InboxClassification, { bg: string; color: string }> = {
  field_report: { bg: "var(--color-critical-light)", color: "var(--color-critical)" },
  unclassified: { bg: "var(--color-warning-light)", color: "var(--color-warning)" },
  chatter:      { bg: "var(--color-bg-muted)",       color: "var(--color-text-muted)" },
  news_digest:  { bg: "var(--color-info-light)",     color: "var(--color-info)" },
  operational:  { bg: "var(--color-success-light)",  color: "var(--color-success)" },
};

export function InboxClassificationPill({ value }: { value: InboxClassification }) {
  const t = useTranslations("inbox");
  const style = STYLES[value];
  return (
    <span
      data-testid="inbox-classification-pill"
      style={{
        display: "inline-block",
        padding: "2px 8px",
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: "0.03em",
        textTransform: "uppercase",
        whiteSpace: "nowrap",
        background: style.bg,
        color: style.color,
      }}
    >
      {t(`classifications.${value}`)}
    </span>
  );
}
