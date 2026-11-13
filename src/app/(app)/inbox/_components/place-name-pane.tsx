"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useFormatter, useTranslations } from "next-intl";
import { IconArrowLeft, IconCircleX, IconHelpCircle, IconMapPin } from "@tabler/icons-react";
import { api } from "~/trpc/react";
import { track } from "~/lib/analytics/track";
import type { PlaceNameEntry } from "~/lib/hotline-inbox";
import {
  placeErrorKey,
  placeNameHomeArea,
  resolutionForSuggestion,
  signalExcerpt,
  suggestionKey,
  type PlaceNameResolution,
  type PlaceNameResolutionKind,
} from "~/lib/place-names";
import type { GqlPlaceNameSuggestion } from "~/lib/types/graphql";
import { LocationChallengeMap, type MapOutline } from "~/components/location-challenge/location-challenge-map";
import { LocationPointFields, useLocationPointPicker } from "~/components/location-challenge/location-point-picker";
import { InboxEntryPills } from "./classification-pill";
import styles from "../inbox.module.css";

/** How many areas besides the state get an outline: the pane shows 5 posts. */
const AREA_OUTLINES_MAX = 3;

/**
 * An unresolved place name as a Review item (clear-api ADR-0019): a place
 * name, as written in Signals, that geocoding could not place. The pane shows
 * the posts that name it, the state the posts were placed in on a small map,
 * and the places the name could mean. The decider uses one of those places,
 * places a point (on the map; search and typed coordinates work too), or
 * marks the name not a place or ambiguous. A location answer becomes a place
 * alias, and the Signals that wait on the name move. The suggestions are
 * optional help: nothing forces the decider to pick one. clear-api checks the
 * decider and the place again on each answer.
 */
export function PlaceNamePane({
  entry,
  canPlaceAnywhere,
  onResolved,
  onBack,
}: {
  entry: PlaceNameEntry;
  /** A platform admin may put the place outside the row's state. */
  canPlaceAnywhere: boolean;
  onResolved: (entry: PlaceNameEntry, kind: PlaceNameResolutionKind, signalsMoved: number) => void;
  onBack: () => void;
}) {
  const t = useTranslations("inbox");
  const format = useFormatter();
  const row = entry.row;
  const homeId = row.stateLocationId ?? row.countryLocationId;

  const suggestionsQuery = api.placeNames.suggestions.useQuery(
    {
      name: row.nameAsWritten,
      nameAr: row.nameAr ?? undefined,
      countryCode: row.countryCode,
      withinLocationId: homeId ?? undefined,
    },
    { staleTime: 5 * 60_000 },
  );
  const suggestions = suggestionsQuery.data ?? [];

  // The state's outline, and the outlines of the areas the posts were placed
  // in when they are finer than the state (a district).
  const areaIds = useMemo(() => {
    const ids = new Set<string>();
    for (const s of row.signals) {
      if (s.areaLocation && s.areaLocation.id !== homeId && s.areaLocation.level >= 2) ids.add(s.areaLocation.id);
    }
    return [...ids].slice(0, AREA_OUTLINES_MAX);
  }, [row.signals, homeId]);
  const outlineQueries = api.useQueries((q) =>
    [...(homeId ? [homeId] : []), ...areaIds].map((id) => q.locations.getById({ id }, { staleTime: 10 * 60_000 })),
  );
  const outlines = outlineQueries
    .map((query) => query.data?.geometry as MapOutline | null | undefined)
    .filter((g): g is MapOutline => !!g && (g.type === "Polygon" || g.type === "MultiPolygon"));

  const [placing, setPlacing] = useState(false);
  const picker = useLocationPointPicker({
    active: placing,
    teamLocations: placeNameHomeArea(row),
    canPlaceAnywhere,
  });
  const resolve = api.placeNames.resolve.useMutation();
  const [error, setError] = useState<string | null>(null);
  const busy = resolve.isPending;

  function send(resolution: PlaceNameResolution) {
    if (busy) return;
    setError(null);
    resolve.mutate(
      { id: row.id, resolution },
      {
        onSuccess: (resolved) => {
          // The kind only: never the name (see src/lib/analytics/events.ts).
          track("place_name.resolved", { kind: resolution.kind });
          onResolved(entry, resolution.kind, resolved.signalsMoved);
        },
        onError: (err) => setError(t(placeErrorKey(err.data?.code))),
      },
    );
  }

  function chooseSuggestion(suggestion: GqlPlaceNameSuggestion) {
    const resolution = resolutionForSuggestion(suggestion);
    if (resolution) send(resolution);
  }

  function savePoint() {
    const point = picker.point;
    if (!point || picker.blocked) return;
    send({ kind: "POINT", point: { lat: point.lat, lng: point.lng, name: point.name ?? undefined } });
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

  const area = row.stateLocation?.name ?? row.countryCode;
  const lastSeen = format.dateTime(new Date(row.lastSeenAt), "short");

  return (
    <section className={styles.pane} data-testid="inbox-pane" data-kind="place_name">
      <header className={styles.paneHeader}>
        <div className={styles.paneTitleGroup}>
          <button type="button" className={styles.backBtn} onClick={onBack} aria-label={t("pane.back")}>
            <IconArrowLeft size={16} />
          </button>
          <span className={styles.paneTitle} data-testid="inbox-place-name">
            <bdi>{row.nameAsWritten}</bdi>
            {row.nameAr && (
              <>
                {" "}
                <bdi lang="ar">{row.nameAr}</bdi>
              </>
            )}
          </span>
          <InboxEntryPills entry={entry} />
        </div>
        <span className={styles.paneRef}>{t("place.seen", { count: row.signalCount, area, date: lastSeen })}</span>
      </header>

      <div className={styles.paneBody}>
        <LocationChallengeMap
          source={null}
          proposed={null}
          placed={placing ? picker.point : null}
          picking={placing}
          onPick={picker.placeAt}
          suggestions={suggestions.map((s) => ({ lat: s.latitude, lng: s.longitude }))}
          outlines={outlines}
        />

        <div data-testid="inbox-place-posts">
          <div className={styles.sectionLabel}>{t("place.posts", { count: row.signalCount })}</div>
          {row.signals.length === 0 && <p className={styles.narrativeEmpty}>{t("place.noPosts")}</p>}
          {row.signals.map((s) => {
            const excerpt = signalExcerpt(s.signal);
            return (
              <p key={s.signalId} className={styles.narrative} data-testid="inbox-place-post">
                {/* Posts are mostly Arabic: each takes its own direction. */}
                <span dir="auto" style={{ display: "block" }}>
                  {excerpt ?? t("place.postHidden")}
                </span>
                <span className={styles.placeMeta}>
                  {t(`place.reasons.${s.reason}`, { area: s.areaLocation?.name ?? area })}
                  {" · "}
                  <Link href={`/signal/${encodeURIComponent(s.signalId)}`} data-testid="inbox-place-signal-link">
                    {t("place.openSignal")}
                  </Link>
                </span>
              </p>
            );
          })}
        </div>

        <div data-testid="inbox-place-suggestions">
          <div className={styles.sectionLabel}>{t("place.suggestions")}</div>
          {suggestionsQuery.isLoading ? (
            <p className={styles.narrativeEmpty}>{t("place.suggestionsLoading")}</p>
          ) : suggestions.length === 0 ? (
            <p className={styles.narrativeEmpty}>{t("place.noSuggestions")}</p>
          ) : (
            suggestions.map((s) => (
              <p key={suggestionKey(s)} className={styles.narrative} data-testid="inbox-place-suggestion" data-kind={s.kind}>
                <bdi>{s.name}</bdi>
                <span className={styles.placeMeta}>
                  {t(s.kind === "LOCATION" ? (s.level === 2 ? "place.kinds.district" : "place.kinds.landmark") : "place.kinds.geonames")}
                  {" · "}
                  {s.insideArea == null
                    ? t("place.where.unknown")
                    : s.insideArea
                      ? t("place.where.inside", { area })
                      : t("place.where.outside", { km: Math.round(s.distanceKm ?? 0), area })}
                </span>{" "}
                <button
                  type="button"
                  className={styles.btn}
                  disabled={busy || placing}
                  onClick={() => chooseSuggestion(s)}
                  data-testid="inbox-place-use"
                >
                  {t("place.actions.use")}
                </button>
              </p>
            ))
          )}
        </div>

        {placing && (
          <div className={styles.placePicker} data-testid="inbox-place-placing">
            <div className={styles.sectionLabel}>{t("place.placeTitle")}</div>
            <p className={styles.placeMeta}>{t("place.placeHint", { name: row.nameAsWritten })}</p>
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
                onClick={savePoint}
                data-testid="inbox-place-save"
              >
                <IconMapPin size={15} />
                {t("place.actions.save")}
              </button>
              <button type="button" className={styles.btn} disabled={busy} onClick={stopPlacing}>
                {t("place.actions.cancel")}
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className={styles.btnPrimary}
                disabled={busy}
                onClick={startPlacing}
                data-testid="inbox-place-place"
              >
                <IconMapPin size={15} />
                {t("place.actions.place")}
              </button>
              <button
                type="button"
                className={styles.btn}
                disabled={busy}
                onClick={() => send({ kind: "AMBIGUOUS" })}
                data-testid="inbox-place-ambiguous"
              >
                <IconHelpCircle size={15} />
                {t("place.actions.ambiguous")}
              </button>
              <button
                type="button"
                className={styles.btnDanger}
                disabled={busy}
                onClick={() => send({ kind: "NOT_A_PLACE" })}
                data-testid="inbox-place-not-a-place"
              >
                <IconCircleX size={15} />
                {t("place.actions.notAPlace")}
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
