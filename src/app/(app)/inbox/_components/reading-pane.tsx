"use client";

import { useEffect, useState } from "react";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import {
  IconAlertTriangle,
  IconArchive,
  IconArrowLeft,
  IconCirclePlus,
  IconCircleX,
  IconLanguage,
  IconPaperclip,
  IconRefresh,
  IconShield,
} from "@tabler/icons-react";
import { api } from "~/trpc/react";
import {
  REJECT_REASONS,
  attachmentKey,
  type InboxAttachment,
  type InboxEntry,
  type RejectReason,
  type VoiceTranscript,
} from "~/lib/hotline-inbox";
import { InboxEntryPills } from "./classification-pill";
import { VoiceNote } from "./voice-note";
import styles from "../inbox.module.css";

interface ReadingPaneProps {
  entry: InboxEntry | null;
  canReview: boolean;
  busy: boolean;
  error: string | null;
  rejectOpen: boolean;
  onRejectOpenChange: (open: boolean) => void;
  onAdd: () => void;
  onArchive: () => void;
  onReject: (reason: RejectReason) => void;
  /** Re-queue the entry's failed pipeline stages (retryGroundMessage). */
  onRetry: () => void;
  retrying: boolean;
  retryError: string | null;
  /** Mobile only: return to the list. */
  onBack: () => void;
}

function Attachment({ attachment, index }: { attachment: InboxAttachment; index: number }) {
  const t = useTranslations("inbox");
  const [broken, setBroken] = useState(false);
  if (attachment.kind === "voice") {
    return (
      <VoiceNote
        url={attachment.url}
        label={t("pane.voiceNoteN", { n: index + 1 })}
        transcriptionFailed={attachment.transcript?.status === "failed" ? attachment.transcript : undefined}
      />
    );
  }
  const label = t("pane.attachment", { n: index + 1 });
  return (
    <a
      className={styles.attachment}
      href={attachment.url}
      target="_blank"
      rel="noopener noreferrer"
      title={label}
      data-testid="inbox-attachment"
    >
      {!broken ? (
        // Presigned S3 URL, not an optimisable static asset.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={attachment.url} alt={label} onError={() => setBroken(true)} />
      ) : (
        <>
          <IconPaperclip size={20} />
          <span>{label}</span>
        </>
      )}
    </a>
  );
}

/** A voice note's machine transcript (or its pending / failed state),
 * always labelled as machine output. `dir="auto"` so Arabic transcripts
 * render right-to-left whatever the UI locale. */
function TranscriptBlock({ transcript, caption }: { transcript: VoiceTranscript; caption?: string }) {
  const t = useTranslations("inbox");
  return (
    <div className={styles.transcript} data-testid="inbox-transcript" data-status={transcript.status}>
      {caption && <div className={styles.transcriptCaption}>{caption}</div>}
      <div className={styles.sectionLabel}>{t("pane.transcriptLabel")}</div>
      {transcript.status === "ready" ? (
        <p className={styles.narrative} dir="auto">{transcript.text}</p>
      ) : transcript.status === "failed" ? (
        <p className={styles.transcriptFailed}>
          {t("pane.transcriptFailed")}
          {transcript.error && <span className={styles.failureError} dir="auto">{transcript.error}</span>}
        </p>
      ) : (
        <p className={styles.narrativeEmpty}>{t("pane.transcriptPending")}</p>
      )}
    </div>
  );
}

/**
 * Off until the backend exists: the tRPC procedures below are stubs that
 * always answer "unavailable", so the button could only ever show that.
 * Flip to true once clear-api ships requestGroundMessageTranslation
 * (Exponential #627) and the pipeline drain translates (#626).
 */
export const TRANSLATION_ENABLED = false;

/**
 * The pipeline gave up on one or more of the entry's messages: say which
 * stage failed with the recorded error, and offer the retry that puts the
 * messages back in the queue. Without it a failed entry would sit as
 * "unclassified" forever.
 */
function FailureNotice({
  entry,
  retrying,
  disabled,
  error,
  onRetry,
}: {
  entry: InboxEntry;
  retrying: boolean;
  /** Another action on this entry is in flight. */
  disabled: boolean;
  error: string | null;
  onRetry: () => void;
}) {
  const t = useTranslations("inbox");
  return (
    <div className={styles.failure} data-testid="inbox-failure">
      <div className={styles.failureTitle}>
        <IconAlertTriangle size={14} aria-hidden />
        {t("failure.title")}
      </div>
      <p className={styles.failureHelp}>{t("failure.help")}</p>
      <ul className={styles.failureList}>
        {entry.failures.map((f) => (
          <li key={`${f.messageId}:${f.stage}`} data-testid="inbox-failure-item" data-stage={f.stage}>
            <span className={styles.failureStage}>{t(`failure.stages.${f.stage}`)}</span>
            <span className={styles.failureError} dir="auto">{f.error ?? t("failure.noError")}</span>
          </li>
        ))}
      </ul>
      <div className={styles.failureActions}>
        <button
          type="button"
          className={styles.btn}
          disabled={retrying || disabled}
          onClick={onRetry}
          data-testid="inbox-retry"
        >
          <IconRefresh size={15} />
          {t(retrying ? "failure.retrying" : "failure.retry")}
        </button>
        {error && (
          <span className={styles.actionError} role="alert">
            {error}
          </span>
        )}
      </div>
    </div>
  );
}

/**
 * On-demand translation of the narrative into the reader's UI locale.
 * Request once per entry, poll while queued, render under the original
 * (never instead of it). The tRPC procedures are stubbed server-side
 * until clear-api grows a ground translation entity; the UI is final.
 */
export function TranslationBlock({ entry }: { entry: InboxEntry }) {
  const t = useTranslations("inbox");
  const locale = useLocale();
  const [requested, setRequested] = useState(false);
  useEffect(() => setRequested(false), [entry.id]);

  const request = api.ground.requestTranslation.useMutation();
  const poll = api.ground.translation.useQuery(
    { threadId: entry.id, locale },
    {
      enabled: requested && request.data?.status === "queued",
      refetchInterval: (q) => (q.state.data?.status === "queued" ? 5000 : false),
    },
  );
  const state = poll.data ?? request.data ?? null;

  if (entry.text.length === 0) return null;

  if (!requested) {
    return (
      <button
        type="button"
        className={styles.translateBtn}
        onClick={() => {
          setRequested(true);
          request.mutate({ threadId: entry.id, locale });
        }}
        data-testid="inbox-translate"
      >
        <IconLanguage size={14} />
        {t("translate.button", { locale: t(`translate.locales.${locale}`) })}
      </button>
    );
  }

  return (
    <div className={styles.translation} data-testid="inbox-translation" data-status={state?.status ?? "queued"}>
      <div className={styles.sectionLabel}>
        {t("translate.label", { locale: t(`translate.locales.${locale}`) })}
      </div>
      {state?.status === "ready" && state.text ? (
        <p className={styles.narrative}>{state.text}</p>
      ) : state?.status === "unavailable" || request.isError ? (
        <p className={styles.narrativeEmpty}>{t("translate.unavailable")}</p>
      ) : (
        <p className={styles.narrativeEmpty}>{t("translate.pending")}</p>
      )}
    </div>
  );
}

export function ReadingPane({
  entry,
  canReview,
  busy,
  error,
  rejectOpen,
  onRejectOpenChange,
  onAdd,
  onArchive,
  onReject,
  onRetry,
  retrying,
  retryError,
  onBack,
}: ReadingPaneProps) {
  const t = useTranslations("inbox");
  const format = useFormatter();

  if (!entry) {
    return (
      <section className={styles.pane} data-testid="inbox-pane">
        <div className={styles.paneEmpty}>{t("pane.select")}</div>
      </section>
    );
  }

  return (
    <section className={styles.pane} data-testid="inbox-pane">
      <header className={styles.paneHeader}>
        <div className={styles.paneTitleGroup}>
          <button type="button" className={styles.backBtn} onClick={onBack} aria-label={t("pane.back")}>
            <IconArrowLeft size={16} />
          </button>
          <span className={styles.paneTitle}>{entry.title || t("pane.noText")}</span>
          <InboxEntryPills entry={entry} />
        </div>
        <span className={styles.paneRef}>
          {entry.intakeRef} · {format.dateTime(new Date(entry.sentAt), "short")}
        </span>
      </header>

      <div className={styles.paneBody}>
        {entry.processing === "failed" && (
          <FailureNotice entry={entry} retrying={retrying} disabled={busy} error={retryError} onRetry={onRetry} />
        )}
        {entry.priorEntries > 0 && (
          <div className={styles.trust} data-testid="inbox-trust-line">
            <IconShield size={14} />
            {t("pane.trustRepeat", { count: entry.priorEntries + 1 })}
          </div>
        )}
        {entry.uncertainty && (
          <div className={styles.trust} data-tone="warning">
            <IconShield size={14} />
            {t("pane.uncertainty", { value: entry.uncertainty })}
          </div>
        )}

        {entry.text.length > 0 ? (
          <p className={styles.narrative} data-testid="inbox-narrative">{entry.text}</p>
        ) : (
          <p className={styles.narrativeEmpty}>{t("pane.noText")}</p>
        )}

        {TRANSLATION_ENABLED && <TranslationBlock entry={entry} />}

        {(entry.attachments.length > 0 || entry.omittedMediaCount > 0 || entry.detachedTranscripts.length > 0) && (
          <div>
            <div className={styles.sectionLabel}>{t("pane.attachments")}</div>
            <div className={styles.attachments}>
              {entry.attachments.map((a, i) =>
                a.transcript ? (
                  <div key={attachmentKey(a.url)} className={styles.voiceWithTranscript}>
                    <Attachment attachment={a} index={i} />
                    <TranscriptBlock transcript={a.transcript} />
                  </div>
                ) : (
                  <Attachment key={attachmentKey(a.url)} attachment={a} index={i} />
                ),
              )}
              {entry.detachedTranscripts.map((tr, i) => (
                <div key={`detached-${i}`} className={styles.voiceWithTranscript}>
                  <TranscriptBlock transcript={tr} caption={t("pane.voiceNotStored")} />
                </div>
              ))}
            </div>
            {entry.omittedMediaCount > 0 && (
              <p className={styles.narrativeEmpty} style={{ marginTop: 8 }}>
                {t("pane.omittedMedia", { count: entry.omittedMediaCount })}
              </p>
            )}
          </div>
        )}
      </div>

      {canReview && (
        <footer className={styles.actionBar} data-testid="inbox-action-bar">
          <div className={styles.actionGroup}>
            <button type="button" className={styles.btnPrimary} disabled={busy} onClick={onAdd} data-testid="inbox-add">
              <IconCirclePlus size={15} />
              {t("actions.add")}
            </button>
            <button type="button" className={styles.btn} disabled={busy} onClick={onArchive} data-testid="inbox-archive">
              <IconArchive size={15} />
              {t("actions.archive")}
            </button>
            <button
              type="button"
              className={styles.btnDanger}
              disabled={busy}
              onClick={() => onRejectOpenChange(!rejectOpen)}
              data-testid="inbox-reject"
            >
              <IconCircleX size={15} />
              {t("actions.reject")}
            </button>
            {error && <span className={styles.actionError}>{error}</span>}
          </div>
          <span className={styles.shortcuts}>{t("actions.shortcuts")}</span>

          {rejectOpen && (
            <div className={styles.popover} data-testid="inbox-reject-popover">
              <div className={styles.popoverHeader}>{t("rejectReasons.header")}</div>
              {REJECT_REASONS.map((reason) => (
                <button
                  type="button"
                  key={reason}
                  className={styles.reason}
                  onClick={() => onReject(reason)}
                  data-testid={`inbox-reject-${reason}`}
                >
                  <div className={styles.reasonLabel}>{t(`rejectReasons.${reason}.label`)}</div>
                  <div className={styles.reasonHelp}>{t(`rejectReasons.${reason}.help`)}</div>
                </button>
              ))}
              <button type="button" className={styles.popoverCancel} onClick={() => onRejectOpenChange(false)}>
                {t("rejectReasons.cancel")}
              </button>
            </div>
          )}
        </footer>
      )}
    </section>
  );
}
