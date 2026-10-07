"use client";

import { useState } from "react";
import { Button, Group, Loader, Stack, Text, Tooltip } from "@mantine/core";
import { IconSparkles, IconX } from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import { api } from "~/trpc/react";
import { useFeatureEnabled } from "~/components/feature-flags-provider";
import { useOptionalTeam } from "~/providers/team-provider";
import { canWriteCrisisEvents, isPlatformAdmin } from "~/lib/roles";
import { isImpactPriorKind, sourceLabel } from "~/lib/impact-prior-source";

/**
 * "Request enrichment" in the Event page's Actions card (clear-api ADR-0010):
 * asks a Task Worker for an ImpactPrior on this Event. Mirrors clear-api's
 * `requestEventEnrichment` gate — admin or analyst anywhere, a team content
 * writer with the active team passed as the hint — but the server is the
 * real gate, and its answer wins: FORBIDDEN disables the action with the
 * same tooltip "Turn into alert" uses, TOO_MANY_REQUESTS (the per-requester
 * daily cap) disables it with the cap message. Behind the `event_enrichment`
 * flag. Any open (PENDING / LEASED) Task collapses the action into a
 * "requested" state listing each source kind's status (a request fans out
 * into one Task per Worker kind), which the requester or a platform admin
 * can cancel — every open Task at once, so the Event is free again.
 */
export function RequestEnrichmentButton({ eventId }: { eventId: string }) {
  const enabled = useFeatureEnabled("event_enrichment");
  const t = useTranslations("eventDetail.enrichment");
  const tCommon = useTranslations("common");
  const [confirming, setConfirming] = useState(false);
  // Cancelling fans out like the request did: one call per open Task. Track
  // the batch here rather than through the mutation's own state, which only
  // reflects the last call.
  const [cancelling, setCancelling] = useState(false);
  const [cancelFailed, setCancelFailed] = useState(false);
  const utils = api.useUtils();

  const { data: authData } = api.auth.me.useQuery(undefined, { staleTime: 60_000 });
  const team = useOptionalTeam();
  const me = authData?.user;
  const hasTeam = (team?.teams?.length ?? 0) > 0;
  const canRequest = canWriteCrisisEvents(me?.role) || hasTeam;

  const enrichment = api.tasks.forEvent.useQuery({ eventId }, { enabled, staleTime: 15_000 });
  // This button requests the ImpactPrior family; another kind of enrichment
  // on the Event is not this button's to show as requested or to cancel.
  const openTasks = (enrichment.data?.tasks ?? []).filter(
    (task) => isImpactPriorKind(task.kind) && (task.status === "PENDING" || task.status === "LEASED"),
  );

  // Both doors: the Event's enrichment and the Inbox's My requests.
  const invalidate = () =>
    Promise.all([utils.tasks.forEvent.invalidate({ eventId }), utils.tasks.myTasks.invalidate()]);
  const request = api.tasks.requestEnrichment.useMutation({
    onSuccess: () => {
      setConfirming(false);
      void invalidate();
    },
  });
  const cancel = api.tasks.cancel.useMutation();
  const cancelAll = async (ids: string[]) => {
    setCancelling(true);
    setCancelFailed(false);
    const results = await Promise.allSettled(ids.map((id) => cancel.mutateAsync({ id })));
    // Some may have landed and some not: refetch either way so the list shows
    // what is really still open, and say so when any call failed.
    setCancelFailed(results.some((r) => r.status === "rejected"));
    setCancelling(false);
    void invalidate();
  };

  if (!enabled) return null;

  // Until we know whether a Task is already open, offer nothing to click:
  // a request made against an unseen open Task would dedupe server-side,
  // but the confirm panel would vanish under the user as the query lands.
  if (!enrichment.isSuccess) {
    return (
      <Button variant="light" size="xs" leftSection={<IconSparkles size={13} />} fullWidth loading data-testid="enrichment-loading" style={{ fontSize: 12 }}>
        {t("request")}
      </Button>
    );
  }

  // The server's verdict on the last attempt, which outranks the client-side mirror.
  const errorCode = request.error?.data?.code;
  const capReached = errorCode === "TOO_MANY_REQUESTS";
  const forbidden = errorCode === "FORBIDDEN";

  if (openTasks.length > 0) {
    // The Tasks this user may cancel: their own requests, or all of them for a platform admin.
    const cancellable = me
      ? openTasks.filter((task) => task.requesterId === me.id || isPlatformAdmin(me.role))
      : [];
    const pendingCancel = cancellable.filter((task) => task.cancelRequestedAt === null);
    const cancelRequested = cancellable.length > 0 && pendingCancel.length === 0;
    return (
      <Stack gap={4}>
        <Button
          variant="light"
          size="xs"
          leftSection={<IconSparkles size={13} />}
          fullWidth
          disabled
          data-testid="enrichment-requested"
          style={{ fontSize: 12, cursor: "default" }}
        >
          {t("requested")}
        </Button>
        <Stack gap={0} data-testid="enrichment-open-kinds">
          {openTasks.map((task) => (
            <Text key={task.id} size="xs" c="var(--color-text-muted)" style={{ textAlign: "center" }} data-kind={task.kind}>
              {t("kindStatus", { source: sourceLabel(task.kind, t), status: t(`status.${task.status}`) })}
            </Text>
          ))}
        </Stack>
        {cancellable.length > 0 && (
          <Button
            variant="subtle"
            color="gray"
            size="compact-xs"
            leftSection={cancelling ? <Loader size={10} /> : <IconX size={11} />}
            disabled={cancelling || cancelRequested}
            onClick={() => void cancelAll(pendingCancel.map((task) => task.id))}
            data-testid="enrichment-cancel"
            style={{ fontSize: 11 }}
          >
            {cancelRequested ? t("cancelled") : t("cancel")}
          </Button>
        )}
        {cancelFailed && (
          <Text size="xs" c="var(--color-critical)" style={{ textAlign: "center" }} data-testid="enrichment-cancel-error">
            {t("cancelFailed")}
          </Text>
        )}
      </Stack>
    );
  }

  if (capReached || forbidden) {
    return (
      <Tooltip label={capReached ? request.error?.message ?? t("capReached") : t("noPermission")} position="top" withArrow>
        <Button
          variant="light"
          size="xs"
          leftSection={<IconSparkles size={13} />}
          fullWidth
          data-disabled
          data-testid={capReached ? "enrichment-cap-reached" : "enrichment-forbidden"}
          onClick={(e) => e.preventDefault()}
          style={{ fontSize: 12 }}
        >
          {capReached ? t("capReached") : t("request")}
        </Button>
      </Tooltip>
    );
  }

  if (confirming) {
    return (
      <Stack gap={6} data-testid="enrichment-confirm">
        <Text size="xs" c="var(--color-text-secondary)" fw={500} style={{ textAlign: "center" }}>
          {t("confirmPrompt")}
        </Text>
        <Group gap={6} grow>
          <Button variant="light" color="gray" size="xs" style={{ fontSize: 12 }} onClick={() => setConfirming(false)}>
            {tCommon("actions.cancel")}
          </Button>
          <Button
            variant="filled"
            size="xs"
            leftSection={request.isPending ? <Loader size={11} color="white" /> : <IconSparkles size={13} />}
            loading={request.isPending}
            onClick={() => request.mutate({ eventId, teamId: team?.activeTeamId ?? undefined })}
            data-testid="enrichment-confirm-button"
            style={{ fontSize: 12 }}
          >
            {tCommon("actions.confirm")}
          </Button>
        </Group>
        {request.isError && (
          <Text size="xs" c="var(--color-critical)" style={{ textAlign: "center" }} data-testid="enrichment-error">
            {t("failed")}
          </Text>
        )}
      </Stack>
    );
  }

  return (
    <Tooltip label={t("noPermission")} disabled={canRequest} position="top" withArrow>
      <Button
        variant="light"
        size="xs"
        leftSection={<IconSparkles size={13} />}
        fullWidth
        data-disabled={canRequest ? undefined : true}
        data-testid="request-enrichment"
        onClick={(e) => {
          if (!canRequest) {
            e.preventDefault();
            return;
          }
          setConfirming(true);
        }}
        style={{ fontSize: 12 }}
      >
        {t("request")}
      </Button>
    </Tooltip>
  );
}
