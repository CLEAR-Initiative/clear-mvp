"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useFormatter, useLocale, useNow, useTranslations } from "next-intl";
import { IconArrowLeft, IconCircleX, IconExternalLink, IconHelpCircle, IconMapPin, IconSearch } from "@tabler/icons-react";
import { api } from "~/trpc/react";
import { track } from "~/lib/analytics/track";
import { reportHandledError } from "~/lib/report-handled-error";
import type { PlaceNameEntry } from "~/lib/hotline-inbox";
import { useFeatureEnabled } from "~/components/feature-flags-provider";
import {
  placeErrorKey,
  placeLookupLinks,
  placeLookupQuery,
  placeLookupView,
  placeNameHomeArea,
  placeResearchErrorKey,
  placeResearchIsOpen,
  placeResearchState,
  proposalKey,
  resolutionForProposal,
  resolutionForSuggestion,
  safeSourceHref,
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

/** How often the pane asks for the research of a row while a Task is open. */
const RESEARCH_POLL_MS = 10_000;

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
 *
 * Behind the `place_research` flag the decider can also ask a Worker to
 * research the name (clear-api D-0296). The pane shows that research waits
 * or runs, and then the Worker's proposal: a researched suggestion with its
 * sources and a pin, or the reason it found nothing. The Worker never
 * resolves a name: the decider uses the proposal, corrects it or ignores it.
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
  const now = useNow({ updateInterval: 60_000 });
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
  const allSuggestions = suggestionsQuery.data ?? [];
  // The list and the map open on the row's state: the posts were placed
  // there, and a place far outside it zooms the map out until no pin can be
  // read. The decider widens to the country. The suggestions never leave the
  // row's country (clear-api searches one country). A state with no candidate
  // opens on the country, so a lone far match is not hidden.
  const insideCount = allSuggestions.filter((s) => s.insideArea !== false).length;
  const canNarrow = !!row.stateLocationId && insideCount > 0 && insideCount < allSuggestions.length;
  const [widened, setWidened] = useState(false);
  const scope: "area" | "country" = canNarrow && !widened ? "area" : "country";
  const suggestions = scope === "area" ? allSuggestions.filter((s) => s.insideArea !== false) : allSuggestions;

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
  const isOutline = (g: MapOutline | null | undefined): g is MapOutline =>
    !!g && (g.type === "Polygon" || g.type === "MultiPolygon");
  const outlines = outlineQueries.map((query) => query.data?.geometry as MapOutline | null | undefined).filter(isOutline);
  // The row's own area is the first outline asked for.
  const homeGeometry = homeId ? (outlineQueries[0]?.data?.geometry as MapOutline | null | undefined) : null;
  const homeOutline = isOutline(homeGeometry) ? homeGeometry : null;

  // The suggestion the decider points at, in the list or on the map: its row
  // and its pin highlight together.
  // The pointer wins; when it leaves, the suggestion with keyboard focus keeps
  // its highlight.
  const [hovered, setHovered] = useState<string | null>(null);
  const [focused, setFocused] = useState<string | null>(null);
  const highlighted = hovered ?? focused;

  const [placing, setPlacing] = useState(false);
  const picker = useLocationPointPicker({
    active: placing,
    teamLocations: placeNameHomeArea(row),
    canPlaceAnywhere,
  });
  const resolve = api.placeNames.resolve.useMutation();
  const [error, setError] = useState<string | null>(null);
  const busy = resolve.isPending;

  // Place research. The query runs only with the flag on, and asks again
  // every few seconds while a Task waits or runs, so the state and then the
  // proposal appear with no reload.
  const researchEnabled = useFeatureEnabled("place_research");
  const utils = api.useUtils();
  const researchQuery = api.placeNames.research.useQuery(
    { id: row.id },
    {
      enabled: researchEnabled,
      refetchInterval: (query) => (placeResearchIsOpen(query.state.data) ? RESEARCH_POLL_MS : false),
    },
  );
  const research = researchEnabled ? (researchQuery.data ?? null) : null;
  const researchState = placeResearchState(research);
  const proposal = research?.proposal ?? null;
  // The proposal shows while no newer Task is open or failed.
  const shownProposal =
    proposal && (researchState === "found" || researchState === "not_found" || researchState === "not_a_place")
      ? proposal
      : null;
  const foundProposal = shownProposal?.outcome === "found" && shownProposal.latitude != null && shownProposal.longitude != null ? shownProposal : null;
  const requestResearch = api.placeNames.requestResearch.useMutation();
  const [researchError, setResearchError] = useState<string | null>(null);

  function askForResearch() {
    if (requestResearch.isPending) return;
    setResearchError(null);
    requestResearch.mutate(
      { id: row.id },
      {
        onSuccess: (task) => {
          // Whether it is the first request or a repeat: never the name.
          track("place_name.research_requested", { again: proposal != null || researchState === "failed" ? "true" : "false" });
          // The accepted request is the state: the pane shows it and starts
          // to poll from it, also when the read that follows fails.
          utils.placeNames.research.setData({ id: row.id }, (previous) => ({
            taskStatus: task.status === "LEASED" ? "LEASED" : "PENDING",
            latestTask: { id: task.id, status: task.status, createdAt: new Date().toISOString() },
            proposal: previous?.proposal ?? null,
          }));
          void utils.placeNames.research.invalidate({ id: row.id });
        },
        onError: (err) => {
          const code = err.data?.code;
          // The cap, a closed row and a missing right are answers, not
          // faults. Anything else is reported.
          if (code !== "TOO_MANY_REQUESTS" && code !== "FORBIDDEN" && code !== "CONFLICT" && code !== "NOT_FOUND") {
            reportHandledError(err, { feature: "place_research", stage: "request" });
          }
          setResearchError(t(placeResearchErrorKey(code)));
        },
      },
    );
  }

  function send(resolution: PlaceNameResolution) {
    if (busy) return;
    setError(null);
    const { proposalId, ...answer } = resolution.kind === "POINT" ? resolution : { ...resolution, proposalId: undefined };
    resolve.mutate(
      { id: row.id, resolution: answer, ...(proposalId ? { proposalId } : {}) },
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

  function chooseProposal() {
    const resolution = foundProposal ? resolutionForProposal(foundProposal) : null;
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

  const locale = useLocale();
  const country = useMemo(() => {
    try {
      return new Intl.DisplayNames([locale], { type: "region" }).of(row.countryCode) ?? row.countryCode;
    } catch {
      return row.countryCode;
    }
  }, [locale, row.countryCode]);
  const area = row.stateLocation?.name ?? country;
  const lastSeen = format.dateTime(new Date(row.lastSeenAt), "short");

  // Links that search for the name outside CLEAR. The maps open on the row's
  // area once its outline has loaded; before that they search without a view.
  const lookupLinks = useMemo(
    () =>
      placeLookupLinks(placeLookupQuery(row, area), placeLookupView(homeOutline)),
    [row, area, homeOutline],
  );

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
          suggestions={[
            // The researched place has a pin like the other suggestions.
            ...(foundProposal
              ? [
                  {
                    lat: foundProposal.latitude!,
                    lng: foundProposal.longitude!,
                    id: proposalKey(foundProposal),
                    label: foundProposal.nameFound ?? row.nameAsWritten,
                  },
                ]
              : []),
            ...suggestions.map((s) => ({
              lat: s.latitude,
              lng: s.longitude,
              id: suggestionKey(s),
              label: s.name,
            })),
          ]}
          highlightedId={highlighted}
          onHighlight={setHovered}
          refitKey={scope}
          outlines={outlines}
        />

        <div data-testid="inbox-place-posts">
          <div className={styles.sectionLabel}>{t("place.posts", { count: row.signalCount })}</div>
          {row.signals.length === 0 ? (
            <p className={styles.narrativeEmpty}>{t("place.noPosts")}</p>
          ) : (
            <ul className={styles.placeList}>
              {row.signals.map((s) => {
                const title = s.signal?.title?.trim() || null;
                const excerpt = signalExcerpt(s.signal);
                // The excerpt falls back to the title: don't print it twice.
                const body = excerpt && excerpt !== title ? excerpt : null;
                const when = s.signal?.publishedAt ?? s.seenAt;
                return (
                  <li key={s.signalId} data-testid="inbox-place-post">
                    <Link
                      href={`/signal/${encodeURIComponent(s.signalId)}`}
                      className={styles.placePost}
                      data-testid="inbox-place-signal-link"
                      aria-label={`${t("place.openSignal")}: ${title ?? excerpt ?? t("place.postHidden")}`}
                    >
                      <span className={styles.placePostAside}>
                        <time dateTime={when}>{format.relativeTime(new Date(when), now)}</time>
                        {s.areaLocation && <bdi className={styles.placePostArea}>{s.areaLocation.name}</bdi>}
                      </span>
                      <span className={styles.placePostMain}>
                        {/* Posts are mostly Arabic: each line takes its own direction. */}
                        {s.signal ? (
                          <>
                            {title && (
                              <span className={styles.placePostTitle} dir="auto">
                                {title}
                              </span>
                            )}
                            {body && (
                              <span className={styles.placePostBody} dir="auto">
                                {body}
                              </span>
                            )}
                          </>
                        ) : (
                          <span className={styles.placePostHidden}>{t("place.postHidden")}</span>
                        )}
                        <span className={styles.placeMeta}>
                          {t(`place.reasons.${s.reason}`, { area: s.areaLocation?.name ?? area })}
                        </span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {researchEnabled && (
          <div data-testid="inbox-place-research" data-state={researchState}>
            <div className={styles.placeSuggestionsHead}>
              <div className={styles.sectionLabel}>{t("place.research.title")}</div>
              {researchState !== "waiting" && researchState !== "running" && !researchQuery.isLoading && !(researchQuery.isError && !research) && (
                <button
                  type="button"
                  className={styles.btn}
                  disabled={requestResearch.isPending || busy}
                  onClick={askForResearch}
                  data-testid="inbox-place-research-request"
                >
                  <IconSearch size={15} />
                  {t(researchState === "none" ? "place.research.request" : "place.research.again")}
                </button>
              )}
            </div>
            {researchState === "none" && !researchQuery.isError && <p className={styles.placeMeta}>{t("place.research.hint")}</p>}
            {(researchState === "waiting" || researchState === "running" || researchState === "failed") && (
              <p className={styles.placeMeta} role="status" data-testid="inbox-place-research-status">
                {t(`place.research.status.${researchState}`)}
              </p>
            )}
            {shownProposal && (
              <ul className={styles.placeList}>
                <li
                  className={`${styles.placeCandidate} ${styles.placeProposal}`}
                  data-testid="inbox-place-proposal"
                  data-outcome={shownProposal.outcome}
                  data-highlighted={(foundProposal && highlighted === proposalKey(foundProposal)) || undefined}
                  onMouseEnter={() => foundProposal && setHovered(proposalKey(foundProposal))}
                  onMouseLeave={() => setHovered(null)}
                  onFocus={() => foundProposal && setFocused(proposalKey(foundProposal))}
                  onBlur={() => setFocused(null)}
                >
                  <span className={styles.placeCandidateMain}>
                    {foundProposal ? (
                      <>
                        <bdi className={styles.placeCandidateName}>{foundProposal.nameFound}</bdi>
                        <span className={styles.placeMeta}>
                          {t("place.research.researched")}
                          {foundProposal.confidence && (
                            <>
                              {" · "}
                              {t(`place.research.confidence.${foundProposal.confidence}`)}
                            </>
                          )}
                        </span>
                      </>
                    ) : (
                      <span className={styles.placeCandidateName}>
                        {t(`place.research.outcome.${shownProposal.outcome === "not_a_place" ? "not_a_place" : "not_found"}`)}
                      </span>
                    )}
                    {/* The Worker's words: its own direction, never markup. */}
                    <span className={styles.placeProposalReason} dir="auto" data-testid="inbox-place-proposal-reason">
                      {shownProposal.reason}
                    </span>
                    {shownProposal.sources.length > 0 && (
                      <ul className={styles.placeSources} data-testid="inbox-place-proposal-sources">
                        {shownProposal.sources.map((source, i) => {
                          const href = safeSourceHref(source.url);
                          return (
                            <li key={`${i}:${source.url}`}>
                              <q dir="auto">{source.quote}</q>{" "}
                              {href ? (
                                <a href={href} target="_blank" rel="noopener noreferrer" data-testid="inbox-place-proposal-source">
                                  {t("place.research.source", { n: i + 1 })}
                                  <IconExternalLink size={12} aria-hidden />
                                  <span className="sr-only">{t("place.lookup.newTab")}</span>
                                </a>
                              ) : (
                                <span>{source.url}</span>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </span>
                  {foundProposal && (
                    <button
                      type="button"
                      className={`${styles.btn} ${styles.btnSm}`}
                      disabled={busy || placing}
                      onClick={chooseProposal}
                      data-testid="inbox-place-proposal-use"
                    >
                      {t("place.actions.use")}
                    </button>
                  )}
                  {shownProposal.outcome === "not_a_place" && (
                    <button
                      type="button"
                      className={`${styles.btnDanger} ${styles.btnSm}`}
                      disabled={busy || placing}
                      onClick={() => send({ kind: "NOT_A_PLACE" })}
                      data-testid="inbox-place-proposal-not-a-place"
                    >
                      <IconCircleX size={14} />
                      {t("place.actions.notAPlace")}
                    </button>
                  )}
                </li>
              </ul>
            )}
            {researchQuery.isError && !research && (
              <p className={styles.placeMeta} role="status" data-testid="inbox-place-research-read-error">
                {t("place.research.errors.read")}{" "}
                <button type="button" className={styles.btn} onClick={() => void researchQuery.refetch()}>
                  {t("place.research.retry")}
                </button>
              </p>
            )}
            {researchError && (
              <p className={styles.actionError} role="alert" data-testid="inbox-place-research-error">
                {researchError}
              </p>
            )}
          </div>
        )}

        <div data-testid="inbox-place-suggestions">
          <div className={styles.placeSuggestionsHead}>
            <div className={styles.sectionLabel}>{t("place.suggestions")}</div>
            {canNarrow && (
              <label className={styles.placeScope}>
                {t("place.scope.label")}
                <select
                  value={scope}
                  // Not while a point is being placed: the map is the decider's
                  // then, and it would not frame the pins a wider area adds.
                  disabled={placing}
                  onChange={(e) => setWidened(e.currentTarget.value === "country")}
                  data-testid="inbox-place-scope"
                >
                  <option value="area">{t("place.scope.area", { area, count: insideCount })}</option>
                  <option value="country">{t("place.scope.country", { country, count: allSuggestions.length })}</option>
                </select>
              </label>
            )}
          </div>
          <p className={styles.placeLookup} data-testid="inbox-place-lookup">
            <span>{t("place.lookup.label")}</span>
            {lookupLinks.map((link) => (
              <a
                key={link.provider}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                // The provider only: never the name (see src/lib/analytics/events.ts).
                onClick={() => track("place_name.lookup_opened", { provider: link.provider })}
                data-testid="inbox-place-lookup-link"
                data-provider={link.provider}
              >
                {t(`place.lookup.${link.provider}`)}
                <IconExternalLink size={12} aria-hidden />
                <span className="sr-only">{t("place.lookup.newTab")}</span>
              </a>
            ))}
          </p>
          {suggestionsQuery.isLoading ? (
            <p className={styles.narrativeEmpty}>{t("place.suggestionsLoading")}</p>
          ) : suggestions.length === 0 ? (
            <p className={styles.narrativeEmpty}>{t("place.noSuggestions")}</p>
          ) : (
            <ul className={styles.placeList}>
              {suggestions.map((s) => (
                <li
                  key={suggestionKey(s)}
                  className={styles.placeCandidate}
                  data-testid="inbox-place-suggestion"
                  data-kind={s.kind}
                  data-highlighted={highlighted === suggestionKey(s) || undefined}
                  onMouseEnter={() => setHovered(suggestionKey(s))}
                  onMouseLeave={() => setHovered(null)}
                  onFocus={() => setFocused(suggestionKey(s))}
                  onBlur={() => setFocused(null)}
                >
                  <span className={styles.placeCandidateMain}>
                    <bdi className={styles.placeCandidateName}>{s.name}</bdi>
                    <span className={styles.placeMeta}>
                      {t(s.kind === "LOCATION" ? (s.level === 2 ? "place.kinds.district" : "place.kinds.landmark") : "place.kinds.geonames")}
                      {" · "}
                      {s.insideArea == null
                        ? t("place.where.unknown")
                        : s.insideArea
                          ? t("place.where.inside", { area })
                          : t("place.where.outside", { km: Math.round(s.distanceKm ?? 0), area })}
                    </span>
                  </span>
                  <button
                    type="button"
                    className={`${styles.btn} ${styles.btnSm}`}
                    disabled={busy || placing}
                    onClick={() => chooseSuggestion(s)}
                    data-testid="inbox-place-use"
                  >
                    {t("place.actions.use")}
                  </button>
                </li>
              ))}
            </ul>
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
