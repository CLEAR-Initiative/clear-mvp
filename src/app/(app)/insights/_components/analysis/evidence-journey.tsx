"use client";

import { Tooltip } from "@mantine/core";
import { useFormatter, useTranslations } from "next-intl";
import {
  IconAlertTriangle,
  IconCheck,
  IconCircleDashed,
  IconCloudUpload,
  IconFileSearch,
  IconLoader2,
  IconQuote,
  type Icon,
} from "@tabler/icons-react";
import type { EvidenceJourney as Journey } from "~/lib/evidence-journey";
import styles from "./dark/analysis-dark.module.css";

type StepState = "done" | "now" | "todo" | "fail" | "off";

const STEP_CLASS: Record<StepState, string | undefined> = {
  done: styles.stepDone,
  now: styles.stepNow,
  todo: undefined,
  fail: styles.stepFail,
  off: styles.stepOff,
};

const LABEL_CLASS: Record<StepState, string | undefined> = {
  done: styles.journeyDone,
  now: styles.journeyNow,
  todo: undefined,
  fail: styles.journeyFail,
  off: styles.journeyOff,
};

/** The three steps for a stage: each step's state and the icon it shows. */
function stepsFor(stage: Journey["stage"]): [StepState, Icon, boolean][] {
  switch (stage) {
    case "uploading":
      return [["now", IconLoader2, true], ["todo", IconFileSearch, false], ["todo", IconQuote, false]];
    case "failed":
      return [["fail", IconAlertTriangle, false], ["todo", IconFileSearch, false], ["todo", IconQuote, false]];
    case "processing":
      return [["done", IconCloudUpload, false], ["now", IconLoader2, true], ["todo", IconQuote, false]];
    case "cited":
      return [["done", IconCloudUpload, false], ["done", IconFileSearch, false], ["done", IconQuote, false]];
    case "notInUpdate":
      return [["done", IconCloudUpload, false], ["done", IconFileSearch, false], ["off", IconCircleDashed, false]];
  }
}

/**
 * Upload, processing, analysis: where an evidence PDF is on its way into the
 * analysis, at the bottom of its card. Only the current step is labelled; the
 * tooltip lists every step.
 */
export function EvidenceJourney({
  journey,
  addedAt,
  generatedAt,
  onRetry,
  onOpenSources,
}: {
  journey: Journey;
  addedAt: string;
  generatedAt: string | null;
  /** Upload again. Absent when this browser no longer has the file. */
  onRetry?: () => void;
  onOpenSources?: () => void;
}) {
  const t = useTranslations("analysis.layout.journey");
  const format = useFormatter();
  const time = (iso: string | null) => (iso ? format.dateTime(new Date(iso), { dateStyle: "medium", timeStyle: "short" }) : "");
  const { stage, citation } = journey;
  const steps = stepsFor(stage);
  const current = steps.find(([state]) => state !== "done") ?? steps[2]!;
  const labelState = stage === "cited" ? "done" : current[0];

  const label = {
    uploading: t("uploading"),
    failed: t("failed"),
    processing: t("processing"),
    cited: t("cited", { n: citation ?? 0 }),
    notInUpdate: t("notInUpdate"),
  }[stage];

  const detail: [StepState, string, string, string?][] = [
    stage === "uploading"
      ? ["now", t("uploading"), ""]
      : stage === "failed"
        ? ["fail", t("failed"), time(addedAt), t("failedDetail")]
        : ["done", t("uploaded"), time(addedAt)],
    stage === "processing"
      ? ["now", t("processing"), "", t("processingDetail")]
      : stage === "cited" || stage === "notInUpdate"
        ? ["done", t("processed"), ""]
        : ["todo", t("processing"), ""],
    stage === "cited"
      ? ["done", t("citedStep"), time(generatedAt), t("citedDetail", { n: citation ?? 0 })]
      : stage === "notInUpdate"
        ? ["off", t("notInUpdate"), time(generatedAt), t("notInUpdateDetail")]
        : ["todo", t("analysis"), ""],
  ];

  const tip = (
    <span className={styles.journeyTip}>
      {detail.map(([state, title, when, note]) => {
        const RowIcon = state === "done" ? IconCheck : state === "fail" ? IconAlertTriangle : state === "now" ? IconLoader2 : IconCircleDashed;
        return (
          <span key={title} className={styles.journeyTipRow}>
            <RowIcon size={14} className={styles.journeyTipIcon} />
            <span>
              {title}
              {note && <span className={styles.journeyTipNote}>{note}</span>}
            </span>
            <span className={styles.journeyTipTime}>{when}</span>
          </span>
        );
      })}
    </span>
  );

  return (
    <span className={styles.journey} data-testid="evidence-journey" data-stage={stage}>
      <Tooltip label={tip} withArrow multiline w={300} position="top-end">
        <span className={styles.journeySteps} tabIndex={0} aria-label={label}>
          {steps.map(([state, StepIcon, spin], i) => (
            <span key={i} className={styles.journeyStepWrap}>
              {i > 0 && <span className={steps[i - 1]![0] === "done" ? `${styles.journeyLink} ${styles.journeyLinkDone}` : styles.journeyLink} />}
              <span className={[styles.journeyStep, STEP_CLASS[state], spin ? styles.journeySpin : undefined].filter(Boolean).join(" ")}>
                <StepIcon size={14} />
              </span>
            </span>
          ))}
        </span>
      </Tooltip>
      {stage === "cited" && onOpenSources ? (
        <button type="button" className={`${styles.journeyLabel} ${styles.journeyLabelLink} ${LABEL_CLASS[labelState] ?? ""}`} onClick={onOpenSources}>
          {label}
        </button>
      ) : (
        <span className={`${styles.journeyLabel} ${LABEL_CLASS[labelState] ?? ""}`}>{label}</span>
      )}
      {stage === "failed" && onRetry && (
        <button type="button" className={styles.journeyAction} onClick={onRetry}>
          {t("retry")}
        </button>
      )}
    </span>
  );
}
