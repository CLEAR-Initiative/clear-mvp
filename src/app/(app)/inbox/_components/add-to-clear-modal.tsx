"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { IconLayoutGrid, IconMicrophone, IconX } from "@tabler/icons-react";
import type { InboxEntry } from "~/lib/hotline-inbox";
import { severityColors } from "~/lib/constants/severity";
import styles from "./add-to-clear-modal.module.css";

/** Severity chips: numeric value sent to updateSignalSeverity, bucket for colour. */
const SEVERITIES = [
  { value: 5, bucket: "critical" },
  { value: 4, bucket: "high" },
  { value: 3, bucket: "medium" },
  { value: 2, bucket: "low" },
] as const;

interface AddToClearModalProps {
  entry: InboxEntry;
  busy: boolean;
  error: string | null;
  onCancel: () => void;
  onConfirm: (severity: number | null) => void;
}

/**
 * Confirmation step before promotion. Title and description are what
 * clear-api's promotion derives (thread title, joined message text); they
 * render read-only because the promotion input has no override fields
 * yet. Severity is applied right after promotion via updateSignalSeverity.
 */
export function AddToClearModal({ entry, busy, error, onCancel, onConfirm }: AddToClearModalProps) {
  const t = useTranslations("inbox");
  const tSev = useTranslations("common.severities");
  const [severity, setSeverity] = useState<number | null>(null);

  // Re-seed per entry so a choice never leaks between entries.
  useEffect(() => setSeverity(null), [entry.id]);

  return (
    <div className={styles.backdrop} onClick={busy ? undefined : onCancel} data-testid="inbox-add-modal">
      <div className={styles.shell} role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <div className={styles.glow} />
        <div className={styles.header}>
          <span className={styles.headerLabel}>
            <IconLayoutGrid size={15} />
            {t("modal.header")}
          </span>
          <button type="button" className={styles.close} onClick={onCancel} disabled={busy} aria-label={t("modal.cancel")}>
            <IconX size={16} />
          </button>
        </div>

        <div className={styles.body}>
          <div>
            <div className={styles.label}>{t("modal.title")}</div>
            <div className={styles.fieldTitle}>{entry.title || t("pane.noText")}</div>
          </div>
          <div>
            <div className={styles.label}>{t("modal.description")}</div>
            <div className={styles.field}>{entry.text || t("pane.noText")}</div>
            <p className={styles.hint} style={{ marginTop: 6 }}>{t("modal.readOnlyHint")}</p>
          </div>
          <div>
            <div className={styles.label}>{t("modal.severity")}</div>
            <div className={styles.chips}>
              {SEVERITIES.map((s) => (
                <button
                  type="button"
                  key={s.value}
                  className={styles.chip}
                  data-selected={severity === s.value}
                  data-testid={`inbox-severity-${s.value}`}
                  style={
                    {
                      "--chip-bg": severityColors[s.bucket]!.bg,
                      "--chip-fg": severityColors[s.bucket]!.text,
                    } as React.CSSProperties
                  }
                  onClick={() => setSeverity(s.value)}
                >
                  {s.value} {tSev(s.bucket)}
                </button>
              ))}
              <button
                type="button"
                className={styles.chip}
                data-selected={severity === null}
                style={
                  {
                    "--chip-bg": "var(--color-bg-muted)",
                    "--chip-fg": "var(--color-text-secondary)",
                  } as React.CSSProperties
                }
                onClick={() => setSeverity(null)}
              >
                {t("modal.severityNone")}
              </button>
            </div>
          </div>
          {entry.attachments.length > 0 && (
            <div>
              <div className={styles.label}>{t("modal.attachments")}</div>
              <div className={styles.cards}>
                {entry.attachments.map((a, i) => (
                  <a key={a.url} className={styles.card} href={a.url} target="_blank" rel="noopener noreferrer">
                    <div className={styles.cardIcon}>
                      {a.kind === "voice" ? (
                        <IconMicrophone size={22} />
                      ) : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={a.url} alt="" />
                      )}
                    </div>
                    <div className={styles.cardName}>
                      {a.kind === "voice" ? t("pane.voiceNote") : t("pane.attachment", { n: i + 1 })}
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}
          {error && <p className={styles.error}>{error}</p>}
        </div>

        <div className={styles.footer}>
          <span className={styles.footerNote}>{t("modal.footer", { ref: entry.intakeRef })}</span>
          <div className={styles.footerActions}>
            <button type="button" className={styles.cancel} onClick={onCancel} disabled={busy}>
              {t("modal.cancel")}
            </button>
            <button
              type="button"
              className={styles.confirm}
              onClick={() => onConfirm(severity)}
              disabled={busy}
              data-testid="inbox-add-confirm"
            >
              {t("modal.confirm")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
