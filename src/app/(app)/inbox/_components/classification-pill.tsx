"use client";

import type { CSSProperties } from "react";
import { useTranslations } from "next-intl";
import { IconAlertTriangle } from "@tabler/icons-react";
import type { InboxClassification, InboxEntry, InboxFailure } from "~/lib/hotline-inbox";

const STYLES: Record<InboxClassification, { bg: string; color: string }> = {
  field_report: { bg: "var(--color-critical-light)", color: "var(--color-critical)" },
  unclassified: { bg: "var(--color-warning-light)", color: "var(--color-warning)" },
  chatter:      { bg: "var(--color-bg-muted)",       color: "var(--color-text-muted)" },
  news_digest:  { bg: "var(--color-info-light)",     color: "var(--color-info)" },
  operational:  { bg: "var(--color-success-light)",  color: "var(--color-success)" },
};

const PILL: CSSProperties = {
  display: "inline-block",
  padding: "2px 8px",
  borderRadius: 999,
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: "0.03em",
  textTransform: "uppercase",
  whiteSpace: "nowrap",
};

export function InboxClassificationPill({ value }: { value: InboxClassification }) {
  const t = useTranslations("inbox");
  const style = STYLES[value];
  return (
    <span
      data-testid="inbox-classification-pill"
      style={{ ...PILL, background: style.bg, color: style.color }}
    >
      {t(`classifications.${value}`)}
    </span>
  );
}

/** One line per failed stage, e.g. "Transcription: upstream timeout". */
export function useFailureSummary(): (failures: readonly InboxFailure[]) => string {
  const t = useTranslations("inbox");
  return (failures) =>
    failures.map((f) => `${t(`failure.stages.${f.stage}`)}: ${f.error ?? t("failure.noError")}`).join("\n");
}

/**
 * "Classification failed": the pipeline gave up on a message and it left
 * the queue for good. Outlined in the danger token so it reads apart from
 * both the warning-toned "Unclassified" (still queued) and the filled
 * field-report pill. The error text rides on the tooltip; the reading
 * pane shows it in full next to the Retry action.
 */
export function InboxFailedPill({ failures }: { failures: readonly InboxFailure[] }) {
  const t = useTranslations("inbox");
  const summary = useFailureSummary();
  return (
    <span
      data-testid="inbox-failed-pill"
      title={summary(failures)}
      style={{
        ...PILL,
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: "1px 7px",
        border: "1px solid var(--color-critical)",
        background: "transparent",
        color: "var(--color-critical)",
      }}
    >
      <IconAlertTriangle size={11} aria-hidden />
      {t("failure.pill")}
    </span>
  );
}

/** An entry's pills: its classification, plus the failed pill when the
 * pipeline gave up on a message. "Unclassified" is dropped once the entry
 * has failed: the failed pill says why it has no label. */
export function InboxEntryPills({ entry }: { entry: Pick<InboxEntry, "classification" | "processing" | "failures"> }) {
  const failed = entry.processing === "failed";
  return (
    <>
      {!(failed && entry.classification === "unclassified") && (
        <InboxClassificationPill value={entry.classification} />
      )}
      {failed && <InboxFailedPill failures={entry.failures} />}
    </>
  );
}
