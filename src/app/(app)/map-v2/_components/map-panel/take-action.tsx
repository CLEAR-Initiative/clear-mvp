"use client";

import { ActionIcon, Button, Group, Stack, Text, Tooltip } from "@mantine/core";
import { IconBellRinging } from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { CommentsSection } from "~/components/comments-section";
import { reportHandledError } from "~/lib/report-handled-error";
import { canWriteCrisisEvents } from "~/lib/roles";
import { api } from "~/trpc/react";
import { Section } from "./detail-parts";
import classes from "./panel-views.module.css";

type AlertState = { eventId: string; isAlert: boolean };

/**
 * The event page's Turn into alert: admins and team analysts raise the event as an alert after a
 * confirmation; an event that is already an alert shows that instead.
 */
function useTurnIntoAlert({ eventId, isAlert }: AlertState) {
  const utils = api.useUtils();
  const [promoted, setPromoted] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const { data: authData } = api.auth.me.useQuery(undefined, { staleTime: 60_000 });
  const canPromote = canWriteCrisisEvents(authData?.user?.role, authData?.user?.teamMemberships);
  const promote = api.alerts.promoteToAlert.useMutation({
    onSuccess: () => {
      setPromoted(true);
      setConfirming(false);
      void utils.events.get.invalidate({ id: eventId });
    },
    onError: (error) => reportHandledError(error, { feature: "map-v2", stage: "turn-into-alert" }),
  });

  return {
    isAlert: isAlert || promoted,
    canPromote,
    confirming,
    setConfirming,
    confirm: () => promote.mutate({ eventId }),
    pending: promote.isPending,
    failed: promote.isError,
  };
}

function AlertButton({ action }: { action: ReturnType<typeof useTurnIntoAlert> }) {
  const t = useTranslations("eventDetail.actions");

  if (action.isAlert) {
    return (
      <Tooltip label={t("alert")} withArrow>
        <ActionIcon size={32} radius="xl" data-disabled aria-label={t("alert")} className={classes.alertAction}>
          <IconBellRinging size={16} aria-hidden />
        </ActionIcon>
      </Tooltip>
    );
  }

  const label = action.canPromote ? t("turnIntoAlert") : t("noPermission");
  return (
    <Tooltip label={label} withArrow>
      <ActionIcon
        size={32}
        radius="xl"
        variant="filled"
        color="var(--map-accent)"
        aria-label={t("turnIntoAlert")}
        aria-expanded={action.confirming}
        data-disabled={action.canPromote ? undefined : true}
        onClick={(event) => {
          if (!action.canPromote) {
            event.preventDefault();
            return;
          }
          action.setConfirming(true);
        }}
      >
        <IconBellRinging size={16} aria-hidden />
      </ActionIcon>
    </Tooltip>
  );
}

function ConfirmAlert({ action }: { action: ReturnType<typeof useTurnIntoAlert> }) {
  const t = useTranslations("eventDetail.actions");
  const tCommon = useTranslations("common.actions");

  return (
    <Stack gap={6}>
      <Text fz={12} fw={600} c="var(--color-critical)">
        {t("confirmPrompt")}
      </Text>
      <Group gap={6} grow>
        <Button variant="light" color="gray" size="xs" onClick={() => action.setConfirming(false)}>
          {tCommon("cancel")}
        </Button>
        <Button
          size="xs"
          color="var(--map-accent)"
          leftSection={<IconBellRinging size={13} aria-hidden />}
          loading={action.pending}
          onClick={action.confirm}
        >
          {tCommon("confirm")}
        </Button>
      </Group>
      {action.failed && (
        <Text fz={12} c="var(--color-critical)">
          {t("failed")}
        </Text>
      )}
    </Stack>
  );
}

function TakeActionSection({ id, aside, children }: { id: string; aside?: React.ReactNode; children: React.ReactNode }) {
  const t = useTranslations("mapV2.panel.detail.sections");

  return (
    <Section id={id} title={t("takeAction")} aside={aside}>
      {children}
    </Section>
  );
}

/** A signal's actions: the discussion its page offers. */
export function SignalTakeAction({ signalId }: { signalId: string }) {
  return (
    <TakeActionSection id="map-panel-detail-take-action">
      <div className={classes.comments}>
        <CommentsSection entityId={signalId} entityType="signal" />
      </div>
    </TakeActionSection>
  );
}

/** An event's (or alert's) actions: raising it as an alert, and the discussion its page offers. */
export function EventTakeAction(state: AlertState) {
  const action = useTurnIntoAlert(state);

  return (
    <TakeActionSection id="map-panel-detail-take-action" aside={<AlertButton action={action} />}>
      {action.confirming && !action.isAlert && <ConfirmAlert action={action} />}
      <div className={classes.comments}>
        <CommentsSection entityId={state.eventId} entityType="event" />
      </div>
    </TakeActionSection>
  );
}
