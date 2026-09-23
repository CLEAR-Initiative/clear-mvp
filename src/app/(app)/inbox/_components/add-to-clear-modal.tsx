"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Select } from "@mantine/core";
import { IconLayoutGrid, IconMicrophone, IconX } from "@tabler/icons-react";
import { api } from "~/trpc/react";
import type { InboxEntry } from "~/lib/hotline-inbox";
import { severityColors } from "~/lib/constants/severity";
import styles from "./add-to-clear-modal.module.css";

/** Severity chips: numeric value sent to updateSignalSeverity, bucket for colour. */
const SEVERITIES = [
  { value: 5, bucket: "critical" },
  { value: 4, bucket: "high" },
  { value: 3, bucket: "medium" },
  { value: 2, bucket: "low" },
  { value: 1, bucket: "low" },
] as const;

export interface SignalDraft {
  title: string;
  description: string;
  severity: number | null;
  locationId: string;
}

interface AddToClearModalProps {
  entry: InboxEntry;
  busy: boolean;
  error: string | null;
  /** Set once the signal exists but a follow-up write (location, then
   * severity) failed. The modal stays open; Confirm becomes Retry and
   * Cancel becomes "Leave unscoped". Backdrop and Escape no longer close. */
  retry: { locationDone: boolean } | null;
  onCancel: () => void;
  onConfirm: (draft: SignalDraft) => void;
}

/**
 * Confirmation-and-edit step before promotion. Seeded from the entry
 * (title = thread title, description = the reporter's text); re-seeded
 * per entry so edits never leak between entries. Location is mandatory.
 *
 * Persistence today: severity and location are applied right after
 * promotion via updateSignalSeverity / updateSignalLocation. Title and
 * description edits have no write path until clear-api's promotion
 * accepts overrides; the modal flags that when they differ from the seed.
 */
export function AddToClearModal({ entry, busy, error, retry, onCancel, onConfirm }: AddToClearModalProps) {
  const t = useTranslations("inbox");
  const tSev = useTranslations("common.severities");

  const seed = useMemo<SignalDraft>(
    () => ({ title: entry.title, description: entry.text, severity: null, locationId: "" }),
    [entry.id], // eslint-disable-line react-hooks/exhaustive-deps
  );
  const [draft, setDraft] = useState<SignalDraft>(seed);
  useEffect(() => setDraft(seed), [seed]);

  const locationsQuery = api.locations.list.useQuery(undefined, { staleTime: 10 * 60_000 });
  const locationOptions = useMemo(
    () =>
      (locationsQuery.data ?? [])
        .filter((loc) => loc.level <= 2)
        .map((loc) => ({
          value: loc.id,
          label: loc.parent ? `${loc.name} (${loc.parent.name})` : loc.name,
        })),
    [locationsQuery.data],
  );

  const textEdited = draft.title !== seed.title || draft.description !== seed.description;
  const canConfirm = draft.locationId !== "" && !busy;

  return (
    <div
      className={styles.backdrop}
      onClick={busy || retry ? undefined : onCancel}
      data-testid="inbox-add-modal"
      data-retry={retry !== null}
    >
      <div className={styles.shell} role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <div className={styles.glow} />
        <div className={styles.header}>
          <span className={styles.headerLabel}>
            <IconLayoutGrid size={15} />
            {t("modal.header")}
          </span>
          {!retry && (
            <button type="button" className={styles.close} onClick={onCancel} disabled={busy} aria-label={t("modal.cancel")}>
              <IconX size={16} />
            </button>
          )}
        </div>

        <div className={styles.body}>
          {retry && (
            <div className={styles.retryBanner} data-testid="inbox-retry-banner">
              <strong>{t("modal.retryTitle")}</strong>
              <p>{t(retry.locationDone ? "modal.retrySeverityBody" : "modal.retryLocationBody")}</p>
            </div>
          )}
          <div>
            <div className={styles.label}>{t("modal.title")}</div>
            <textarea
              className={styles.fieldTitle}
              rows={2}
              value={draft.title}
              onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
              data-testid="inbox-draft-title"
            />
          </div>
          <div>
            <div className={styles.label}>{t("modal.description")}</div>
            <textarea
              className={styles.field}
              rows={5}
              value={draft.description}
              onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
              data-testid="inbox-draft-description"
            />
            {textEdited && (
              <p className={styles.warning} data-testid="inbox-edits-warning">{t("modal.editsNotSaved")}</p>
            )}
          </div>
          <div>
            <div className={styles.label}>{t("modal.severity")}</div>
            <div className={styles.chips}>
              {SEVERITIES.map((s) => (
                <button
                  type="button"
                  key={s.value}
                  className={styles.chip}
                  data-selected={draft.severity === s.value}
                  data-testid={`inbox-severity-${s.value}`}
                  style={
                    {
                      "--chip-bg": severityColors[s.bucket]!.bg,
                      "--chip-fg": severityColors[s.bucket]!.text,
                    } as React.CSSProperties
                  }
                  onClick={() => setDraft((d) => ({ ...d, severity: s.value }))}
                >
                  {s.value} {tSev(s.bucket)}
                </button>
              ))}
              <button
                type="button"
                className={styles.chip}
                data-selected={draft.severity === null}
                style={
                  {
                    "--chip-bg": "var(--color-bg-muted)",
                    "--chip-fg": "var(--color-text-secondary)",
                  } as React.CSSProperties
                }
                onClick={() => setDraft((d) => ({ ...d, severity: null }))}
              >
                {t("modal.severityNone")}
              </button>
            </div>
          </div>
          <div>
            <div className={styles.label}>{t("modal.location")}</div>
            <Select
              data={locationOptions}
              value={draft.locationId || null}
              onChange={(v) => setDraft((d) => ({ ...d, locationId: v ?? "" }))}
              placeholder={locationsQuery.isLoading ? t("modal.locationLoading") : t("modal.locationPlaceholder")}
              searchable
              clearable
              required
              disabled={locationsQuery.isLoading}
              comboboxProps={{ zIndex: 1000 }}
              nothingFoundMessage={t("modal.locationNoMatch")}
              classNames={{ input: styles.selectInput }}
              data-testid="inbox-draft-location"
            />
            {draft.locationId === "" && <p className={styles.hint}>{t("modal.locationRequired")}</p>}
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
            <button type="button" className={styles.cancel} onClick={onCancel} disabled={busy} data-testid="inbox-add-cancel">
              {t(retry ? "modal.leaveUnscoped" : "modal.cancel")}
            </button>
            <button
              type="button"
              className={styles.confirm}
              onClick={() => onConfirm(draft)}
              disabled={!canConfirm}
              data-testid="inbox-add-confirm"
            >
              {t(retry ? "modal.retry" : "modal.confirm")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
