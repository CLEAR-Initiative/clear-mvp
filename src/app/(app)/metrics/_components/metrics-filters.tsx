"use client";

import { useTranslations } from "next-intl";
import { Group, Select, Text, TextInput } from "@mantine/core";
import { useLocations } from "~/hooks/use-locations";
import { shortCountryName } from "~/lib/constants/country-config";

export interface MetricsFilterValues {
  /** `YYYY-MM-DD`, or "" for clear-api's default. */
  from: string;
  /** `YYYY-MM-DD`, or "" for clear-api's default. */
  to: string;
  /** Country name as `useLocations` lists it, or null for all countries. */
  country: string | null;
}

/** The query input for a filter state: whole UTC days, the location by id,
 * and anything left empty omitted so clear-api applies its default. */
export function metricsQueryInput(
  values: MetricsFilterValues,
  locationIdOf: (name: string) => string | null,
): { from?: string; to?: string; locationId?: string } {
  const input: { from?: string; to?: string; locationId?: string } = {};
  if (values.from) input.from = `${values.from}T00:00:00.000Z`;
  if (values.to) input.to = `${values.to}T23:59:59.999Z`;
  const locationId = values.country ? locationIdOf(values.country) : null;
  if (locationId) input.locationId = locationId;
  return input;
}

/** Date range and country for the metrics. Every country, not the team's:
 * this is a platform-admin page. */
export function MetricsFilters({
  values,
  onChange,
  error,
}: {
  values: MetricsFilterValues;
  onChange: (values: MetricsFilterValues) => void;
  /** clear-api's message for a range it refused, shown under the dates. */
  error: string | null;
}) {
  const t = useTranslations("metrics.filters");
  const { countries, isLoading } = useLocations();

  return (
    <div>
      <Group gap={12} align="flex-end" wrap="wrap">
        <TextInput
          type="date"
          label={t("from")}
          value={values.from}
          onChange={(e) => onChange({ ...values, from: e.currentTarget.value })}
          max={values.to || undefined}
          size="xs"
          w={{ base: "calc(50% - 6px)", xs: 160 }}
          error={!!error}
        />
        <TextInput
          type="date"
          label={t("to")}
          value={values.to}
          onChange={(e) => onChange({ ...values, to: e.currentTarget.value })}
          min={values.from || undefined}
          size="xs"
          w={{ base: "calc(50% - 6px)", xs: 160 }}
          error={!!error}
        />
        <Select
          label={t("country")}
          placeholder={t("allCountries")}
          data={countries.map((name) => ({ value: name, label: shortCountryName(name) }))}
          value={values.country}
          onChange={(country) => onChange({ ...values, country })}
          disabled={isLoading}
          searchable
          clearable
          size="xs"
          w={{ base: "100%", xs: 220 }}
        />
      </Group>
      {error ? (
        <Text size="xs" c="var(--color-critical)" mt={6} role="alert">
          {error}
        </Text>
      ) : (
        <Text size="xs" c="var(--color-text-muted)" mt={6}>
          {t("hint")}
        </Text>
      )}
    </div>
  );
}
