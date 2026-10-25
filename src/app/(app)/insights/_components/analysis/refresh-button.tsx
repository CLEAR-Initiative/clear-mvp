"use client";

import { useTranslations } from "next-intl";
import { notifications } from "@mantine/notifications";
import { IconRefresh } from "@tabler/icons-react";
import { api } from "~/trpc/react";
import { canManageAnalyses } from "~/lib/roles";
import styles from "./dark/analysis-dark.module.css";

/** The frame whose next version is requested, as clear-api `requestAnalysis` takes it. */
export interface RefreshFrame {
  locationIds: string[];
  eventTypes: string[];
  needSectors: string[];
  windowStart: string;
  windowEnd: string | null;
  teamId: string | null;
}

/**
 * "Update now" (PRD R20): asks the pipeline for a new version of the open
 * analysis. Admins and analysts only; the parent polls for the new version
 * and passes `waiting` until it lands.
 */
export function RefreshButton({
  frame,
  waiting,
  onRequested,
}: {
  frame: RefreshFrame;
  waiting: boolean;
  onRequested: () => void;
}) {
  const t = useTranslations("analysis.refresh");
  const me = api.auth.me.useQuery(undefined, { staleTime: 60_000 });
  const refresh = api.analysis.refresh.useMutation({
    onSuccess: onRequested,
    onError: () => notifications.show({ color: "red", message: t("error") }),
  });

  if (!canManageAnalyses(me.data?.user?.role, me.data?.user?.teamMemberships)) return null;

  return (
    <button
      type="button"
      className={styles.ghost}
      onClick={() => refresh.mutate(frame)}
      disabled={waiting || refresh.isPending}
      data-testid="analysis-refresh"
    >
      <span className={waiting || refresh.isPending ? styles.spin : undefined} data-testid={waiting || refresh.isPending ? "analysis-refresh-spin" : undefined}>
        <IconRefresh size={15} stroke={1.8} />
      </span>
      {t("button")}
    </button>
  );
}
