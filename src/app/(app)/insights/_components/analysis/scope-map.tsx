"use client";

import { useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useFormatter, useTranslations } from "next-intl";
import { IconArrowsMaximize, IconInfoCircle, IconMapPin, IconMinus, IconPlus } from "@tabler/icons-react";
import { api } from "~/trpc/react";
import type { CrisisMapApi, MapMarker, MapRegion } from "~/components/map/crisis-map";
import { resolveCountryConfig } from "~/lib/constants/country-config";
import { combineGeometries, eventsByArea } from "~/lib/analysis-view";
import type { AnalysisEvent, AnalysisEvents } from "~/server/api/mappers/analysis";
import styles from "./dark/analysis-dark.module.css";

const CrisisMap = dynamic(
  () => import("~/components/map/crisis-map").then((m) => m.CrisisMap),
  { ssr: false, loading: () => <div className={styles.mapFill} /> },
);

const MAX_AREAS = 8;

/** One halo per state, sized by how many plotted events sit there. */
function hotspotsFrom(items: AnalysisEvent[]): MapMarker[] {
  const by = new Map<string, { name: string; lng: number; lat: number; n: number; count: number }>();
  for (const event of items) {
    if (!event.point) continue;
    const key = event.admin1?.id ?? event.locationName ?? event.id;
    const name = event.admin1?.name ?? event.locationName ?? event.title ?? "";
    const row = by.get(key) ?? { name, lng: 0, lat: 0, n: 0, count: 0 };
    row.lng += event.point[0];
    row.lat += event.point[1];
    row.n += 1;
    row.count += 1;
    by.set(key, row);
  }
  const rows = [...by.values()];
  const top = Math.max(1, ...rows.map((row) => row.count));
  const floor = rows.reduce((min, row) => Math.min(min, row.count), top);
  return rows.map((row, index) => {
    const span = top === floor ? 1 : (row.count - floor) / (top - floor);
    return {
      id: index,
      lng: row.lng / row.n,
      lat: row.lat / row.n,
      title: row.name,
      severity: "high" as const,
      markerKind: "hotspot" as const,
      hotspotSize: Math.round(24 + span * 20),
    };
  });
}

/**
 * Real Mapbox map in the analysis handoff chrome: orange country outline,
 * one hotspot per state, and the event counts beside it.
 */
export function ScopeMap({
  countryId,
  countryName,
  scopeName,
  areaIds,
  since,
  events,
  failed = false,
}: {
  countryId: string;
  countryName: string;
  scopeName: string;
  /** The created analysis' areas; empty for the whole country. */
  areaIds: string[];
  since: string;
  events: AnalysisEvents | undefined;
  /** The events query failed. Missing events are still loading until then. */
  failed?: boolean;
}) {
  const [legendOpen, setLegendOpen] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);
  const mapApiRef = useRef<CrisisMapApi | null>(null);
  const t = useTranslations("analysis");
  const format = useFormatter();
  const country = api.locations.getById.useQuery(
    { id: countryId },
    { staleTime: Infinity, refetchOnWindowFocus: false },
  );
  const areaQueries = api.useQueries((q) =>
    areaIds.map((id) => q.locations.getById({ id }, { staleTime: Infinity, refetchOnWindowFocus: false })),
  );
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
  const scopeRegions = useMemo<MapRegion[] | undefined>(
    () =>
      scopeAreas
        ?.filter((area) => area.geometry)
        .map((area) => ({
          id: area.id,
          geometry: area.geometry as MapRegion["geometry"],
          severity: "unknown" as const,
          title: area.name,
        })),
    [scopeAreas],
  );
  const scopeGeometry = useMemo(
    () => (scopeAreas ? (combineGeometries(scopeAreas.map((area) => area.geometry)) ?? undefined) : undefined),
    [scopeAreas],
  );
  const config = resolveCountryConfig(countryName);
  const center: [number, number] = config?.center ?? [10, 20];

  const items = useMemo(() => events?.items ?? [], [events]);
  const hotspots = useMemo(() => hotspotsFrom(items), [items]);
  const areas = useMemo(() => eventsByArea(items).slice(0, MAX_AREAS), [items]);
  const sinceLabel = format.dateTime(new Date(since), { day: "numeric", month: "short", year: "numeric" });
  // Undefined means the events query has not arrived. A resolved empty page
  // is `{ totalCount: 0, items: [] }` and still uses the empty copy. A failure
  // is neither of those: the request stopped, and the total is unknown.
  const loading = !failed && events == null;
  const total = events?.totalCount ?? 0;
  const scopeLine = areaIds.length > 0 ? t("scope.areas", { count: areaIds.length }) : t("scope.wholeCountry");
  const meta = items.length > 0 ? `${scopeLine} · ${t("map.recent", { count: items.length })}` : scopeLine;
  const max = Math.max(1, ...areas.map((a) => a.count));

  function zoom(delta: number) {
    mapApiRef.current?.zoomBy(delta);
  }

  function toggleFullScreen() {
    const stage = stageRef.current;
    if (!stage) return;
    if (document.fullscreenElement) {
      void document.exitFullscreen();
      return;
    }
    void stage.requestFullscreen();
  }

  return (
    <section className={styles.mapRow} aria-label={t("map.title")}>
      <div className={styles.mapCard}>
        <div className={styles.mapHead}>
          <span className={styles.mapTitle}>
            <IconMapPin size={15} stroke={1.9} color="var(--sa-accent)" />
            {t("map.hotspots", { scope: scopeName })}
          </span>
          <span className={styles.mapMeta}>
            <span className={styles.mapSample}>{meta}</span>
            <button
              type="button"
              className={styles.legendBtn}
              aria-expanded={legendOpen}
              onClick={() => setLegendOpen((open) => !open)}
            >
              <IconInfoCircle size={14} stroke={1.8} />
              {t("layout.legend")}
            </button>
          </span>
        </div>
        <div className={styles.mapStage} ref={stageRef} data-testid="analysis-map">
          <div className={styles.mapFill}>
            <CrisisMap
              appearance="analysis"
              showNavigation={false}
              markers={hotspots}
              regions={scopeRegions}
              center={center}
              zoom={config?.zoom ?? 4.5}
              className={styles.mapCanvas}
              focusCountryPCode={config?.pCode}
              focusCountryName={countryName}
              focusCountryGeometry={country.data?.geometry ?? undefined}
              fitBoundsOnFocus={false}
              fitBoundsGeometry={scopeGeometry}
              adminBoundaryLevel={1}
              showDensityHeatmap={false}
              showRoads={false}
              mapApiRef={mapApiRef}
            />
          </div>
          <div className={styles.zoomStack}>
            <button type="button" aria-label={t("map.zoomIn")} onClick={() => zoom(1)}>
              <IconPlus size={14} stroke={2} />
            </button>
            <button type="button" aria-label={t("map.zoomOut")} onClick={() => zoom(-1)}>
              <IconMinus size={14} stroke={2} />
            </button>
            <button type="button" aria-label={t("map.fullScreen")} onClick={toggleFullScreen}>
              <IconArrowsMaximize size={14} stroke={1.8} />
            </button>
          </div>
          {legendOpen && (
            <div className={styles.legendPop}>
              <div className={styles.railLabel}>{t("layout.legendHow")}</div>
              <div className={styles.legendRow}>
                <span className={styles.swatchArea} />
                {areaIds.length > 0 ? t("layout.legendArea") : t("layout.legendAreaCountry")}
              </div>
              <div className={styles.legendRow}>
                <span className={styles.swatchHot}>
                  <span className={styles.swatchCore} />
                </span>
                {t("layout.legendHotspot")}
              </div>
              <div className={styles.legendRow}>
                <span className={styles.swatchDash} />
                {t("layout.legendBoundary")}
              </div>
            </div>
          )}
          <div data-testid="minimap" hidden>
            {scopeAreas
              ? scopeAreas.map((area) => `${area.id}:${area.geometry ? "outlined" : "none"}`).join(",")
              : hotspots.length > 0
                ? `${hotspots.length} markers`
                : null}
          </div>
        </div>
      </div>
      <div className={styles.sideCard}>
        <div className={styles.sideCount}>
          {failed ? (
            <span className={styles.mapSample}>{t("map.error")}</span>
          ) : loading ? (
            <span className={styles.mapSample}>{t("map.loading")}</span>
          ) : (
            <>
              <span className={styles.count}>{total.toLocaleString()}</span>
              <span className={styles.mapSample}>{t("map.eventsSince", { count: total, date: sinceLabel })}</span>
            </>
          )}
        </div>
        <div className={styles.railLabel}>{t("map.areas")}</div>
        {failed || loading ? null : areas.length === 0 ? (
          <span style={{ fontSize: 13, color: "var(--sa-muted)" }}>{t("map.noEvents", { date: sinceLabel })}</span>
        ) : (
          areas.map((area) => (
            <div key={area.id} className={styles.barRow}>
              <span className={styles.barName}>{area.name}</span>
              <div className={styles.track}>
                <div className={styles.bar} style={{ width: `${(area.count / max) * 100}%` }} />
              </div>
              <span className={styles.barCount}>{t("map.areaEvents", { count: area.count })}</span>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
