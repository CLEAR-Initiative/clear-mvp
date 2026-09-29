"use client";

import { useMemo, useState } from "react";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import { Button, Tooltip } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconFileDownload } from "@tabler/icons-react";
import { api } from "~/trpc/react";
import type { Analysis } from "~/server/api/mappers/analysis";
import type { AnalysisEvents, AnalysisFigures } from "~/server/api/routers/analysis";
import { kpiValues } from "~/lib/analysis-view";
import { defaultReportSections, projectReportMap, reportFileName, type ReportSectionChoice } from "~/lib/analysis-report";
import type { ReportLabels } from "./report/report-document";
import { ReportBuilderModal } from "./report-builder-modal";

/** A4 content width at the report's margins, in PDF points. */
const MAP_WIDTH = 515;
const MAP_HEIGHT = 250;

/** Scripts the PDF's built-in font and layout engine can't set (no shaping / bidi). */
const UNSUPPORTED_LOCALES = new Set(["ar"]);

/**
 * "Create Report": the analysis version on screen as a downloadable PDF
 * situation report (PRD v5, R31). Frontend-only for now: nothing is stored,
 * so there is no report history or server-side immutability yet (R33, R34).
 */
export function CreateReportButton({
  data,
  figures,
  events,
  scopeName,
  countryId,
  areaIds,
  isCountry,
}: {
  data: Analysis;
  figures: AnalysisFigures | undefined;
  events: AnalysisEvents | undefined;
  scopeName: string;
  countryId: string;
  /** The scope's own locations; empty for a country scope. */
  areaIds: string[];
  isCountry: boolean;
}) {
  const t = useTranslations("analysis.report");
  const tSeverity = useTranslations("common.severities");
  const locale = useLocale();
  const format = useFormatter();
  const utils = api.useUtils();
  const me = api.auth.me.useQuery(undefined, { staleTime: 60_000 });
  const [busy, setBusy] = useState(false);
  const [building, setBuilding] = useState(false);
  const initialSections = useMemo(() => defaultReportSections(data, events?.items.length ?? 0), [data, events]);
  const unsupported = UNSUPPORTED_LOCALES.has(locale);

  const date = (iso: string, withTime = false) =>
    format.dateTime(new Date(iso), {
      day: "numeric",
      month: "short",
      year: "numeric",
      ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
    });

  async function create(chosen: ReportSectionChoice[]) {
    setBusy(true);
    try {
      const fetchGeometry = (id: string) =>
        utils.locations.getById.fetch({ id }, { staleTime: Infinity }).then((l) => l?.geometry ?? null);
      const [country, ...areas] = await Promise.all([countryId, ...areaIds].map(fetchGeometry));
      const items = events?.items ?? [];
      const map = projectReportMap({ country, areas, events: items, width: MAP_WIDTH, height: MAP_HEIGHT });

      const now = new Date();
      const author = me.data?.user?.name || me.data?.user?.email || t("unknownAuthor");
      const labels: ReportLabels = {
        eyebrow: t("eyebrow"),
        scopeKind: isCountry ? t("scopeCountry") : t("scopeCreated"),
        period: t("period", { start: date(data.scope.windowStart) }),
        versionOf: t("versionOf", { date: date(data.crisis.generatedAt, true) }),
        keyDevelopments: t("keyDevelopments"),
        currentStatus: t("currentStatus"),
        displaced: t("displaced"),
        displacedSub: t("displacedSub"),
        inNeed: t("inNeed"),
        inNeedSub: t("inNeedSub"),
        funding: t("funding"),
        fundingSub: t("fundingSub"),
        notReported: t("notReported"),
        map: t("sections.map"),
        mapScope: isCountry ? t("mapCountry") : t("mapArea"),
        mapEvents: t("mapEvents", { count: items.length, date: date(data.scope.windowStart) }),
        contexts: t("contexts"),
        hazards: t("hazards"),
        displacement: t("displacement"),
        priorityNeeds: t("priorityNeeds"),
        responseActivities: t("responseActivities"),
        noResponse: t("noResponse"),
        outlook: t("outlook"),
        sources: t("sources"),
        provenance: t("provenance"),
        footer: t("footer", { scope: scopeName }),
        page: (n, total) => t("page", { n, total }),
        severity: (key) => tSeverity(key as "critical"),
      };

      const [{ pdf }, { ReportDocument }] = await Promise.all([
        import("@react-pdf/renderer"),
        import("./report/report-document"),
      ]);
      const blob = await pdf(
        <ReportDocument
          sections={chosen.filter((x) => x.included).map((x) => x.key)}
          data={data}
          kpis={kpiValues(data, figures)}
          map={map}
          labels={labels}
          scopeName={scopeName}
          generatedLabel={t("generated", { date: date(now.toISOString(), true), author })}
        />,
      ).toBlob();

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = reportFileName(scopeName, now);
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
      setBuilding(false);
    } catch (e) {
      console.error("[analysis] report generation failed", e);
      notifications.show({ color: "red", message: t("error") });
    } finally {
      setBusy(false);
    }
  }

  const button = (
    <Button
      size="xs"
      color="dark"
      leftSection={<IconFileDownload size={14} />}
      disabled={unsupported}
      onClick={() => setBuilding(true)}
      data-testid="analysis-create-report"
    >
      {t("button")}
    </Button>
  );
  if (unsupported) return <Tooltip label={t("unsupportedLocale")}>{<span>{button}</span>}</Tooltip>;
  return (
    <>
      {button}
      <ReportBuilderModal
        opened={building}
        onClose={() => setBuilding(false)}
        initial={initialSections}
        busy={busy}
        onCreate={create}
      />
    </>
  );
}
