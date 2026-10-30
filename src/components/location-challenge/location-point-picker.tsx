"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Box, Group, Loader, NumberInput, Stack, Text, TextInput, UnstyledButton } from "@mantine/core";
import { useLocale, useTranslations } from "next-intl";
import { IconMapPin, IconSearch } from "@tabler/icons-react";
import { api } from "~/trpc/react";
import { geocodePlaceQuery, type GeocodeHit } from "~/lib/map/geocode-lookup";
import {
  locationChain,
  movedFromSource,
  placeNameFromLabel,
  placementInTeamArea,
} from "~/lib/location-challenge";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";
/** Pause after the last keystroke before asking the geocoder. */
const SEARCH_DELAY_MS = 300;

/** A point picked from the place search or a map, or carried over from an
 *  open challenge. */
export type PickedPoint = { lat: number; lng: number; name: string | null; label: string };

/** The point the controls give, picked or typed. */
export type ChosenPoint = { lat: number; lng: number; name: string | null };

/** A picked point at these coordinates, labelled by its name or them. */
export function pickedAt(lat: number, lng: number, name: string | null = null): PickedPoint {
  return { lat, lng, name, label: name ?? `${lat.toFixed(5)}, ${lng.toFixed(5)}` };
}

export const fieldLabelStyles = {
  label: {
    fontSize: 12,
    fontWeight: 600,
    color: "var(--color-text-primary)",
    marginBottom: 4,
  },
};

/**
 * The corrected-point controls a Location challenge is filed and decided
 * with: a place search, a point placed on a map, or typed coordinates, and
 * where the point lands in CLEAR. A point outside every loaded area is
 * `blocked` (clear-api refuses it), and so is one outside the team's area
 * unless the reader may place a Signal anywhere (a platform admin).
 */
export function useLocationPointPicker({
  active,
  sourceLat,
  sourceLng,
  teamLocations,
  canPlaceAnywhere,
}: {
  /** The controls are on screen: the search and the placement run only then. */
  active: boolean;
  /** The Signal's pin. Typed coordinates start there and count only once
   *  they leave it. */
  sourceLat?: number;
  sourceLng?: number;
  teamLocations: { id: string }[] | null | undefined;
  canPlaceAnywhere: boolean;
}) {
  const locale = useLocale();
  const [query, setQueryText] = useState("");
  const [hits, setHits] = useState<GeocodeHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [picked, setPicked] = useState<PickedPoint | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const [manualEntry, setManualEntry] = useState(false);
  const [lat, setLat] = useState<number | string>(sourceLat ?? "");
  const [lng, setLng] = useState<number | string>(sourceLng ?? "");
  const [name, setName] = useState("");

  // Look the place up once typing pauses; a newer keystroke cancels the last.
  useEffect(() => {
    if (!active || picked) return;
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
  }, [query, active, picked, locale]);

  const latNum = typeof lat === "number" ? lat : Number(lat);
  const lngNum = typeof lng === "number" ? lng : Number(lng);
  // Typed coordinates count only once they leave the source pin: the fields
  // start there, so opening them must not give the source as a correction.
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
  const point: ChosenPoint | null = picked ?? manualPoint;

  const placement = api.locationChallenge.placement.useQuery(
    { lat: point?.lat ?? 0, lng: point?.lng ?? 0 },
    { enabled: active && !!point, staleTime: 60_000 },
  );
  const outsideCoverage = !!point && placement.isSuccess && !placement.data;
  const outsideTeamArea =
    !!point && !!placement.data && !canPlaceAnywhere && !placementInTeamArea(placement.data, teamLocations);

  /** Start over, from `initial` (an open challenge's point) or nothing. */
  function reset(initial: PickedPoint | null = null) {
    setQueryText("");
    setHits([]);
    setPicked(initial);
    setManualEntry(false);
    setLat(sourceLat ?? "");
    setLng(sourceLng ?? "");
    setName("");
  }

  function setQuery(value: string) {
    setQueryText(value);
    if (picked) setPicked(null);
  }

  function pick(hit: GeocodeHit) {
    const [hitLng, hitLat] = hit.center;
    setPicked({ lat: hitLat, lng: hitLng, name: placeNameFromLabel(hit.label), label: hit.label });
    setQueryText(hit.label);
    setHits([]);
    setManualEntry(false);
  }

  /** A point placed on a map. It has no name, so the Signal shows its admin
   *  area's. */
  function placeAt(at: { lat: number; lng: number }) {
    setPicked(pickedAt(at.lat, at.lng));
    setQueryText("");
    setHits([]);
    setManualEntry(false);
  }

  function clearPick() {
    setPicked(null);
    setQueryText("");
  }

  function toggleManualEntry() {
    // Typed coordinates replace a picked place, starting from it so that
    // editing one field keeps the other.
    if (!manualEntry && picked) {
      setLat(picked.lat);
      setLng(picked.lng);
      setName(picked.name ?? "");
      clearPick();
    }
    setManualEntry(!manualEntry);
  }

  return {
    query,
    setQuery,
    hits,
    searching,
    picked,
    pick,
    placeAt,
    clearPick,
    manualEntry,
    toggleManualEntry,
    lat,
    setLat,
    lng,
    setLng,
    name,
    setName,
    point,
    placement,
    outsideCoverage,
    outsideTeamArea,
    /** The point can't be sent: still placing it, or outside the areas. */
    blocked: !!point && (placement.isLoading || outsideCoverage || outsideTeamArea),
    reset,
  };
}

export type LocationPointPicker = ReturnType<typeof useLocationPointPicker>;

/** The picker's controls: the place search, `extra` under it (a map to click,
 *  or "Place on map"), where the point lands in CLEAR, and typed coordinates. */
export function LocationPointFields({
  picker,
  extra,
  toggleAlign,
}: {
  picker: LocationPointPicker;
  extra?: ReactNode;
  /** Align the coordinates toggle to the start rather than stretch it. */
  toggleAlign?: "start";
}) {
  const t = useTranslations("locationChallenge");
  const { point, picked, placement } = picker;

  return (
    <>
      <Box>
        <TextInput
          value={picker.query}
          onChange={(e) => picker.setQuery(e.currentTarget.value)}
          placeholder={t("modal.searchPlaceholder")}
          aria-label={t("modal.searchLabel")}
          leftSection={<IconSearch size={14} />}
          rightSection={picker.searching ? <Loader size={14} /> : null}
          data-testid="location-challenge-search"
        />
        {picker.hits.length > 0 && !picked && (
          <Stack
            gap={0}
            mt={4}
            role="listbox"
            style={{ border: "1px solid var(--color-border)", borderRadius: 6, overflow: "hidden" }}
          >
            {picker.hits.map((hit) => (
              <UnstyledButton
                key={hit.id}
                role="option"
                aria-selected={false}
                onClick={() => picker.pick(hit)}
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
        {!picker.searching && !picked && picker.query.trim().length >= 2 && picker.hits.length === 0 && (
          <Text size="xs" c="var(--color-text-muted)" mt={6}>
            {t("modal.noResults")}
          </Text>
        )}
      </Box>

      {extra}

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
              : picker.outsideCoverage
                ? t("modal.outsideCoverage")
                : placement.data
                  ? t("modal.landsIn", { chain: locationChain(placement.data) ?? "" })
                  : null}
          </Text>
          {picker.outsideTeamArea && (
            <Text size="xs" c="var(--color-warning)" mt={2} data-testid="location-challenge-outside-team">
              {t("modal.outsideTeamArea")}
            </Text>
          )}
          {picked && (
            <UnstyledButton onClick={picker.clearPick} mt={4}>
              <Text size="xs" c="var(--color-accent)">
                {t("modal.changePick")}
              </Text>
            </UnstyledButton>
          )}
        </Box>
      )}

      <UnstyledButton
        type="button"
        onClick={picker.toggleManualEntry}
        style={{
          fontSize: 11,
          fontWeight: 500,
          color: "var(--color-text-muted)",
          cursor: "pointer",
          alignSelf: toggleAlign === "start" ? "flex-start" : undefined,
          padding: 0,
        }}
      >
        {picker.manualEntry ? t("modal.hideManualCoordinates") : t("modal.enterCoordinatesManually")}
      </UnstyledButton>

      {picker.manualEntry && (
        <Stack gap={10}>
          <Group grow align="flex-start">
            <NumberInput
              label={t("modal.lat")}
              value={picker.lat}
              onChange={picker.setLat}
              decimalScale={6}
              hideControls
              required
              styles={fieldLabelStyles}
            />
            <NumberInput
              label={t("modal.lng")}
              value={picker.lng}
              onChange={picker.setLng}
              decimalScale={6}
              hideControls
              required
              styles={fieldLabelStyles}
            />
          </Group>
          <TextInput
            label={t("modal.placeName")}
            placeholder={t("modal.placeNamePlaceholder")}
            value={picker.name}
            onChange={(e) => picker.setName(e.currentTarget.value)}
            maxLength={500}
            styles={fieldLabelStyles}
          />
        </Stack>
      )}
    </>
  );
}
