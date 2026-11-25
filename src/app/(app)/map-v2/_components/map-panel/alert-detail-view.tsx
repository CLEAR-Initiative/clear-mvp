"use client";

import { useTranslations } from "next-intl";
import { useEffect } from "react";
import { reportHandledError } from "~/lib/report-handled-error";
import { api } from "~/trpc/react";
import type { PanelBack } from "./back-link";
import { DetailStatus, detailStatusOf } from "./detail-parts";
import { EventDetailLoader } from "./event-detail-view";
import { useDetectionPoint } from "./use-detection-point";

/** An alert reads as the detail of its event, as alerts open the event page elsewhere in the app. */
export function AlertDetailView({ alertId, back }: { alertId: string; back: PanelBack }) {
  const t = useTranslations("mapV2.panel.detail.alert");
  const point = useDetectionPoint("alert", alertId);
  const query = api.alerts.getAlert.useQuery({ id: alertId });

  useEffect(() => {
    if (query.error) reportHandledError(query.error, { feature: "map-v2", stage: "alert-detail" });
  }, [query.error]);

  const eventId = query.data?.alert?.event.id;
  if (eventId) return <EventDetailLoader eventId={eventId} back={back} point={point} />;

  return (
    <DetailStatus
      back={back}
      status={detailStatusOf(query, { loading: t("loading"), error: t("error"), notFound: t("notFound") })}
    />
  );
}
