"use client";

import { Text } from "@mantine/core";
import { IconAlertTriangle, IconCalendar, IconClock, IconDatabase, IconMapPin, IconRadar } from "@tabler/icons-react";
import { useFormatter, useNow, useTranslations } from "next-intl";
import { useEffect, useMemo } from "react";
import type { LngLatPoint } from "~/containers/map/selection";
import { eventHref } from "~/lib/analytics/event-source";
import { areaPopulationOf, formatIdp, idpPerCapitaOf } from "~/lib/area-context";
import { getDisasterLabel, getDisasterPills } from "~/lib/disaster-types";
import { resolveLocationName } from "~/lib/location";
import { reportHandledError } from "~/lib/report-handled-error";
import type { GqlEvent } from "~/lib/types/graphql";
import { useTeam } from "~/providers/team-provider";
import { api } from "~/trpc/react";
import type { PanelBack } from "./back-link";
import {
  CollapsibleSection,
  DETAIL_TITLE_ID,
  DetailBody,
  DetailHeader,
  DetailStatus,
  detailStatusOf,
  EmptyNote,
  FactRows,
  LinkRows,
  MetaItem,
  Section,
  SystemData,
  TEXT_PRIMARY,
} from "./detail-parts";
import { PanelLoader } from "./panel-loader";
import classes from "./panel-views.module.css";
import { EventTakeAction } from "./take-action";
import { useMapDetection } from "./use-map-detection";

function toNumber(value: string | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function eventLocations(event: GqlEvent) {
  return [event.generalLocation, event.originLocation, event.destinationLocation].filter((location) => !!location);
}

function eventTitle(event: Pick<GqlEvent, "title" | "types">): string | null {
  return event.title ?? (event.types[0] ? getDisasterLabel(event.types[0]) : null);
}

type EventDetailProps = {
  event: GqlEvent;
  related: GqlEvent[] | undefined;
  back: PanelBack;
  point: LngLatPoint | null;
};

function EventDetail({ event, related, back, point }: EventDetailProps) {
  const t = useTranslations("mapV2.panel.detail");
  const tPage = useTranslations("eventDetail");
  const format = useFormatter();
  const now = useNow();
  const compact = (value: number) => format.number(value, "compact");

  const categories = useMemo(() => getDisasterPills(event.types).map((pill) => pill.label), [event.types]);
  const locations = eventLocations(event);
  const areas = [
    ...new Set(locations.map((location) => resolveLocationName(location)).filter((name): name is string => !!name)),
  ];
  // As on the event page: detected when its first signal was published.
  const detectedAt = new Date(event.signals[0]?.publishedAt ?? event.firstSignalCreatedAt);
  const sourceCount = new Set(event.signals.map((signal) => signal.source.name)).size;
  const affected = toNumber(event.populationAffected);
  const displaced = toNumber(event.populationDisplaced);
  const areaLocation = locations[0];
  const population = areaPopulationOf(areaLocation);
  const idp = idpPerCapitaOf(areaLocation);

  return (
    <article aria-labelledby={DETAIL_TITLE_ID}>
      <DetailHeader
        back={back}
        point={point}
        title={eventTitle(event) ?? t("untitledEvent")}
        severity={event.severity}
        categories={categories}
      >
        {areas.length > 0 && <MetaItem icon={IconMapPin}>{areas.join(", ")}</MetaItem>}
        <MetaItem icon={IconCalendar}>{format.dateTime(detectedAt, { dateStyle: "medium" })}</MetaItem>
        <MetaItem icon={IconClock}>{format.relativeTime(detectedAt, now)}</MetaItem>
        {sourceCount > 0 && <MetaItem icon={IconDatabase}>{tPage("sourceCount", { count: sourceCount })}</MetaItem>}
        <MetaItem icon={IconRadar}>{tPage("signalCount", { count: event.signals.length })}</MetaItem>
        {related && (
          <MetaItem icon={IconAlertTriangle}>{t("relatedEventCount", { count: related.length })}</MetaItem>
        )}
      </DetailHeader>
      <DetailBody>
        <Section id="map-panel-detail-summary" title={t("sections.summary")}>
          {event.description ? (
            <Text fz={14} lh={1.2} c={TEXT_PRIMARY} className={classes.summary}>
              {event.description}
            </Text>
          ) : (
            <EmptyNote>{t("event.noSummary")}</EmptyNote>
          )}
        </Section>
        <Section id="map-panel-detail-impact" title={t("sections.impact")}>
          <FactRows
            facts={[
              { label: tPage("kpi.peopleAffected"), value: affected !== null ? compact(affected) : "-" },
              { label: tPage("kpi.peopleDisplaced"), value: displaced !== null ? compact(displaced) : "-" },
            ]}
          />
        </Section>
        <Section id="map-panel-detail-area-context" title={t("sections.areaContext")}>
          <FactRows
            facts={[
              {
                label: tPage("kpi.peopleInArea"),
                value: population ? compact(Number(population.value)) : "-",
              },
              {
                label: idp ? tPage("kpi.idpPerCapitaIn", { name: idp.name }) : tPage("kpi.idpPerCapita"),
                value: idp ? formatIdp(idp, compact) : "-",
              },
            ]}
          />
        </Section>
        <CollapsibleSection
          id="map-panel-detail-signals"
          title={t("sections.signals")}
          count={event.signals.length}
          hint={tPage("signals.subtitle")}
        >
          {event.signals.length > 0 ? (
            <LinkRows
              items={event.signals.map((signal) => ({
                id: signal.id,
                href: `/signal/${signal.id}`,
                title: signal.title ?? tPage("signals.fallbackTitle", { id: signal.id }),
              }))}
            />
          ) : (
            <EmptyNote>{tPage("signals.empty")}</EmptyNote>
          )}
        </CollapsibleSection>
        <CollapsibleSection
          id="map-panel-detail-related-events"
          title={t("sections.relatedEvents")}
          count={related?.length}
        >
          {related === undefined && <PanelLoader label={t("loadingRelated")} />}
          {related?.length === 0 && <EmptyNote>{tPage("related.empty")}</EmptyNote>}
          {related && related.length > 0 && (
            <LinkRows
              items={related.map((relatedEvent) => ({
                id: relatedEvent.id,
                href: eventHref(relatedEvent.id, "map"),
                title: eventTitle(relatedEvent) ?? relatedEvent.description ?? t("untitledEvent"),
                severity: relatedEvent.severity,
                category: getDisasterPills(relatedEvent.types)[0]?.label,
              }))}
            />
          )}
        </CollapsibleSection>
        <CollapsibleSection id="map-panel-detail-system-data" title={t("sections.systemData")}>
          <SystemData
            facts={[
              { label: tPage("systemData.eventId"), value: `#${event.id}` },
              ...(event.signals[0]
                ? [{ label: tPage("systemData.source"), value: event.signals[0].source.name }]
                : []),
              { label: tPage("systemData.detected"), value: format.dateTime(detectedAt, "short") },
              {
                label: tPage("systemData.validFrom"),
                value: event.validFrom ? format.dateTime(new Date(event.validFrom), "short") : "-",
              },
              {
                label: tPage("systemData.validUntil"),
                value: event.validTo ? format.dateTime(new Date(event.validTo), "short") : "-",
              },
              {
                label: tPage("systemData.created"),
                value: format.dateTime(new Date(event.firstSignalCreatedAt), "dateTime"),
              },
              {
                label: tPage("systemData.updated"),
                value: format.dateTime(new Date(event.lastSignalCreatedAt), "dateTime"),
              },
            ]}
            areasLabel={tPage("systemData.affectedAreas")}
            areas={areas}
          />
        </CollapsibleSection>
        <EventTakeAction eventId={event.id} isAlert={(event.alerts?.length ?? 0) > 0} />
      </DetailBody>
    </article>
  );
}

type EventDetailLoaderProps = { eventId: string; back: PanelBack; point: LngLatPoint | null };

/** Loads an event and the events related to it, and shows its detail. */
export function EventDetailLoader({ eventId, back, point }: EventDetailLoaderProps) {
  const t = useTranslations("mapV2.panel.detail.event");
  const { activeTeamId } = useTeam();
  const query = api.events.get.useQuery({ id: eventId });
  const related = api.events.related.useQuery(
    { id: eventId, teamId: activeTeamId },
    { enabled: !!activeTeamId && !!query.data },
  );

  useEffect(() => {
    if (query.error) reportHandledError(query.error, { feature: "map-v2", stage: "event-detail" });
  }, [query.error]);
  useEffect(() => {
    if (related.error) reportHandledError(related.error, { feature: "map-v2", stage: "related-events" });
  }, [related.error]);

  if (query.data) {
    // Without a team, or when they fail to load, there are no related events, as on the event page.
    const relatedEvents = !activeTeamId || related.isError ? [] : related.data;
    return <EventDetail event={query.data} related={relatedEvents} back={back} point={point} />;
  }

  return (
    <DetailStatus
      back={back}
      status={detailStatusOf(query, { loading: t("loading"), error: t("error"), notFound: t("notFound") })}
    />
  );
}

export function EventDetailView({ eventId, back }: { eventId: string; back: PanelBack }) {
  const point = useMapDetection("event", eventId).detection?.point ?? null;
  return <EventDetailLoader eventId={eventId} back={back} point={point} />;
}
