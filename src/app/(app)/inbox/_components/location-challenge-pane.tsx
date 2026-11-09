"use client";

import { useState } from "react";
import Link from "next/link";
import { useFormatter, useTranslations } from "next-intl";
import { IconArrowLeft, IconCircleCheck, IconCircleX, IconMapPin } from "@tabler/icons-react";
import { api } from "~/trpc/react";
import type { LocationChallengeEntry } from "~/lib/hotline-inbox";
import {
  decisionErrorKey,
  locationChain,
  signalLocationOf,
  signalPin,
  signalPlaceLabel,
  type LocationChallengeDecision,
} from "~/lib/location-challenge";
import { LocationChallengeMap } from "~/components/location-challenge/location-challenge-map";
import { LocationPointFields, useLocationPointPicker } from "~/components/location-challenge/location-point-picker";
import { InboxEntryPills } from "./classification-pill";
import styles from "../inbox.module.css";

/**
 * A Location challenge as a Review item: where the Signal is pinned now and
 * the point the analyst proposed (when they did), on a small map and in
 * words, with their note. The decider accepts the proposed point, places a
 * different one (on the map; search and typed coordinates work too), or
 * declines, which leaves the pin as it is. clear-api checks the decider and
 * the team's area again on each.
 */
export function LocationChallengePane({
  entry,
  canPlaceAnywhere,
  onDecided,
  onBack,
}: {
  entry: LocationChallengeEntry;
  /** A platform admin may place the Signal beyond the team's area. */
  canPlaceAnywhere: boolean;
  onDecided: (entry: LocationChallengeEntry, decision: LocationChallengeDecision) => void;
  onBack: () => void;
}) {
  const t = useTranslations("inbox");
  const format = useFormatter();
  const challenge = entry.challenge;
  const source = signalPin(challenge.signal);
  const proposed =
    challenge.proposedLat != null && challenge.proposedLng != null
      ? { lat: challenge.proposedLat, lng: challenge.proposedLng }
      : null;

  const [placing, setPlacing] = useState(false);
  const picker = useLocationPointPicker({
    active: placing,
    sourceLat: source?.lat,
    sourceLng: source?.lng,
    teamLocations: challenge.team?.locations ?? null,
    canPlaceAnywhere,
  });
  const decide = api.locationChallenge.decide.useMutation();
  const [error, setError] = useState<string | null>(null);
  const busy = decide.isPending;

  function send(decision: LocationChallengeDecision) {
    const point = decision === "CORRECT" ? picker.point : null;
    if (busy || (decision === "CORRECT" && !point)) return;
    setError(null);
    decide.mutate(
      {
        id: challenge.id,
        decision,
        point: point ? { lat: point.lat, lng: point.lng, name: point.name ?? undefined } : undefined,
      },
      {
        onSuccess: () => onDecided(entry, decision),
        onError: (err) => setError(t(decisionErrorKey(err.data?.code))),
      },
    );
  }

  function startPlacing() {
    picker.reset();
    setError(null);
    setPlacing(true);
  }

  function stopPlacing() {
    setPlacing(false);
    setError(null);
  }

  const filer = challenge.createdByName?.trim();
  const filedAt = format.dateTime(new Date(challenge.createdAt), "short");
  const proposedPlace = locationChain(challenge.proposedPlacement);

  return (
    <section className={styles.pane} data-testid="inbox-pane" data-kind="location_challenge">
      <header className={styles.paneHeader}>
        <div className={styles.paneTitleGroup}>
          <button type="button" className={styles.backBtn} onClick={onBack} aria-label={t("pane.back")}>
            <IconArrowLeft size={16} />
          </button>
          <span className={styles.paneTitle}>{entry.signalTitle ?? t("location.untitled")}</span>
          <InboxEntryPills entry={entry} />
        </div>
        <span className={styles.paneRef}>
          {filer ? t("location.filedBy", { name: filer, date: filedAt }) : t("location.filed", { date: filedAt })}
        </span>
      </header>

      <div className={styles.paneBody}>
        <Link
          href={`/signal/${encodeURIComponent(challenge.signalId)}`}
          className={styles.translateBtn}
          data-testid="inbox-location-signal-link"
        >
          {t("location.openSignal")}
        </Link>

        <LocationChallengeMap
          source={source}
          proposed={proposed}
          placed={placing ? picker.point : null}
          picking={placing}
          onPick={picker.placeAt}
        />

        <div data-testid="inbox-location-now">
          <div className={styles.sectionLabel}>{t("location.now")}</div>
          <p className={styles.narrative}>
            {signalPlaceLabel(signalLocationOf(challenge.signal)) ?? t("location.noPlace")}
            {!source && <span className={styles.placeMeta}>{t("location.noPin")}</span>}
          </p>
        </div>

        <div data-testid="inbox-location-proposed">
          <div className={styles.sectionLabel}>{t("location.proposed")}</div>
          {proposed ? (
            <p className={styles.narrative}>
              {challenge.proposedName?.trim() || `${proposed.lat.toFixed(5)}, ${proposed.lng.toFixed(5)}`}
              <span className={styles.placeMeta}>
                {proposedPlace ? t("location.landsIn", { chain: proposedPlace }) : t("location.outsideCoverage")}
              </span>
            </p>
          ) : (
            <p className={styles.narrativeEmpty}>{t("location.noProposal")}</p>
          )}
        </div>

        {challenge.note?.trim() && (
          <div>
            <div className={styles.sectionLabel}>{t("location.note")}</div>
            <p className={styles.narrative} dir="auto" data-testid="inbox-location-note">
              {challenge.note.trim()}
            </p>
          </div>
        )}

        {challenge.team && (
          <div>
            <div className={styles.sectionLabel}>{t("location.team")}</div>
            <p className={styles.narrative}>{challenge.team.name}</p>
          </div>
        )}

        {placing && (
          <div className={styles.placePicker} data-testid="inbox-location-placing">
            <div className={styles.sectionLabel}>{t("location.placeTitle")}</div>
            <p className={styles.placeMeta}>{t("location.placeHint")}</p>
            <LocationPointFields picker={picker} toggleAlign="start" />
          </div>
        )}
      </div>

      <footer className={styles.actionBar} data-testid="inbox-action-bar">
        <div className={styles.actionGroup}>
          {placing ? (
            <>
              <button
                type="button"
                className={styles.btnPrimary}
                disabled={busy || !picker.point || picker.blocked}
                onClick={() => send("CORRECT")}
                data-testid="inbox-location-save"
              >
                <IconMapPin size={15} />
                {t("location.actions.save")}
              </button>
              <button type="button" className={styles.btn} disabled={busy} onClick={stopPlacing}>
                {t("location.actions.cancel")}
              </button>
            </>
          ) : (
            <>
              {proposed && (
                <button
                  type="button"
                  className={styles.btnPrimary}
                  disabled={busy}
                  onClick={() => send("ACCEPT")}
                  data-testid="inbox-location-accept"
                >
                  <IconCircleCheck size={15} />
                  {t("location.actions.accept")}
                </button>
              )}
              <button
                type="button"
                className={proposed ? styles.btn : styles.btnPrimary}
                disabled={busy}
                onClick={startPlacing}
                data-testid="inbox-location-place"
              >
                <IconMapPin size={15} />
                {t(proposed ? "location.actions.placeOther" : "location.actions.place")}
              </button>
              <button
                type="button"
                className={styles.btnDanger}
                disabled={busy}
                onClick={() => send("DECLINE")}
                data-testid="inbox-location-decline"
              >
                <IconCircleX size={15} />
                {t("location.actions.decline")}
              </button>
            </>
          )}
          {error && (
            <span className={styles.actionError} role="alert">
              {error}
            </span>
          )}
        </div>
      </footer>
    </section>
  );
}
