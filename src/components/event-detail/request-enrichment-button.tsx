"use client";

import { useState } from "react";
import { Button, Group, Loader, Stack, Text, Tooltip } from "@mantine/core";
import { IconSparkles, IconX } from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import { api } from "~/trpc/react";
import { useFeatureEnabled } from "~/components/feature-flags-provider";
import { useOptionalTeam } from "~/providers/team-provider";
import { canWriteCrisisEvents, isPlatformAdmin } from "~/lib/roles";

/**
 * "Request enrichment" in the Event page's Actions card (clear-api ADR-0010):
 * asks a Task Worker for an ImpactPrior on this Event. Mirrors clear-api's
 * `requestEventEnrichment` gate — admin or analyst anywhere, a team content
 * writer with the active team passed as the hint — but the server is the
 * real gate, and its answer wins: FORBIDDEN disables the action with the
 * same tooltip "Turn into alert" uses, TOO_MANY_REQUESTS (the per-requester
 * daily cap) disables it with the cap message. Behind the `event_enrichment`
 * flag. An open (PENDING / LEASED) Task collapses the action into a
 * "requested" state, which the requester or a platform admin can cancel.
 */
export function RequestEnrichmentButton({ eventId }: { eventId: string }) {
  const enabled = useFeatureEnabled("event_enrichment");
  const t = useTranslations("eventDetail.enrichment");
  const tCommon = useTranslations("common");
  const [confirming, setConfirming] = useState(false);
  const utils = api.useUtils();

  const { data: authData } = api.auth.me.useQuery(undefined, { staleTime: 60_000 });
  const team = useOptionalTeam();
  const me = authData?.user;
  const hasTeam = (team?.teams?.length ?? 0) > 0;
  const canRequest = canWriteCrisisEvents(me?.role) || hasTeam;

  const enrichment = api.tasks.forEvent.useQuery({ eventId }, { enabled, staleTime: 15_000 });
  const openTask = enrichment.data?.tasks.find((task) => task.status === "PENDING" || task.status === "LEASED");

  const invalidate = () => utils.tasks.forEvent.invalidate({ eventId });
  const request = api.tasks.requestEnrichment.useMutation({
    onSuccess: () => {
      setConfirming(false);
      void invalidate();
    },
  });
  const cancel = api.tasks.cancel.useMutation({ onSuccess: () => void invalidate() });

  if (!enabled) return null;

  // The server's verdict on the last attempt, which outranks the client-side mirror.
  const errorCode = request.error?.data?.code;
  const capReached = errorCode === "TOO_MANY_REQUESTS";
  const forbidden = errorCode === "FORBIDDEN";

  if (openTask) {
    const canCancel = !!me && (openTask.requesterId === me.id || isPlatformAdmin(me.role));
    const cancelRequested = openTask.cancelRequestedAt !== null;
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
        {canCancel && (
          <Button
            variant="subtle"
            color="gray"
            size="compact-xs"
            leftSection={cancel.isPending ? <Loader size={10} /> : <IconX size={11} />}
            disabled={cancel.isPending || cancelRequested}
            onClick={() => cancel.mutate({ id: openTask.id })}
            data-testid="enrichment-cancel"
            style={{ fontSize: 11 }}
          >
            {cancelRequested ? t("cancelled") : t("cancel")}
          </Button>
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
