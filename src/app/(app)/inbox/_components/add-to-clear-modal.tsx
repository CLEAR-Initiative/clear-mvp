"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Modal, Select } from "@mantine/core";
import { IconLayoutGrid, IconMicrophone, IconSparkles, IconX } from "@tabler/icons-react";
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

/** Enrichment drafts are LLM output: accept only what updateSignalSeverity
 * accepts (an integer 1-5), anything else seeds as "not set". */
function draftedSeverity(value: number | null | undefined): number | null {
  return typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= 5 ? value : null;
}

/** Display form of the free-text disaster-type guess ("flash_flood" -> "flash flood"). */
function disasterTypeLabel(value: string): string {
  return value.replace(/[_-]+/g, " ").trim();
}

interface LocationOptionSource {
  id: string;
  name: string;
  parent: { name: string } | null;
}

const toLocationOption = (loc: LocationOptionSource) => ({
  value: loc.id,
  label: loc.parent ? `${loc.name} (${loc.parent.name})` : loc.name,
});

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
 * Confirmation-and-edit step before promotion. Seeded from the entry and
 * the thread's hotline-enrichment drafts (title = draftTitle, else thread
 * title; severity = draftSeverity; location = draftLocationId; description
 * = the reporter's text); re-seeded per entry so edits never leak between
 * entries. Drafted values carry an "AI suggestion" badge while they are
 * unchanged; the reviewer can change or clear every one. Location is
 * mandatory.
 *
 * Persistence today: severity and location are applied right after
 * promotion via updateSignalSeverity / updateSignalLocation. Title and
 * description edits have no write path until clear-api's promotion
 * accepts overrides (#625): a drafted title gets its own note saying so,
 * and the edits warning flags the reviewer's own changes (vs the seed).
 * The disaster-type draft is shown read-only; signals have no such field.
 */
export function AddToClearModal({ entry, busy, error, retry, onCancel, onConfirm }: AddToClearModalProps) {
  const t = useTranslations("inbox");
  const tSev = useTranslations("common.severities");

  const { draftTitle, draftSeverity, draftLocationId, draftDisasterType } = entry.thread;
  const suggestedTitle = draftTitle?.trim() ?? "";
  const suggestedSeverity = draftedSeverity(draftSeverity);

  const seed = useMemo<SignalDraft>(
    () => ({
      title: suggestedTitle || entry.title,
      description: entry.text,
      severity: suggestedSeverity,
      locationId: draftLocationId ?? "",
    }),
    [entry.id], // eslint-disable-line react-hooks/exhaustive-deps
  );
  const [draft, setDraft] = useState<SignalDraft>(seed);
  useEffect(() => setDraft(seed), [seed]);

  const locationsQuery = api.locations.list.useQuery(undefined, { staleTime: 10 * 60_000 });
  // The Select lists admin levels 0-2 only, but the geoparser can resolve a
  // deeper place (L3/L4). Keep the drafted location selectable: take it from
  // the full list when present, else fetch it by id.
  const draftInList = draftLocationId
    ? locationsQuery.data?.find((loc) => loc.id === draftLocationId)
    : undefined;
  const draftLocationQuery = api.locations.getById.useQuery(
    { id: draftLocationId ?? "" },
    { enabled: !!draftLocationId && !!locationsQuery.data && !draftInList, staleTime: 10 * 60_000 },
  );
  const draftLocation = draftInList ?? draftLocationQuery.data ?? null;
  const locationOptions = useMemo(() => {
    const options = (locationsQuery.data ?? []).filter((loc) => loc.level <= 2).map(toLocationOption);
    if (draftLocation && !options.some((o) => o.value === draftLocation.id)) {
      options.unshift(toLocationOption(draftLocation));
    }
    return options;
  }, [locationsQuery.data, draftLocation]);

  // Only a location the Select can show counts: a drafted id that resolves
  // to nothing must not be confirmable while the field looks empty.
  const locationResolving = locationsQuery.isLoading || draftLocationQuery.isFetching;
  const locationSelected = draft.locationId !== "" && locationOptions.some((o) => o.value === draft.locationId);

  const titleSuggested = suggestedTitle !== "" && draft.title === suggestedTitle;
  const severitySuggested = suggestedSeverity !== null && draft.severity === suggestedSeverity;
  const locationSuggested = !!draftLocationId && draft.locationId === draftLocationId && locationSelected;
  // Promotion keeps the stored title until #625, so say so when the seed is
  // an AI title that differs from it (the edits warning covers only the
  // reviewer's own changes, so it does not fire just because a draft exists).
  const draftTitleNotSaved = suggestedTitle !== "" && suggestedTitle !== entry.title && draft.title !== entry.title;
  const textEdited = draft.title !== seed.title || draft.description !== seed.description;
  const canConfirm = locationSelected && !busy;

  const aiBadge = (field: string) => (
    <span className={styles.aiBadge} data-testid={`inbox-ai-${field}`}>
      <IconSparkles size={11} />
      {t("modal.aiSuggested")}
    </span>
  );

  return (
    <Modal
      opened
      onClose={onCancel}
      withCloseButton={false}
      padding={0}
      size={760}
      centered
      closeOnEscape={!busy && !retry}
      closeOnClickOutside={!busy && !retry}
      transitionProps={{ duration: 0 }}
      classNames={{ content: styles.shell, body: styles.shellBody }}
      overlayProps={{ backgroundOpacity: 0.6 }}
    >
      <div className={styles.frame} data-testid="inbox-add-modal" data-retry={retry !== null}>
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
            <div className={styles.label}>
              {t("modal.title")}
              {titleSuggested && aiBadge("title")}
            </div>
            <textarea
              className={styles.fieldTitle}
              rows={2}
              value={draft.title}
              onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
              data-testid="inbox-draft-title"
            />
            {draftTitleNotSaved && (
              <p className={styles.hint} data-testid="inbox-draft-title-note">{t("modal.draftTitleNotSaved")}</p>
            )}
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
            <div className={styles.label}>
              {t("modal.severity")}
              {severitySuggested && aiBadge("severity")}
            </div>
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
                data-testid="inbox-severity-none"
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
            <div className={styles.label}>
              {t("modal.location")}
              {locationSuggested && aiBadge("location")}
            </div>
            <Select
              data={locationOptions}
              value={locationSelected ? draft.locationId : null}
              onChange={(v) => setDraft((d) => ({ ...d, locationId: v ?? "" }))}
              placeholder={locationResolving ? t("modal.locationLoading") : t("modal.locationPlaceholder")}
              searchable
              clearable
              required
              disabled={locationsQuery.isLoading}
              comboboxProps={{ zIndex: 1000 }}
              nothingFoundMessage={t("modal.locationNoMatch")}
              classNames={{ input: styles.selectInput }}
              data-testid="inbox-draft-location"
            />
            {!locationSelected && !locationResolving && (
              <p className={styles.hint} data-testid="inbox-location-hint">
                {t(draft.locationId === "" ? "modal.locationRequired" : "modal.draftLocationUnknown")}
              </p>
            )}
          </div>
          {draftDisasterType && (
            <div data-testid="inbox-draft-disaster-type">
              <div className={styles.label}>
                {t("modal.disasterType")}
                {aiBadge("disaster-type")}
              </div>
              <div className={styles.readonlyValue}>{disasterTypeLabel(draftDisasterType)}</div>
              <p className={styles.hint}>{t("modal.disasterTypeReadOnly")}</p>
            </div>
          )}
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
    </Modal>
  );
}
