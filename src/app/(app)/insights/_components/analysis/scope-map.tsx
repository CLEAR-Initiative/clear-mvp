"use client";

import { useMemo } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { Box, Grid, Stack, Text } from "@mantine/core";
import { api } from "~/trpc/react";
import { MinimapCard } from "~/components/map/minimap-card";
import type { MapMarker } from "~/components/map/crisis-map";
import { mapSeverity } from "~/lib/types/graphql";
import { resolveCountryConfig } from "~/lib/constants/country-config";
import { eventsByArea } from "~/lib/analysis-view";
import type { AnalysisEvents } from "~/server/api/mappers/analysis";

const MAX_AREAS = 8;

/**
 * The existing minimap, outlining the scope and plotting its events, with the
 * scope panel beside it. An area scope outlines every area and fits them all.
 */
export function ScopeMap({
  countryId,
  countryName,
  scopeName,
  areaIds,
  since,
  events,
}: {
  countryId: string;
  countryName: string;
  scopeName: string;
  /** The created analysis' areas; empty for the whole country. */
  areaIds: string[];
  since: string;
  events: AnalysisEvents | undefined;
}) {
  const t = useTranslations("analysis");
  const format = useFormatter();
  const country = api.locations.getById.useQuery(
    { id: countryId },
    { staleTime: Infinity, refetchOnWindowFocus: false },
  );
  const areaQueries = api.useQueries((q) =>
    areaIds.map((id) => q.locations.getById({ id }, { staleTime: Infinity, refetchOnWindowFocus: false })),
  );
  // Rebuilt only when an area's geometry arrives, so the map does not refit on every render.
  const areaGeometries = areaQueries.map((a) => a.data?.geometry ?? null);
  const areaKey = areaQueries.map((a, i) => `${areaIds[i]}:${a.data ? 1 : 0}`).join(",");
  const scopeAreas = useMemo(
    () =>
      areaIds.length === 0
        ? undefined
        : areaIds.map((id, i) => ({
            id,
            name: areaQueries[i]?.data?.name ?? id,
            geometry: areaGeometries[i] ?? null,
          })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [areaKey],
  );
  const config = resolveCountryConfig(countryName);
  const center: [number, number] = config?.center ?? [10, 20];

  const items = useMemo(() => events?.items ?? [], [events]);
  const markers = useMemo<MapMarker[]>(
    () =>
      items
        .filter((e) => e.point)
        .map((e, i) => ({
          id: i,
          lng: e.point![0],
          lat: e.point![1],
          title: e.title ?? e.types[0] ?? t("events.untitled"),
          severity: mapSeverity(e.severity),
          description: e.locationName ?? undefined,
          type: e.types[0],
          markerKind: "event" as const,
        })),
    [items, t],
  );
  const areas = useMemo(() => eventsByArea(items).slice(0, MAX_AREAS), [items]);
  const sinceLabel = format.dateTime(new Date(since), { day: "numeric", month: "short", year: "numeric" });
  const total = events?.totalCount ?? 0;

  return (
    <Grid gutter={16} mb={24}>
      <Grid.Col span={{ base: 12, md: 8 }} data-testid="analysis-map">
        <MinimapCard
          markers={markers}
          center={center}
          countryGeometry={country.data?.geometry ?? undefined}
          countryId={countryId}
          countryName={countryName}
          countryPCode={config?.pCode}
          location={null}
          locationName={scopeName}
          scopeAreas={scopeAreas}
        />
      </Grid.Col>

      <Grid.Col span={{ base: 12, md: 4 }}>
      <Stack gap={16}>
        <Box p={16} style={{ border: "1px solid var(--color-border)", background: "var(--color-bg-white)" }}>
          <Text fw={700} tt="uppercase" c="var(--color-text-secondary)" style={{ fontSize: 11, letterSpacing: "0.08em" }}>
            {t("map.title")}
          </Text>
          <Text fw={700} c="var(--color-text-primary)" mt={6} style={{ fontSize: 18 }}>
            {scopeName}
          </Text>
          <Text c="var(--color-text-secondary)" style={{ fontSize: 13 }}>
            {areaIds.length > 0 ? t("scope.areas", { count: areaIds.length }) : t("scope.wholeCountry")}
          </Text>
          <Text c="var(--color-text-primary)" mt={10} style={{ fontSize: 13 }}>
            {t("map.events", { count: total, date: sinceLabel })}
          </Text>
          {total > items.length && (
            <Text c="var(--color-text-muted)" style={{ fontSize: 12 }}>
              {t("map.sample", { count: items.length })}
            </Text>
          )}
        </Box>

        <Box p={16} style={{ border: "1px solid var(--color-border)", background: "var(--color-bg-white)" }}>
          <Text fw={700} tt="uppercase" c="var(--color-text-secondary)" mb={10} style={{ fontSize: 11, letterSpacing: "0.08em" }}>
            {t("map.areas")}
          </Text>
          {areas.length === 0 ? (
            <Text c="var(--color-text-muted)" style={{ fontSize: 13 }}>
              {t("map.noEvents", { date: sinceLabel })}
            </Text>
          ) : (
            <Stack gap={8}>
              {areas.map((a) => (
                <Box key={a.id} style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                  <Text c="var(--color-text-primary)" style={{ fontSize: 13 }}>
                    {a.name}
                  </Text>
                  <Text c="var(--color-text-secondary)" style={{ fontSize: 12, whiteSpace: "nowrap" }}>
                    {t("map.areaEvents", { count: a.count })}
                  </Text>
                </Box>
              ))}
            </Stack>
          )}
        </Box>
      </Stack>
      </Grid.Col>
    </Grid>
  );
}
