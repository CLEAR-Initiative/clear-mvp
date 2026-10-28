"use client";

import { useEffect, useRef, useState } from "react";
import {
  Modal,
  Stack,
  Text,
  TextInput,
  Textarea,
  Button,
  Group,
  Loader,
  NumberInput,
  Box,
  UnstyledButton,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useLocale, useTranslations } from "next-intl";
import {
  IconAlertTriangle,
  IconCircleCheck,
  IconMapPin,
  IconMapPinOff,
  IconSearch,
} from "@tabler/icons-react";
import { api } from "~/trpc/react";
import { geocodePlaceQuery, type GeocodeHit } from "~/lib/map/geocode-lookup";
import {
  challengeErrorKey,
  locationChain,
  movedFromSource,
  placeNameFromLabel,
  placementInTeamArea,
} from "~/lib/location-challenge";
import type { GqlSignalLocationChallenge } from "~/lib/types/graphql";
import { useLocationChallengeFiling } from "./use-location-challenge-filing";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";
/** Pause after the last keystroke before asking the geocoder. */
const SEARCH_DELAY_MS = 300;

export type LocationChallengeQueuePayload = {
  signalId: string;
  note?: string;
  proposedLat?: number;
  proposedLng?: number;
  proposedName?: string;
};

/** A corrected point picked from the place search, or carried over from the
 *  open challenge being updated. */
type PickedPoint = { lat: number; lng: number; name: string | null; label: string };

interface LocationChallengeModalProps {
  opened: boolean;
  onClose: () => void;
  signalId: string;
  /** Prefill from the current source pin when proposing a nudge. */
  sourceLat?: number;
  sourceLng?: number;
  /** The Signal's open challenge, when updating it: the form starts from it
   *  rather than empty, so resubmitting doesn't drop its note or point. */
  existing?: GqlSignalLocationChallenge | null;
  /**
   * Map context: leave the modal and place a corrected pin by clicking the map.
   * When omitted (e.g. Signal detail), the place search and manual coordinates
   * are offered.
   */
  onPlaceOnMap?: (draft: { note?: string }) => void;
  /**
   * When clear-api schema is not shipped yet, optionally queue a local
   * visual fallback (map dual-pin / challenged affordance) instead of only
   * failing the submit.
   */
  onUnavailableQueue?: (payload: LocationChallengeQueuePayload) => void;
}

/**
 * File a Location challenge on a Signal for the active team: why its pin looks
 * wrong, optionally with a corrected point found by place search, typed as
 * coordinates, or placed on the map. The team's admin decides it; nothing
 * changes on the Signal until then.
 */
export function LocationChallengeModal({
  opened,
  onClose,
  signalId,
  sourceLat,
  sourceLng,
  existing,
  onPlaceOnMap,
  onUnavailableQueue,
}: LocationChallengeModalProps) {
  const t = useTranslations("locationChallenge");
  const tActions = useTranslations("common.actions");
  const tToasts = useTranslations("common.toasts");
  const locale = useLocale();
  const utils = api.useUtils();
  const filing = useLocationChallengeFiling();

  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<GeocodeHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [picked, setPicked] = useState<PickedPoint | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const [manualEntry, setManualEntry] = useState(false);
  const [lat, setLat] = useState<number | string>(sourceLat ?? "");
  const [lng, setLng] = useState<number | string>(sourceLng ?? "");
  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submittedWithCorrection, setSubmittedWithCorrection] = useState(false);
  /** True when clear-api is missing and we only queued a session-local visual. */
  const [submittedSessionOnly, setSubmittedSessionOnly] = useState(false);

  useEffect(() => {
    if (!opened) return;
    const point =
      existing?.proposedLat != null && existing.proposedLng != null
        ? { lat: existing.proposedLat, lng: existing.proposedLng }
        : null;
    setQuery("");
    setHits([]);
    setPicked(
      point
        ? {
            ...point,
            name: existing?.proposedName ?? null,
            label: existing?.proposedName ?? `${point.lat.toFixed(5)}, ${point.lng.toFixed(5)}`,
          }
        : null,
    );
    setManualEntry(false);
    setLat(sourceLat ?? "");
    setLng(sourceLng ?? "");
    setName("");
    setNote(existing?.note ?? "");
    setSubmitted(false);
    setSubmittedWithCorrection(false);
    setSubmittedSessionOnly(false);
  }, [opened, sourceLat, sourceLng, existing]);

  // Look the place up once typing pauses; a newer keystroke cancels the last.
  useEffect(() => {
    if (!opened || picked) return;
    const text = query.trim();
    abortRef.current?.abort();
    if (text.length < 2) {
      setHits([]);
      setSearching(false);
      return;
    }
    const ac = new AbortController();
    abortRef.current = ac;
    setSearching(true);
    const timer = window.setTimeout(() => {
      void geocodePlaceQuery(text, MAPBOX_TOKEN, { limit: 6, signal: ac.signal, language: locale }).then(
        (next) => {
          if (ac.signal.aborted) return;
          setHits(next);
          setSearching(false);
        },
      );
    }, SEARCH_DELAY_MS);
    return () => {
      window.clearTimeout(timer);
      ac.abort();
    };
  }, [query, opened, picked, locale]);

  const latNum = typeof lat === "number" ? lat : Number(lat);
  const lngNum = typeof lng === "number" ? lng : Number(lng);
  // Typed coordinates count only once they leave the source pin: the fields
  // start there, so opening them must not file the source as a correction.
  const manualPoint =
    manualEntry &&
    lat !== "" &&
    lng !== "" &&
    Number.isFinite(latNum) &&
    Number.isFinite(lngNum) &&
    latNum >= -90 &&
    latNum <= 90 &&
    lngNum >= -180 &&
    lngNum <= 180 &&
    movedFromSource(latNum, lngNum, sourceLat, sourceLng)
      ? { lat: latNum, lng: lngNum, name: name.trim() || null }
      : null;
  const point = picked ?? manualPoint;

  const placement = api.locationChallenge.placement.useQuery(
    { lat: point?.lat ?? 0, lng: point?.lng ?? 0 },
    { enabled: opened && !!point, staleTime: 60_000 },
  );
  // A point outside every loaded area can't be placed (clear-api refuses it),
  // nor one outside the team's area unless a platform admin files it.
  const outsideCoverage = !!point && placement.isSuccess && !placement.data;
  const outsideTeamArea =
    !!point &&
    !!placement.data &&
    !filing.canPlaceAnywhere &&
    !placementInTeamArea(placement.data, filing.teamLocations);

  const submit = api.locationChallenge.submit.useMutation({
    onSuccess: async (_data, variables) => {
      setSubmittedWithCorrection(
        variables.proposedLat != null && variables.proposedLng != null,
      );
      setSubmittedSessionOnly(false);
      setSubmitted(true);
      await Promise.all([
        utils.locationChallenge.getBySignal.invalidate({ signalId }),
        utils.locationChallenge.listForMap.invalidate(),
      ]);
    },
    onError: (err, variables) => {
      const backendMissing = err.message.includes("LOCATION_CHALLENGE_BACKEND_UNAVAILABLE");
      if (backendMissing && onUnavailableQueue) {
        onUnavailableQueue({
          signalId: variables.signalId,
          note: variables.note,
          proposedName: variables.proposedName,
          proposedLat: variables.proposedLat,
          proposedLng: variables.proposedLng,
        });
        setSubmittedWithCorrection(
          variables.proposedLat != null && variables.proposedLng != null,
        );
        setSubmittedSessionOnly(true);
        setSubmitted(true);
        return;
      }
      notifications.show({
        title: tToasts("error"),
        message: backendMissing ? t("errors.backendUnavailable") : t(challengeErrorKey(err.data?.code)),
        color: "red",
      });
    },
  });

  function handleClose() {
    onClose();
  }

  function handlePlaceOnMap() {
    onPlaceOnMap?.({ note: note.trim() || undefined });
    onClose();
  }

  function pick(hit: GeocodeHit) {
    const [hitLng, hitLat] = hit.center;
    setPicked({ lat: hitLat, lng: hitLng, name: placeNameFromLabel(hit.label), label: hit.label });
    setQuery(hit.label);
    setHits([]);
    setManualEntry(false);
  }

  function clearPick() {
    setPicked(null);
    setQuery("");
  }

  function toggleManualEntry() {
    setManualEntry((open) => {
      // Typed coordinates replace a picked place.
      if (!open) clearPick();
      return !open;
    });
  }

  function handleSubmit() {
    if (!filing.teamId) return;
    submit.mutate({
      signalId,
      teamId: filing.teamId,
      note: note.trim() || undefined,
      proposedName: point?.name ?? undefined,
      proposedLat: point?.lat,
      proposedLng: point?.lng,
    });
  }

  const labelStyles = {
    label: {
      fontSize: 12,
      fontWeight: 600,
      color: "var(--color-text-primary)",
      marginBottom: 4,
    },
  };

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title={submitted ? undefined : t("modal.title")}
      size="sm"
      centered
      styles={{
        title: { fontSize: 15, fontWeight: 700, color: "var(--color-text-primary)" },
        body: { paddingTop: submitted ? 0 : 8 },
      }}
    >
      {submitted ? (
        <Stack align="center" gap={12} py={28}>
          {submittedSessionOnly ? (
            <IconAlertTriangle size={52} color="var(--color-warning)" style={{ strokeWidth: 1.5 }} />
          ) : (
            <IconCircleCheck size={52} color="var(--color-success)" style={{ strokeWidth: 1.5 }} />
          )}
          <Text fw={700} size="lg" c="var(--color-text-primary)">
            {submittedSessionOnly ? t("modal.sessionOnlyTitle") : t("modal.successTitle")}
          </Text>
          <Text size="sm" c="var(--color-text-muted)" ta="center" maw={280}>
            {submittedSessionOnly
              ? submittedWithCorrection
                ? t("modal.sessionOnlyCorrection")
                : t("modal.sessionOnlyChallenge")
              : submittedWithCorrection
                ? t("modal.successCorrection")
                : t("modal.successChallenge")}
          </Text>
          <Button variant="subtle" color="gray" size="sm" mt={4} onClick={handleClose}>
            {tActions("close")}
          </Button>
        </Stack>
      ) : (
        <Stack gap={14}>
          <Box
            p={10}
            style={{
              background: "var(--color-bg-muted)",
              border: "1px solid var(--color-border)",
              borderRadius: 6,
              display: "flex",
              gap: 10,
              alignItems: "flex-start",
            }}
          >
            <IconMapPinOff size={18} color="var(--color-text-secondary)" style={{ flexShrink: 0, marginTop: 1 }} />
            <Text size="xs" c="var(--color-text-secondary)" style={{ lineHeight: 1.5 }}>
              {t("modal.intro")}
            </Text>
          </Box>

          <Textarea
            label={t("modal.noteLabel")}
            placeholder={t("modal.notePlaceholder")}
            value={note}
            onChange={(e) => setNote(e.currentTarget.value)}
            minRows={2}
            autosize
            maxRows={5}
            maxLength={2000}
            styles={labelStyles}
          />

          <Stack gap={8}>
            <Text size="xs" fw={600} c="var(--color-text-primary)">
              {t("modal.proposeCorrection")}
            </Text>
            <Text size="xs" c="var(--color-text-muted)" style={{ lineHeight: 1.4, marginTop: -4 }}>
              {onPlaceOnMap ? t("modal.placeOnMapHint") : t("modal.proposeCorrectionHint")}
            </Text>

            <Box>
              <TextInput
                value={query}
                onChange={(e) => {
                  setQuery(e.currentTarget.value);
                  if (picked) setPicked(null);
                }}
                placeholder={t("modal.searchPlaceholder")}
                aria-label={t("modal.searchLabel")}
                leftSection={<IconSearch size={14} />}
                rightSection={searching ? <Loader size={14} /> : null}
                data-testid="location-challenge-search"
              />
              {hits.length > 0 && !picked && (
                <Stack
                  gap={0}
                  mt={4}
                  role="listbox"
                  style={{ border: "1px solid var(--color-border)", borderRadius: 6, overflow: "hidden" }}
                >
                  {hits.map((hit) => (
                    <UnstyledButton
                      key={hit.id}
                      role="option"
                      aria-selected={false}
                      onClick={() => pick(hit)}
                      px={10}
                      py={8}
                      className="hover:bg-[var(--color-bg-muted)] transition-colors"
                    >
                      <Group gap={8} wrap="nowrap">
                        <IconMapPin size={14} color="var(--color-text-muted)" style={{ flexShrink: 0 }} />
                        <Text size="sm" c="var(--color-text-primary)" lineClamp={1}>
                          {hit.label}
                        </Text>
                      </Group>
                    </UnstyledButton>
                  ))}
                </Stack>
              )}
              {!searching && !picked && query.trim().length >= 2 && hits.length === 0 && (
                <Text size="xs" c="var(--color-text-muted)" mt={6}>
                  {t("modal.noResults")}
                </Text>
              )}
            </Box>

            {point && (
              <Box
                p={10}
                style={{ background: "var(--color-bg-muted)", borderRadius: 6 }}
                data-testid="location-challenge-preview"
              >
                <Text size="sm" fw={600} c="var(--color-text-primary)">
                  {picked ? (picked.name ?? picked.label) : `${point.lat.toFixed(5)}, ${point.lng.toFixed(5)}`}
                </Text>
                <Text size="xs" c="var(--color-text-muted)">
                  {placement.isLoading
                    ? t("modal.placing")
                    : outsideCoverage
                      ? t("modal.outsideCoverage")
                      : placement.data
                        ? t("modal.landsIn", { chain: locationChain(placement.data) ?? "" })
                        : null}
                </Text>
                {outsideTeamArea && (
                  <Text size="xs" c="var(--color-warning)" mt={2} data-testid="location-challenge-outside-team">
                    {t("modal.outsideTeamArea")}
                  </Text>
                )}
                {picked && (
                  <UnstyledButton onClick={clearPick} mt={4}>
                    <Text size="xs" c="var(--color-accent)">
                      {t("modal.changePick")}
                    </Text>
                  </UnstyledButton>
                )}
              </Box>
            )}

            {onPlaceOnMap && (
              <Button
                size="sm"
                variant="light"
                color="gray"
                leftSection={<IconMapPin size={14} />}
                onClick={handlePlaceOnMap}
                style={{ fontWeight: 600 }}
              >
                {t("modal.placeOnMap")}
              </Button>
            )}

            <UnstyledButton
              type="button"
              onClick={toggleManualEntry}
              style={{
                fontSize: 11,
                fontWeight: 500,
                color: "var(--color-text-muted)",
                cursor: "pointer",
                alignSelf: onPlaceOnMap ? "flex-start" : undefined,
                padding: 0,
              }}
            >
              {manualEntry
                ? t("modal.hideManualCoordinates")
                : t("modal.enterCoordinatesManually")}
            </UnstyledButton>

            {manualEntry && (
              <Stack gap={10}>
                <Group grow align="flex-start">
                  <NumberInput
                    label={t("modal.lat")}
                    value={lat}
                    onChange={setLat}
                    decimalScale={6}
                    hideControls
                    required
                    styles={labelStyles}
                  />
                  <NumberInput
                    label={t("modal.lng")}
                    value={lng}
                    onChange={setLng}
                    decimalScale={6}
                    hideControls
                    required
                    styles={labelStyles}
                  />
                </Group>
                <TextInput
                  label={t("modal.placeName")}
                  placeholder={t("modal.placeNamePlaceholder")}
                  value={name}
                  onChange={(e) => setName(e.currentTarget.value)}
                  maxLength={500}
                  styles={labelStyles}
                />
              </Stack>
            )}
          </Stack>

          <Group justify="flex-end" mt={4}>
            <Button variant="subtle" color="gray" size="sm" onClick={handleClose}>
              {tActions("cancel")}
            </Button>
            <Button
              size="sm"
              loading={submit.isPending}
              disabled={
                !filing.teamId ||
                (!!point && (placement.isLoading || outsideCoverage || outsideTeamArea))
              }
              onClick={handleSubmit}
              data-testid="location-challenge-submit"
              style={{
                background: "var(--color-accent)",
                borderColor: "var(--color-accent)",
                fontSize: 12,
              }}
            >
              {point ? t("modal.submitCorrection") : t("modal.submitChallenge")}
            </Button>
          </Group>
        </Stack>
      )}
    </Modal>
  );
}
