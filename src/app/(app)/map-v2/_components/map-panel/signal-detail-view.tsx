"use client";

import { Text } from "@mantine/core";
import { IconCalendar, IconClock, IconDatabase, IconMapPin } from "@tabler/icons-react";
import { useFormatter, useNow, useTranslations } from "next-intl";
import { useEffect, useMemo } from "react";
import { eventHref } from "~/lib/analytics/event-source";
import { getDisasterPills } from "~/lib/disaster-types";
import { resolveLocationName } from "~/lib/location";
import { signalLocationOf } from "~/lib/location-challenge";
import { reportHandledError } from "~/lib/report-handled-error";
import type { GqlSignalDetail } from "~/lib/types/graphql";
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
  LinkRows,
  MetaItem,
  Section,
  SystemData,
  TEXT_PRIMARY,
} from "./detail-parts";
import classes from "./panel-views.module.css";
import { SignalTakeAction } from "./take-action";
import { useMapDetection } from "./use-map-detection";

type SignalDetailViewProps = { signalId: string; back: PanelBack };

/** The other signals of the signal's events, newest first: the signal page's Similar signals. */
function siblingSignals(signal: GqlSignalDetail) {
  const seen = new Set<string>([signal.id]);
  const result: GqlSignalDetail["events"][number]["signals"] = [];
  for (const event of signal.events) {
    for (const sibling of event.signals) {
      if (seen.has(sibling.id)) continue;
      seen.add(sibling.id);
      result.push(sibling);
    }
  }
  return result.sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt));
}

function signalAreas(signal: GqlSignalDetail): string[] {
  const names = [signal.generalLocation, signal.originLocation, signal.destinationLocation].map((location) =>
    resolveLocationName(location),
  );
  return [...new Set(names.filter((name): name is string => !!name))];
}

function SignalDetail({ signal, back }: { signal: GqlSignalDetail; back: PanelBack }) {
  const t = useTranslations("mapV2.panel.detail");
  const tSignal = useTranslations("mapV2.signalTooltip");
  const tPage = useTranslations("signalDetail");
  const format = useFormatter();
  const now = useNow();
  const point = useMapDetection("signal", signal.id).detection?.point ?? null;
  const categories = useMemo(
    () => getDisasterPills(signal.events.flatMap((event) => event.types)).map((pill) => pill.label),
    [signal.events],
  );
  const siblings = useMemo(() => siblingSignals(signal), [signal]);
  const location = resolveLocationName(signalLocationOf(signal));
  const publishedAt = new Date(signal.publishedAt);

  return (
    <article aria-labelledby={DETAIL_TITLE_ID}>
      <DetailHeader
        back={back}
        point={point}
        title={signal.title ?? tSignal("untitled")}
        severity={signal.severity}
        categories={categories}
      >
        {location && <MetaItem icon={IconMapPin}>{location}</MetaItem>}
        <MetaItem icon={IconCalendar}>{format.dateTime(publishedAt, { dateStyle: "medium" })}</MetaItem>
        <MetaItem icon={IconClock}>{format.relativeTime(publishedAt, now)}</MetaItem>
        <MetaItem icon={IconDatabase}>{signal.source.name}</MetaItem>
      </DetailHeader>
      <DetailBody>
        <Section id="map-panel-detail-summary" title={t("sections.summary")}>
          {signal.description ? (
            <Text fz={14} lh={1.2} c={TEXT_PRIMARY} className={classes.summary}>
              {signal.description}
            </Text>
          ) : (
            <EmptyNote>{t("signal.noSummary")}</EmptyNote>
          )}
        </Section>
        <CollapsibleSection
          id="map-panel-detail-signals"
          title={t("sections.signals")}
          count={siblings.length}
          hint={t("signalsHint")}
        >
          {siblings.length > 0 ? (
            <LinkRows
              items={siblings.map((sibling) => ({
                id: sibling.id,
                href: `/signal/${sibling.id}`,
                title: sibling.title ?? tSignal("untitled"),
              }))}
            />
          ) : (
            <EmptyNote>{tPage("similar.empty")}</EmptyNote>
          )}
        </CollapsibleSection>
        <CollapsibleSection
          id="map-panel-detail-related-events"
          title={t("sections.relatedEvents")}
          count={signal.events.length}
        >
          {signal.events.length > 0 ? (
            <LinkRows
              items={signal.events.map((event) => ({
                id: event.id,
                href: eventHref(event.id, "map"),
                title: event.title ?? t("untitledEvent"),
                severity: event.severity,
                category: getDisasterPills(event.types)[0]?.label,
              }))}
            />
          ) : (
            <EmptyNote>{tPage("events.empty")}</EmptyNote>
          )}
        </CollapsibleSection>
        <CollapsibleSection id="map-panel-detail-system-data" title={t("sections.systemData")}>
          <SystemData
            facts={[
              { label: tPage("details.signalId"), value: `#${signal.id}` },
              { label: tPage("details.source"), value: signal.source.name },
              { label: tPage("details.published"), value: format.dateTime(publishedAt, "short") },
              { label: tPage("details.collected"), value: format.dateTime(new Date(signal.collectedAt), "dateTime") },
            ]}
            areasLabel={tPage("details.affectedAreas")}
            areas={signalAreas(signal)}
          />
        </CollapsibleSection>
        <SignalTakeAction signalId={signal.id} />
      </DetailBody>
    </article>
  );
}

export function SignalDetailView({ signalId, back }: SignalDetailViewProps) {
  const t = useTranslations("mapV2.panel.detail.signal");
  const query = api.signals.get.useQuery({ id: signalId });

  useEffect(() => {
    if (query.error) reportHandledError(query.error, { feature: "map-v2", stage: "signal-detail" });
  }, [query.error]);

  if (query.data) return <SignalDetail signal={query.data} back={back} />;

  return (
    <DetailStatus
      back={back}
      status={detailStatusOf(query, { loading: t("loading"), error: t("error"), notFound: t("notFound") })}
    />
  );
}
