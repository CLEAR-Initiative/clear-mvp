"use client";

import { useState } from "react";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import { Button, Tooltip } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconFileDownload } from "@tabler/icons-react";
import { api } from "~/trpc/react";
import { REPORT_BUILD_TIMEOUT_MS, reportFileName, withDeadline } from "~/lib/analysis-report";
import type { Brief } from "~/lib/brief/types";
import { toBriefView } from "~/lib/brief/view";
import { useBriefTextLabels, useBriefViewLabels } from "../_hooks/use-brief-view-labels";
import type { BriefDocumentLabels } from "./brief-document";

/** Scripts the PDF's built-in font and layout engine can't set (no shaping / bidi), as for the Insights report. */
const UNSUPPORTED_LOCALES = new Set(["ar"]);

/** "Download PDF": the Brief on screen, built in the browser like the Insights report. */
export function BriefPdfButton({ brief: shown, beforeBuild }: { brief: Brief; beforeBuild: () => Promise<boolean> }) {
  const t = useTranslations("brief");
  const format = useFormatter();
  const locale = useLocale();
  const viewLabels = useBriefViewLabels();
  const textLabels = useBriefTextLabels();
  const utils = api.useUtils();
  const [busy, setBusy] = useState(false);
  const unsupported = UNSUPPORTED_LOCALES.has(locale);

  async function download() {
    setBusy(true);
    try {
      if (!(await beforeBuild())) return;
      // What was just saved, not what was on screen when the click came.
      const brief = utils.briefs.get.getData({ id: shown.id }) ?? shown;
      const now = new Date();
      const view = toBriefView(brief, viewLabels);
      const labels: BriefDocumentLabels = {
        eyebrow: t("pdf.eyebrow", { cadence: t(`cadence.${brief.cadence}`) }),
        org: t("pdf.org"),
        classification: t("pdf.classification"),
        ...textLabels,
        footer: t("pdf.footer", { title: brief.title }),
        generated: t("pdf.generated", {
          date: format.dateTime(now, { dateStyle: "medium", timeStyle: "short" }),
          status: t(`status.${brief.status}`),
        }),
        page: (n, total) => t("pdf.page", { n, total }),
      };
      const [{ pdf }, { BriefDocument }] = await Promise.all([import("@react-pdf/renderer"), import("./brief-document")]);
      const blob = await withDeadline(pdf(<BriefDocument view={view} labels={labels} />).toBlob(), REPORT_BUILD_TIMEOUT_MS);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = reportFileName(brief.title, now, "brief");
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
    } catch (e) {
      console.error("[brief] PDF build failed", e);
      notifications.show({ color: "red", message: t("pdf.error") });
    } finally {
      setBusy(false);
    }
  }

  const button = (
    <Button
      size="xs"
      variant="default"
      leftSection={<IconFileDownload size={14} />}
      loading={busy}
      disabled={unsupported}
      onClick={() => void download()}
      data-testid="brief-pdf"
    >
      {t("pdf.button")}
    </Button>
  );
  return unsupported ? (
    <Tooltip label={t("pdf.unsupportedLocale")}>
      <span>{button}</span>
    </Tooltip>
  ) : (
    button
  );
}
