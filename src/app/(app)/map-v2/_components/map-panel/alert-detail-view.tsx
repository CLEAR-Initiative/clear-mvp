"use client";

import { useTranslations } from "next-intl";
import { useEffect } from "react";
import { reportHandledError } from "~/lib/report-handled-error";
import { api } from "~/trpc/react";
import type { PanelBack } from "./back-link";
import { DetailStatus, detailStatusOf } from "./detail-parts";
import { EventDetailLoader } from "./event-detail-view";
import { useMapDetection } from "./use-map-detection";

/**
 * An alert reads as the detail of its event, as alerts open the event page elsewhere in the app. The map's
 * alerts already say which event that is; only an alert outside the map's range is looked up on its own.
 */
export function AlertDetailView({ alertId, back }: { alertId: string; back: PanelBack }) {
  const t = useTranslations("mapV2.panel.detail.alert");
  const map = useMapDetection("alert", alertId);
  const mapEventId = map.detection?.eventId;
  const query = api.alerts.getAlert.useQuery({ id: alertId }, { enabled: !map.isPending && !mapEventId });

  useEffect(() => {
    if (query.error) reportHandledError(query.error, { feature: "map-v2", stage: "alert-detail" });
  }, [query.error]);

  const eventId = mapEventId ?? query.data?.alert?.event.id;
  const point = map.detection?.point ?? null;
  if (eventId) return <EventDetailLoader eventId={eventId} back={back} point={point} />;

  return (
    <DetailStatus
      back={back}
      status={detailStatusOf(query, { loading: t("loading"), error: t("error"), notFound: t("notFound") })}
    />
  );
}
