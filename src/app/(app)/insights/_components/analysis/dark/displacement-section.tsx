"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { IconCheck } from "@tabler/icons-react";
import { api } from "~/trpc/react";
import { eventHref } from "~/lib/analytics/event-source";
import { countryCenter } from "~/lib/geo/country-centers";
import { resolveCountryConfig } from "~/lib/constants/country-config";
import type { CrisisMapApi, MapRegion } from "~/components/map/crisis-map";
import type { AnalysisEvents } from "~/server/api/mappers/analysis";
import {
  compactNumber,
  type SaDisplacement,
  type SaDisplacementGroup,
  type SaSource,
} from "~/server/api/mappers/situation-analysis";
import { Citations } from "../../situation/citations";
import { displacementStory, type StoryRow } from "./displacement-story";
import { geometryCenter, layoutMovement, mergeGeometries, type DisplacedPoint, type Geometry } from "./movement-layout";
import styles from "./analysis-dark.module.css";

const TONE_BADGE = { out: styles.storyBadgeOut, back: styles.storyBadgeBack, neutral: styles.storyBadgeOut };
const TONE_CALLOUT = { out: styles.storyCalloutOut, back: styles.storyCalloutBack, neutral: styles.storyCalloutNeutral };

/** NRC's focus is internally displaced people: refugees start switched off. */
const DEFAULT_GROUPS: SaDisplacementGroup[] = ["idp"];
const GROUPS: SaDisplacementGroup[] = ["idp", "refugee"];

function Cite({ refs, sources, onOpen }: { refs: number[]; sources: SaSource[]; onOpen: () => void }) {
  if (refs.length === 0) return null;
  return (
    <>
      {" "}
      <Citations refs={refs} sources={sources} onOpen={onOpen} variant="inline" />
    </>
  );
}

function Finding({ row, sources, onOpen }: { row: StoryRow; sources: SaSource[]; onOpen: () => void }) {
  const t = useTranslations("analysis");
  const badge = row.onMap ? TONE_BADGE[row.tone] : undefined;
  return (
    <li className={styles.storyRow} data-testid="displacement-finding" data-tone={row.tone}>
      <span className={badge ? `${styles.storyBadge} ${badge}` : styles.storyBadge}>{row.num}</span>
      <div className={styles.storyBody}>
        <div className={styles.storyHead}>
          <span className={styles.storyLabel}>{row.label}</span>
          {row.isNew && <span className={styles.storyNew}>● {t("layout.newMark")}</span>}
        </div>
        {row.callout && <div className={`${styles.storyCallout} ${TONE_CALLOUT[row.tone]}`}>{row.callout}</div>}
        <div className={styles.storyText}>
          {row.text}
          <Cite refs={row.refs} sources={sources} onOpen={onOpen} />
        </div>
        {row.asOf && <span className={styles.storyDate}>{row.asOf}</span>}
      </div>
    </li>
  );
}

/** How many findings the header counts, and whether the map is drawn. */
export function displacementMeta(d: SaDisplacement): { count: number; map: boolean } {
  const count = d.findings.length > 0 ? d.findings.length : d.push.length + d.return.length;
  return { count, map: d.findings.length > 0 && d.flows.length > 0 };
}

/**
 * The Displacement section body from the "Situation Analysis" handoff: a
 * numbered story on the left and the movement map on the right. The map is
 * drawn only for edited findings that come with flows.
 */
export function DisplacementBody({
  displacement,
  countryId,
  countryName,
  areaIds,
  scopeName,
  inside,
  events,
  sources,
  onOpenSources,
}: {
  displacement: SaDisplacement;
  countryId: string;
  countryName: string;
  /** A created analysis' districts or states. Empty for a country analysis. */
  areaIds: string[];
  scopeName: string;
  /** People displaced inside the analysed area, from Key figures. */
  inside: number | null;
  /** The analysed area's events. Those that displaced people are drawn where it happened. */
  events?: AnalysisEvents;
  sources: SaSource[];
  onOpenSources: () => void;
}) {
  const t = useTranslations("analysis.findings");
  const [showAll, setShowAll] = useState(false);
  const [groups, setGroups] = useState<ReadonlySet<SaDisplacementGroup>>(new Set(DEFAULT_GROUPS));
  const story = displacementStory(displacement, { push: t("push"), return: t("return") });
  const { map: hasFlows } = displacementMeta(displacement);
  // Only edited findings say who they are about. Findings about both groups always show.
  const grouped = displacement.findings.length > 0;
  const shown = (group: SaDisplacementGroup | null) => !grouped || group == null || groups.has(group);
  const rows = (showAll ? [...story.rows, ...story.more] : story.rows).filter((row) => shown(row.group));
  const flows = displacement.flows.filter((f) => shown(f.group));
  // Events displace people inside the country, so they follow the IDP toggle.
  const points = useMemo<DisplacedPoint[]>(
    () =>
      (events?.items ?? []).flatMap((e) =>
        e.point && e.populationDisplaced && e.populationDisplaced > 0
          ? [{ id: e.id, lonLat: e.point, people: e.populationDisplaced, name: e.locationName }]
          : [],
      ),
    [events],
  );
  /** Findings about each group. A group with no findings and no movements cannot be switched on. */
  const counts = Object.fromEntries(
    GROUPS.map((g) => [g, displacement.findings.filter((f) => f.group === g).length]),
  ) as Record<SaDisplacementGroup, number>;
  const empty = (g: SaDisplacementGroup) => counts[g] === 0 && !displacement.flows.some((f) => f.group === g);
  const toggle = (group: SaDisplacementGroup) =>
    setGroups((current) => {
      const next = new Set(current);
      if (next.has(group)) next.delete(group);
      else next.add(group);
      return next;
    });

  return (
    <div className={styles.storyWrap}>
      {grouped && (
        <div className={styles.groupToggles} role="group" aria-label={t("groupsLabel")} data-testid="displacement-groups">
          {GROUPS.map((group) => (
            <button
              key={group}
              type="button"
              className={styles.groupToggle}
              aria-pressed={groups.has(group)}
              disabled={empty(group)}
              onClick={() => toggle(group)}
            >
              <span className={styles.groupCheck} aria-hidden="true">
                {groups.has(group) && <IconCheck size={11} stroke={3} />}
              </span>
              {t(group === "idp" ? "groupIdp" : "groupRefugee")}
              <span className={styles.groupCount}>{counts[group]}</span>
            </button>
          ))}
        </div>
      )}
      <div className={styles.storySplit}>
        <ol className={styles.storyList} data-testid="displacement-story">
          {rows.map((row) => (
            <Finding key={row.num} row={row} sources={sources} onOpen={onOpenSources} />
          ))}
          {rows.length === 0 && <li className={styles.storyEmpty}>{t("groupsEmpty")}</li>}
          {story.more.length > 0 && (
            <li className={styles.storyMore}>
              <button type="button" className={styles.more} aria-expanded={showAll} onClick={() => setShowAll((v) => !v)}>
                {showAll ? t("showLess") : t("showAll", { count: story.rows.length + story.more.length })}
              </button>
            </li>
          )}
          {story.dataCheck && (
            <li className={styles.dataCheck} data-testid="displacement-data-check">
              <span className={styles.dataCheckTag}>{t("dataCheck")}</span>
              <span>
                {story.dataCheck.text}
                <Cite refs={story.dataCheck.refs} sources={sources} onOpen={onOpenSources} />
              </span>
            </li>
          )}
        </ol>
        {(hasFlows || points.length > 0) && (
          <MovementMap
            displacement={displacement}
            flows={flows}
            countryId={countryId}
            countryName={countryName}
            areaIds={areaIds}
            scopeName={scopeName}
            inside={inside}
            points={!grouped || groups.has("idp") ? points : []}
            badges={new Set(story.rows.filter((r) => r.onMap && shown(r.group)).map((r) => r.num))}
          />
        )}
      </div>
    </div>
  );
}

const CrisisMap = dynamic(() => import("~/components/map/crisis-map").then((m) => m.CrisisMap), {
  ssr: false,
  loading: () => <div className={styles.mapFill} />,
});

/**
 * The movement map: the overview's real map of the analysed area, with the
 * movements drawn over it. Arrows are laid out again on every camera frame, so
 * they follow pans and zooms.
 */
function MovementMap({
  displacement,
  flows,
  countryId,
  countryName,
  areaIds,
  scopeName,
  inside,
  points,
  badges,
}: {
  displacement: SaDisplacement;
  /** The flows the group toggles leave on. */
  flows: SaDisplacement["flows"];
  countryId: string;
  countryName: string;
  areaIds: string[];
  scopeName: string;
  inside: number | null;
  points: DisplacedPoint[];
  badges: Set<number>;
}) {
  const t = useTranslations("analysis.findings");
  const opts = { staleTime: Infinity, refetchOnWindowFocus: false } as const;
  const country = api.locations.getById.useQuery({ id: countryId }, opts);
  const areas = api.useQueries((q) => areaIds.map((id) => q.locations.getById({ id }, opts)));
  const placeIds = useMemo(
    () => [...new Set(displacement.flows.flatMap((f) => [f.from.id, f.to.id]).filter((id): id is string => !!id))],
    [displacement.flows],
  );
  const places = api.useQueries((q) => placeIds.map((id) => q.locations.getById({ id }, opts)));
  // Which locations, and when each loaded: a new set of the same size must still re-run the memos.
  const placesKey = places.map((p, i) => `${placeIds[i]}:${p.dataUpdatedAt}`).join("|");
  const areasKey = areas.map((a, i) => `${areaIds[i]}:${a.dataUpdatedAt}`).join("|");
  const countryGeometry = country.data?.geometry as Geometry | null | undefined;
  const config = resolveCountryConfig(countryName);

  const scope = useMemo(() => {
    if (areaIds.length === 0) return countryGeometry ?? null;
    return mergeGeometries(areas.map((a) => a.data?.geometry as Geometry | null | undefined));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countryGeometry, areasKey, areaIds.length]);
  const scopeRegions = useMemo<MapRegion[] | undefined>(
    () =>
      areaIds.length === 0
        ? undefined
        : areaIds.flatMap((id, i) => {
            const geometry = areas[i]?.data?.geometry as MapRegion["geometry"] | null | undefined;
            return geometry ? [{ id, geometry, severity: "unknown" as const, title: areas[i]?.data?.name ?? id }] : [];
          }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [areasKey, areaIds.length],
  );
  const centers = useMemo(() => {
    const out = new Map<string, [number, number]>();
    placeIds.forEach((id, i) => {
      const c = geometryCenter(places[i]?.data?.geometry as Geometry | null | undefined);
      if (c) out.set(id, c);
    });
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [placesKey]);

  // Re-layout on every camera frame and on resize.
  const mapApiRef = useRef<CrisisMapApi | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [frame, setFrame] = useState(0);
  const raf = useRef<number | null>(null);
  const bump = () => {
    if (raf.current != null) return;
    raf.current = requestAnimationFrame(() => {
      raf.current = null;
      setFrame((n) => n + 1);
    });
  };
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const measure = () => setSize({ w: el.clientWidth, h: el.clientHeight });
    measure();
    const observer = typeof ResizeObserver === "function" ? new ResizeObserver(measure) : null;
    observer?.observe(el);
    // The map fits its bounds after it loads; keep laying out until it can project.
    const poll = window.setInterval(bump, 400);
    const stop = window.setTimeout(() => window.clearInterval(poll), 6000);
    return () => {
      observer?.disconnect();
      window.clearInterval(poll);
      window.clearTimeout(stop);
      if (raf.current != null) cancelAnimationFrame(raf.current);
    };
  }, []);

  const api_ = mapApiRef.current;
  const layout =
    scope && api_ && size.w > 0
      ? layoutMovement({
          flows,
          project: ([lng, lat]) => api_.projectMarker(-1, lng, lat) ?? { x: -9999, y: -9999 },
          size,
          scope,
          scopeIds: areaIds.length > 0 ? areaIds : [countryId],
          centers,
          abroad: countryCenter,
          badges,
          points,
        })
      : null;
  void frame;
  const anyEvent = layout?.flows.some((f) => f.eventId) ?? false;
  const anyPoint = (layout?.points.length ?? 0) > 0;

  return (
    <figure className={styles.moveMap} data-testid="displacement-map">
      <div className={styles.moveHead}>
        <span className={styles.moveTitle}>{t("movementTitle")}</span>
        {displacement.mapSince && (
          <span className={styles.moveSince}>{t("movementSince", { since: displacement.mapSince })}</span>
        )}
      </div>
      <div className={styles.moveStage} ref={stageRef}>
        {inside != null && (
          <div className={styles.moveInsideChip} data-testid="displacement-inside">
            <span className={styles.moveInsideValue}>{compactNumber(inside)}</span>
            <span className={styles.moveInsideLabel}>{t("movementInside")}</span>
          </div>
        )}
        <div className={styles.mapFill}>
          <CrisisMap
            appearance="analysis"
            showNavigation={false}
            markers={[]}
            regions={scopeRegions}
            center={config?.center ?? [10, 20]}
            zoom={config?.zoom ?? 4.5}
            className={styles.mapCanvas}
            focusCountryPCode={config?.pCode}
            focusCountryName={countryName}
            focusCountryGeometry={countryGeometry ?? undefined}
            fitBoundsOnFocus={true}
            fitBoundsGeometry={areaIds.length > 0 ? (scope ?? undefined) : undefined}
            adminBoundaryLevel={1}
            showDensityHeatmap={false}
            showRoads={false}
            mapApiRef={mapApiRef}
            onMapMove={bump}
          >
            <svg
              className={styles.moveOverlay}
              width={size.w}
              height={size.h}
              viewBox={`0 0 ${size.w} ${size.h}`}
              role="img"
              aria-label={t("movementAria", { scope: scopeName })}
            >
              <defs>
                {(["out", "back", "unknown"] as const).map((kind) => (
                  <marker
                    key={kind}
                    id={`move-${kind}`}
                    viewBox="0 0 12 12"
                    refX="4"
                    refY="6"
                    markerUnits="userSpaceOnUse"
                    markerWidth={kind === "unknown" ? 11 : 16}
                    markerHeight={kind === "unknown" ? 11 : 16}
                    orient="auto"
                  >
                    <path d="M1.5,1.5 L10.5,6 L1.5,10.5 L4,6 Z" className={styles[`moveHead_${kind}`]} strokeWidth="1" strokeLinejoin="round" />
                  </marker>
                ))}
              </defs>
              {layout && (
                <>
                  <g data-testid="displacement-map-points">
                    {layout.points.map((pt) => (
                      <Link key={pt.id} href={eventHref(pt.id, "analysis")} className={styles.moveEventLink}>
                        <circle cx={pt.x} cy={pt.y} r={pt.r} className={styles.movePoint} strokeWidth="1.2">
                          <title>{`${pt.label ?? ""} ${compactNumber(pt.people)}`.trim()}</title>
                        </circle>
                      </Link>
                    ))}
                  </g>
                  <g strokeLinecap="round" fill="none">
                    {layout.flows.filter((f) => f.d).map((f) => (
                      <path
                        key={f.key}
                        d={f.d}
                        className={styles[`moveFlow_${f.kind}`]}
                        strokeWidth={f.width}
                        strokeDasharray={f.dotted ? "1 6" : undefined}
                        markerEnd={`url(#move-${f.kind})`}
                      />
                    ))}
                  </g>
                  <g>
                    {layout.flows.filter((f) => f.d).map((f) => (
                      <circle key={f.key} cx={f.start.x} cy={f.start.y} r={f.startRadius} className={styles[`moveDot_${f.kind}`]} />
                    ))}
                    {layout.flows.map(
                      (f) =>
                        f.eventId && (
                          <circle
                            key={`e${f.key}`}
                            cx={f.start.x}
                            cy={f.start.y}
                            r={f.startRadius + 4}
                            className={styles.moveEvent}
                            strokeWidth="1.5"
                            data-testid="displacement-map-event"
                          />
                        ),
                    )}
                    {layout.flows.map(
                      (f) =>
                        f.ring && (
                          <circle
                            key={`r${f.key}`}
                            cx={f.ring.x}
                            cy={f.ring.y}
                            r={f.ring.r}
                            className={f.d ? styles.moveRing : styles.moveArrival}
                            strokeWidth="2"
                          />
                        ),
                    )}
                  </g>
                  <g className={styles.moveLabels} strokeWidth="4" paintOrder="stroke" strokeLinejoin="round">
                    {layout.flows.map(
                      (f) =>
                        f.origin && (
                          <text key={`o${f.key}`} x={f.origin.x} y={f.origin.y} textAnchor="middle" className={styles.moveOrigin}>
                            {f.origin.name}
                          </text>
                        ),
                    )}
                    {layout.points
                      .filter((pt) => pt.label)
                      .map((pt) => (
                        <text key={`p${pt.id}`} x={pt.x + pt.r + 5} y={pt.y + 4}>
                          <tspan className={styles.movePointName}>{pt.label}</tspan>
                          <tspan className={styles.moveSub}>{` ${compactNumber(pt.people)}`}</tspan>
                        </text>
                      ))}
                    {layout.flows.map((f) => {
                      const text = (
                        <text key={f.key} x={f.label.x} y={f.label.y} textAnchor={f.label.anchor}>
                          <tspan className={styles[`moveLabel_${f.kind}`]}>{f.label.title}</tspan>
                          {f.label.sub && (
                            <tspan x={f.label.x} dy="14" className={styles.moveSub}>
                              {f.label.sub}
                            </tspan>
                          )}
                        </text>
                      );
                      return f.eventId ? (
                        <Link key={f.key} href={eventHref(f.eventId, "analysis")} className={styles.moveEventLink}>
                          {text}
                        </Link>
                      ) : (
                        text
                      );
                    })}
                  </g>
                  <g className={styles.moveBadges} textAnchor="middle">
                    {layout.flows.map(
                      (f) =>
                        f.badge && (
                          <g key={f.key}>
                            <circle cx={f.badge.x} cy={f.badge.y} r="11" className={f.kind === "back" ? styles.moveBadgeBack : styles.moveBadgeOut} />
                            <text x={f.badge.x} y={f.badge.y + 4}>
                              {f.badge.num}
                            </text>
                          </g>
                        ),
                    )}
                  </g>
                </>
              )}
            </svg>
          </CrisisMap>
        </div>
      </div>
      <figcaption className={styles.moveLegend}>
        <span className={styles.moveKey}>
          <span className={styles.moveSwatchOut} />
          {t("movementLegendOut")}
        </span>
        <span className={styles.moveKey}>
          <span className={styles.moveSwatchBack} />
          {t("movementLegendBack")}
        </span>
        <span className={styles.moveKey}>
          <span className={styles.moveSwatchUnknown} />
          {t("movementLegendUnknown")}
        </span>
        <span className={styles.moveKey}>
          <span className={styles.moveSwatchBadge}>2</span>
          {t("movementLegendBadge")}
        </span>
        {anyPoint && (
          <span className={styles.moveKey}>
            <span className={styles.moveSwatchPoint} />
            {t("movementLegendPoint")}
          </span>
        )}
        {anyEvent && (
          <span className={styles.moveKey}>
            <span className={styles.moveSwatchEvent} />
            {t("movementLegendEvent")}
          </span>
        )}
      </figcaption>
    </figure>
  );
}
