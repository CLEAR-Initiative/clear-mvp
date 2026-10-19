"use client";

import { useMemo, useState } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { api } from "~/trpc/react";
import { MinimapCard } from "~/components/map/minimap-card";
import type { MapMarker } from "~/components/map/crisis-map";
import { mapSeverity } from "~/lib/types/graphql";
import { resolveCountryConfig } from "~/lib/constants/country-config";
import { eventsByArea } from "~/lib/analysis-view";
import type { AnalysisEvents } from "~/server/api/mappers/analysis";
import styles from "./dark/analysis-dark.module.css";

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
  const [legendOpen, setLegendOpen] = useState(false);
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

  const max = Math.max(1, ...areas.map((a) => a.count));
  return (
      <section className={styles.mapRow} aria-label={t("map.title")}>
        <div className={styles.mapCard}>
          <div className={styles.mapHead}>
            <span>{scopeName}</span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 10, fontWeight: 400 }}>
              <span style={{ fontSize: 12.5, color: "var(--sa-muted)" }}>
                {areaIds.length > 0 ? t("scope.areas", { count: areaIds.length }) : t("scope.wholeCountry")}
                {total > items.length ? ` · ${t("map.sample", { count: items.length })}` : null}
              </span>
              <button
                type="button"
                className={styles.chip}
                aria-expanded={legendOpen}
                onClick={() => setLegendOpen((open) => !open)}
              >
                {t("layout.legend")}
              </button>
            </span>
          </div>
          <div data-testid="analysis-map">
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
          </div>
          {legendOpen && (
            <div className={styles.legendPop}>
              <div className={styles.railLabel}>{t("layout.legend")}</div>
              <div>{t("layout.legendArea")}</div>
              <div>{t("layout.legendEvents")}</div>
            </div>
          )}
        </div>
        <div className={styles.sideCard}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
            <span className={styles.count}>{total.toLocaleString()}</span>
            <span style={{ fontSize: 12.5, color: "var(--sa-muted)" }}>{t("map.events", { count: total, date: sinceLabel })}</span>
          </div>
          <div className={styles.railLabel}>{t("map.areas")}</div>
          {areas.length === 0 ? (
            <span style={{ fontSize: 13, color: "var(--sa-muted)" }}>{t("map.noEvents", { date: sinceLabel })}</span>
          ) : (
            areas.map((a) => (
              <div key={a.id} className={styles.barRow}>
                <span>{a.name}</span>
                <div className={styles.track}>
                  <div className={styles.bar} style={{ width: `${(a.count / max) * 100}%` }} />
                </div>
                <span style={{ color: "var(--sa-muted)", fontVariantNumeric: "tabular-nums" }}>
                  {t("map.areaEvents", { count: a.count })}
                </span>
              </div>
            ))
          )}
        </div>
      </section>
  );
}
