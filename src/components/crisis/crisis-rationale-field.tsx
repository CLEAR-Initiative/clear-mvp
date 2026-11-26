"use client";

import { useTranslations } from "next-intl";
import { Textarea } from "@mantine/core";
import { CRISIS_RATIONALE_MAX } from "~/lib/crisis/rationale";

interface CrisisRationaleFieldProps {
  value: string;
  onChange: (value: string) => void;
  /** "create" asks why these events are a crisis; "add" why an event belongs. */
  mode: "create" | "add";
  autoFocus?: boolean;
}

/**
 * The required "why" for creating a crisis or adding events to one. clear-api
 * refuses the change without it and keeps it in the decision log.
 */
export function CrisisRationaleField({ value, onChange, mode, autoFocus }: CrisisRationaleFieldProps) {
  const t = useTranslations("eventDetail.addToCrisis");
  return (
    <Textarea
      label={mode === "create" ? t("rationaleLabelCreate") : t("rationaleLabelAdd")}
      description={t("rationaleHint")}
      placeholder={t("rationalePlaceholder")}
      value={value}
      onChange={(e) => onChange(e.currentTarget.value)}
      maxLength={CRISIS_RATIONALE_MAX}
      autosize
      minRows={3}
      maxRows={8}
      required
      autoFocus={autoFocus}
      data-testid="crisis-rationale-input"
    />
  );
}
