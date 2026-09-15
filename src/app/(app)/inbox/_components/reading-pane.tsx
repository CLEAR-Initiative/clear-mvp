"use client";

import { useState } from "react";
import { useFormatter, useTranslations } from "next-intl";
import {
  IconArchive,
  IconArrowLeft,
  IconCirclePlus,
  IconCircleX,
  IconMicrophone,
  IconPaperclip,
  IconShield,
} from "@tabler/icons-react";
import { REJECT_REASONS, type InboxAttachment, type InboxEntry, type RejectReason } from "~/lib/hotline-inbox";
import { InboxClassificationPill } from "./classification-pill";
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
  /** Mobile only: return to the list. */
  onBack: () => void;
}

function Attachment({ attachment, index }: { attachment: InboxAttachment; index: number }) {
  const t = useTranslations("inbox");
  const [broken, setBroken] = useState(false);
  const label = attachment.kind === "voice" ? t("pane.voiceNote") : t("pane.attachment", { n: index + 1 });
  return (
    <a
      className={styles.attachment}
      href={attachment.url}
      target="_blank"
      rel="noopener noreferrer"
      title={label}
      data-testid="inbox-attachment"
    >
      {attachment.kind === "photo" && !broken ? (
        // Presigned S3 URL, not an optimisable static asset.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={attachment.url} alt={label} onError={() => setBroken(true)} />
      ) : (
        <>
          {attachment.kind === "voice" ? <IconMicrophone size={20} /> : <IconPaperclip size={20} />}
          <span>{label}</span>
        </>
      )}
    </a>
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
          <InboxClassificationPill value={entry.classification} />
        </div>
        <span className={styles.paneRef}>
          {entry.intakeRef} · {format.dateTime(new Date(entry.sentAt), "short")}
        </span>
      </header>

      <div className={styles.paneBody}>
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

        {(entry.attachments.length > 0 || entry.omittedMediaCount > 0) && (
          <div>
            <div className={styles.sectionLabel}>{t("pane.attachments")}</div>
            <div className={styles.attachments}>
              {entry.attachments.map((a, i) => (
                <Attachment key={a.url} attachment={a} index={i} />
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
