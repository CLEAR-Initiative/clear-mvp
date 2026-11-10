"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Box, Button, Group, Modal, Radio, Select, Stack, Text, TextInput, Textarea } from "@mantine/core";
import { api } from "~/trpc/react";
import { aliasErrorKey, aliasTargetPath, resolutionForSuggestion, suggestionKey } from "~/lib/place-names";
import type { GqlPlaceAlias, GqlPlaceNameSuggestion } from "~/lib/types/graphql";
import { LocationChallengeMap } from "~/components/location-challenge/location-challenge-map";
import { LocationPointFields, useLocationPointPicker } from "~/components/location-challenge/location-point-picker";

/** The scope select's value for an alias that applies in the whole country. */
const WHOLE_COUNTRY = "__country__";

/** How the reader gives the target: the one the alias has, a suggested
 *  place, or a point on the map. */
type TargetMode = "keep" | "suggestion" | "point";

/**
 * Add a place alias by hand, or change one (clear-api ADR-0019).
 *
 * Adding: a spelling, an optional Arabic spelling, a country, a scope (a
 * state, or the whole country for a platform admin) and a target. The target
 * is a place CLEAR or GeoNames already knows (the same suggestions as the
 * Places queue) or a point on the map.
 *
 * Changing: the target, the scope or the note. The spelling is the alias's
 * key and does not change: delete the alias and add another.
 *
 * clear-api checks the reader, the scope and the target on save; its refusal
 * shows in the form.
 */
export function AliasFormModal({
  alias,
  canPlaceAnywhere,
  onClose,
  onSaved,
}: {
  /** The alias to change, or null to add one. */
  alias: GqlPlaceAlias | null;
  /** A platform admin: may scope an alias to the whole country, and put a
   *  target outside the scope. */
  canPlaceAnywhere: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const t = useTranslations("inbox");
  const scopes = api.placeNames.aliasScopes.useQuery(undefined, { staleTime: 10 * 60_000 });
  const countries = scopes.data ?? [];

  const [name, setName] = useState(alias?.nameDisplay ?? "");
  const [nameAr, setNameAr] = useState("");
  const [countryChoice, setCountryChoice] = useState<string | null>(alias?.countryCode ?? null);
  // With one country, there is nothing to choose.
  const countryCode = countryChoice ?? (countries.length === 1 ? countries[0]!.countryCode : null);
  const country = countries.find((c) => c.countryCode === countryCode) ?? null;
  const [scope, setScope] = useState<string | null>(alias ? (alias.scopeLocationId ?? WHOLE_COUNTRY) : null);
  const scopeLocationId = scope === WHOLE_COUNTRY ? null : scope;
  const [note, setNote] = useState(alias?.note ?? "");
  const [mode, setMode] = useState<TargetMode>(alias ? "keep" : "suggestion");
  const [chosen, setChosen] = useState<string | null>(null);

  const spelling = name.trim();
  const suggestionsQuery = api.placeNames.suggestions.useQuery(
    {
      name: spelling,
      nameAr: nameAr.trim() || undefined,
      countryCode: countryCode ?? "",
      withinLocationId: scopeLocationId ?? country?.countryLocationId ?? undefined,
    },
    { enabled: mode === "suggestion" && spelling.length >= 2 && !!countryCode && scope !== null, staleTime: 60_000 },
  );
  const suggestions: GqlPlaceNameSuggestion[] = suggestionsQuery.data ?? [];
  const chosenSuggestion = suggestions.find((s) => suggestionKey(s) === chosen) ?? null;

  const picker = useLocationPointPicker({
    active: mode === "point",
    teamLocations: scopeLocationId ? [{ id: scopeLocationId }] : country?.countryLocationId ? [{ id: country.countryLocationId }] : [],
    canPlaceAnywhere,
  });

  const create = api.placeNames.createAlias.useMutation();
  const update = api.placeNames.updateAlias.useMutation();
  const busy = create.isPending || update.isPending;
  const [error, setError] = useState<string | null>(null);

  /** The target as the mutations take it, or null while it is not given. */
  function target(): { locationId: string } | { point: { lat: number; lng: number; name?: string } } | null {
    if (mode === "point") {
      const point = picker.point;
      if (!point || picker.blocked) return null;
      return { point: { lat: point.lat, lng: point.lng, name: point.name ?? undefined } };
    }
    if (mode === "suggestion" && chosenSuggestion) {
      const resolution = resolutionForSuggestion(chosenSuggestion);
      if (resolution?.kind === "LOCATION") return { locationId: resolution.locationId };
      // A GeoNames place is not a CLEAR location yet: it goes in as a point
      // with its name, and clear-api makes the landmark.
      return {
        point: { lat: chosenSuggestion.latitude, lng: chosenSuggestion.longitude, name: chosenSuggestion.name },
      };
    }
    return null;
  }

  const newTarget = mode === "keep" ? null : target();
  const scopeChanged = !!alias && scopeLocationId !== alias.scopeLocationId;
  const noteChanged = !!alias && note.trim() !== (alias.note ?? "");
  const canSave = alias
    ? scope !== null && (mode === "keep" ? scopeChanged || noteChanged : !!newTarget)
    : spelling.length > 0 && !!countryCode && scope !== null && !!newTarget;

  function save() {
    if (!canSave || busy) return;
    setError(null);
    const callbacks = {
      onSuccess: () => onSaved(),
      onError: (err: { data?: { code?: string } | null }) => setError(t(aliasErrorKey(err.data?.code))),
    };
    if (alias) {
      update.mutate(
        {
          id: alias.id,
          change: {
            ...(scopeChanged ? { scopeLocationId } : {}),
            ...(newTarget ?? {}),
            ...(noteChanged ? { note: note.trim() || null } : {}),
          },
        },
        callbacks,
      );
      return;
    }
    create.mutate(
      {
        name: spelling,
        nameAr: nameAr.trim() || undefined,
        countryCode: countryCode!,
        scopeLocationId,
        ...newTarget!,
        note: note.trim() || undefined,
      },
      callbacks,
    );
  }

  const scopeOptions = [
    ...(country?.states ?? []).map((s) => ({ value: s.id, label: s.name })),
    // Only a platform admin writes a country-wide alias. An alias that is
    // country-wide already keeps the option, so the form shows what it has.
    ...(canPlaceAnywhere || alias?.scopeLocationId === null
      ? [{ value: WHOLE_COUNTRY, label: t("aliases.form.wholeCountry", { country: country?.name ?? countryCode ?? "" }) }]
      : []),
  ];

  return (
    <Modal
      opened
      onClose={() => !busy && onClose()}
      title={alias ? t("aliases.form.editTitle") : t("aliases.form.addTitle")}
      size="lg"
      centered
      closeOnEscape={!busy}
      closeOnClickOutside={!busy}
      transitionProps={{ duration: 0 }}
    >
      <Stack gap={12} data-testid="inbox-alias-form">
        {alias ? (
          <Box>
            <Text size="xs" c="var(--color-text-muted)">{t("aliases.form.spelling")}</Text>
            <Text size="sm" fw={600} data-testid="inbox-alias-form-spelling">
              <bdi>{alias.nameDisplay}</bdi>
            </Text>
            <Text size="xs" c="var(--color-text-muted)">{t("aliases.form.spellingFixed")}</Text>
          </Box>
        ) : (
          <>
            <TextInput
              size="sm"
              label={t("aliases.form.spelling")}
              description={t("aliases.form.spellingHelp")}
              value={name}
              onChange={(e) => setName(e.currentTarget.value)}
              maxLength={500}
              required
              data-testid="inbox-alias-form-name"
            />
            <TextInput
              size="sm"
              label={t("aliases.form.arabic")}
              description={t("aliases.form.arabicHelp")}
              value={nameAr}
              onChange={(e) => setNameAr(e.currentTarget.value)}
              maxLength={500}
              dir="auto"
              lang="ar"
              data-testid="inbox-alias-form-arabic"
            />
            {countries.length !== 1 && (
              <Select
                size="sm"
                label={t("aliases.form.country")}
                data={countries.map((c) => ({ value: c.countryCode, label: c.name }))}
                value={countryCode}
                onChange={(value) => {
                  setCountryChoice(value);
                  setScope(null);
                  setChosen(null);
                }}
                required
                data-testid="inbox-alias-form-country"
              />
            )}
          </>
        )}

        <Select
          size="sm"
          label={t("aliases.form.scope")}
          description={t("aliases.form.scopeHelp")}
          data={scopeOptions}
          value={scope}
          onChange={(value) => {
            setScope(value);
            setChosen(null);
          }}
          searchable
          required
          disabled={!countryCode}
          data-testid="inbox-alias-form-scope"
        />

        <Radio.Group
          label={t("aliases.form.target")}
          value={mode}
          onChange={(value) => {
            setMode(value as TargetMode);
            setError(null);
            if (value === "point") picker.reset();
          }}
        >
          <Stack gap={6} mt={6}>
            {alias && (
              <Radio
                size="xs"
                value="keep"
                label={t("aliases.form.keep", { place: aliasTargetPath(alias) ?? t("aliases.targetGone") })}
                data-testid="inbox-alias-form-keep"
              />
            )}
            <Radio size="xs" value="suggestion" label={t("aliases.form.pick")} data-testid="inbox-alias-form-pick" />
            <Radio size="xs" value="point" label={t("aliases.form.point")} data-testid="inbox-alias-form-point" />
          </Stack>
        </Radio.Group>

        {mode === "suggestion" && (
          <Box data-testid="inbox-alias-form-suggestions">
            {spelling.length < 2 || !countryCode || scope === null ? (
              <Text size="xs" c="var(--color-text-muted)">{t("aliases.form.suggestionsNeed")}</Text>
            ) : suggestionsQuery.isLoading ? (
              <Text size="xs" c="var(--color-text-muted)">{t("place.suggestionsLoading")}</Text>
            ) : suggestions.length === 0 ? (
              <Text size="xs" c="var(--color-text-muted)">{t("place.noSuggestions")}</Text>
            ) : (
              <Radio.Group value={chosen} onChange={setChosen} aria-label={t("aliases.form.pick")}>
                <Stack gap={4}>
                  {suggestions.map((s) => (
                    <Radio
                      key={suggestionKey(s)}
                      size="xs"
                      value={suggestionKey(s)}
                      data-testid="inbox-alias-form-suggestion"
                      label={
                        <>
                          <bdi>{s.name}</bdi>
                          {" · "}
                          {t(s.kind === "LOCATION" ? (s.level === 2 ? "place.kinds.district" : "place.kinds.landmark") : "place.kinds.geonames")}
                          {s.insideArea === false && ` · ${t("aliases.form.outsideScope", { km: Math.round(s.distanceKm ?? 0) })}`}
                        </>
                      }
                    />
                  ))}
                </Stack>
              </Radio.Group>
            )}
          </Box>
        )}

        {mode === "point" && (
          <Box data-testid="inbox-alias-form-map">
            <LocationChallengeMap
              source={null}
              proposed={null}
              placed={picker.point}
              picking
              onPick={picker.placeAt}
            />
            <Box mt={8}>
              <LocationPointFields picker={picker} toggleAlign="start" />
            </Box>
          </Box>
        )}

        <Textarea
          size="sm"
          label={t("aliases.form.note")}
          value={note}
          onChange={(e) => setNote(e.currentTarget.value)}
          maxLength={2000}
          autosize
          minRows={2}
          dir="auto"
          data-testid="inbox-alias-form-note"
        />

        {error && (
          <Text size="sm" c="var(--color-critical)" role="alert">
            {error}
          </Text>
        )}

        <Group justify="flex-end" gap={8}>
          <Button size="xs" variant="default" disabled={busy} onClick={onClose}>
            {t("aliases.cancel")}
          </Button>
          <Button size="xs" loading={busy} disabled={!canSave} onClick={save} data-testid="inbox-alias-form-save">
            {alias ? t("aliases.form.saveChange") : t("aliases.form.saveNew")}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
