"use client";

import { useEffect, useRef, useState } from "react";
import { Modal, Stack, Text, Textarea, Button, Group, Box } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useTranslations } from "next-intl";
import { IconAlertTriangle, IconCircleCheck, IconMapPin } from "@tabler/icons-react";
import { api } from "~/trpc/react";
import { challengeErrorKey } from "~/lib/location-challenge";
import type { GqlSignalLocationChallenge } from "~/lib/types/graphql";
import { useLocationChallengeFiling } from "./use-location-challenge-filing";
import { LocationChallengeMap } from "./location-challenge-map";
import {
  LocationPointFields,
  fieldLabelStyles,
  pickedAt,
  useLocationPointPicker,
} from "./location-point-picker";

export type LocationChallengeQueuePayload = {
  signalId: string;
  note?: string;
  proposedLat?: number;
  proposedLng?: number;
  proposedName?: string;
};

interface LocationChallengeModalProps {
  opened: boolean;
  onClose: () => void;
  signalId: string;
  /** Where the Signal is now, as readable text ("Qalat, Zabul, Afghanistan"). */
  currentPlace?: string | null;
  /** The Signal's pin now: shown as exact coordinates and on the map. */
  sourceLat?: number;
  sourceLng?: number;
  /** The Signal's open change, when editing it: the form starts from it
   *  rather than empty, so resubmitting doesn't drop its note or point. */
  existing?: GqlSignalLocationChallenge | null;
  /**
   * Map context: leave the modal and place the new pin by clicking the map
   * behind it. When omitted (e.g. Signal detail), a small map in the modal
   * takes the click instead.
   */
  onPlaceOnMap?: (draft: { note?: string }) => void;
  /**
   * When clear-api schema is not shipped yet, optionally queue a local
   * visual fallback (map dual-pin / challenged affordance) instead of only
   * failing the submit.
   */
  onUnavailableQueue?: (payload: LocationChallengeQueuePayload) => void;
}

const sectionLabelProps = {
  size: "xs",
  fw: 600,
  tt: "uppercase",
  c: "var(--color-text-muted)",
} as const;

/**
 * Change a Signal's location, for the active team: where it is now, and
 * where it should be (a place search, a click on the map, or typed
 * coordinates), with an optional note. The team's admin decides it; nothing
 * changes on the Signal until then.
 */
export function LocationChallengeModal({
  opened,
  onClose,
  signalId,
  currentPlace,
  sourceLat,
  sourceLng,
  existing,
  onPlaceOnMap,
  onUnavailableQueue,
}: LocationChallengeModalProps) {
  const t = useTranslations("locationChallenge");
  const tActions = useTranslations("common.actions");
  const tToasts = useTranslations("common.toasts");
  const utils = api.useUtils();
  const filing = useLocationChallengeFiling();
  const picker = useLocationPointPicker({
    active: opened,
    sourceLat,
    sourceLng,
    teamLocations: filing.teamLocations,
    canPlaceAnywhere: filing.canPlaceAnywhere,
  });
  const point = picker.point;
  const source = sourceLat != null && sourceLng != null ? { lat: sourceLat, lng: sourceLng } : null;

  const [note, setNote] = useState("");
  const [submitted, setSubmitted] = useState(false);
  /** True when clear-api is missing and we only queued a session-local visual. */
  const [submittedSessionOnly, setSubmittedSessionOnly] = useState(false);

  // Start the form when the modal opens, not whenever the open change is
  // refetched: filing refetches it, and resetting then would drop the
  // success screen (or unsent edits) for the saved copy.
  const wasOpen = useRef(false);
  useEffect(() => {
    const justOpened = opened && !wasOpen.current;
    wasOpen.current = opened;
    if (!justOpened) return;
    picker.reset(
      existing?.proposedLat != null && existing.proposedLng != null
        ? pickedAt(existing.proposedLat, existing.proposedLng, existing.proposedName ?? null)
        : null,
    );
    setNote(existing?.note ?? "");
    setSubmitted(false);
    setSubmittedSessionOnly(false);
  }, [opened, existing, picker]);

  const submit = api.locationChallenge.submit.useMutation({
    onSuccess: async () => {
      setSubmittedSessionOnly(false);
      setSubmitted(true);
      await Promise.all([
        utils.locationChallenge.getBySignal.invalidate({ signalId }),
        utils.locationChallenge.listForMap.invalidate(),
      ]);
    },
    onError: (err, variables) => {
      const backendMissing = err.message.includes("LOCATION_CHALLENGE_BACKEND_UNAVAILABLE");
      if (backendMissing && onUnavailableQueue) {
        onUnavailableQueue({
          signalId: variables.signalId,
          note: variables.note,
          proposedName: variables.proposedName,
          proposedLat: variables.proposedLat,
          proposedLng: variables.proposedLng,
        });
        setSubmittedSessionOnly(true);
        setSubmitted(true);
        return;
      }
      notifications.show({
        title: tToasts("error"),
        message: backendMissing ? t("errors.backendUnavailable") : t(challengeErrorKey(err.data?.code)),
        color: "red",
      });
    },
  });

  function handleClose() {
    onClose();
  }

  function handlePlaceOnMap() {
    onPlaceOnMap?.({ note: note.trim() || undefined });
    onClose();
  }

  // A change needs where to: the Signal's new point.
  const canSubmit = !!filing.teamId && !!point && !picker.blocked;

  function handleSubmit() {
    if (!filing.teamId || !point || picker.blocked) return;
    submit.mutate({
      signalId,
      teamId: filing.teamId,
      note: note.trim() || undefined,
      proposedName: point.name ?? undefined,
      proposedLat: point.lat,
      proposedLng: point.lng,
    });
  }

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title={submitted ? undefined : t("modal.title")}
      size="md"
      centered
      styles={{
        title: { fontSize: 15, fontWeight: 700, color: "var(--color-text-primary)" },
        body: { paddingTop: submitted ? 0 : 8 },
      }}
    >
      {submitted ? (
        <Stack align="center" gap={12} py={28}>
          {submittedSessionOnly ? (
            <IconAlertTriangle size={52} color="var(--color-warning)" style={{ strokeWidth: 1.5 }} />
          ) : (
            <IconCircleCheck size={52} color="var(--color-success)" style={{ strokeWidth: 1.5 }} />
          )}
          <Text fw={700} size="lg" c="var(--color-text-primary)">
            {submittedSessionOnly ? t("modal.sessionOnlyTitle") : t("modal.successTitle")}
          </Text>
          <Text size="sm" c="var(--color-text-muted)" ta="center" maw={300}>
            {submittedSessionOnly ? t("modal.sessionOnlyCorrection") : t("modal.successBody")}
          </Text>
          <Button variant="subtle" color="gray" size="sm" mt={4} onClick={handleClose}>
            {tActions("close")}
          </Button>
        </Stack>
      ) : (
        <Stack gap={16}>
          <Box data-testid="location-challenge-current">
            <Text {...sectionLabelProps} mb={4}>
              {t("modal.current")}
            </Text>
            <Text size="sm" fw={600} c="var(--color-text-primary)">
              {currentPlace ?? t("modal.noPlace")}
            </Text>
            <Text size="xs" c="var(--color-text-muted)">
              {source ? `${source.lat.toFixed(5)}, ${source.lng.toFixed(5)}` : t("modal.noPin")}
            </Text>
          </Box>

          <Stack gap={8}>
            <Text {...sectionLabelProps}>{t("modal.changeTo")}</Text>
            <LocationPointFields
              picker={picker}
              toggleAlign="start"
              extra={
                onPlaceOnMap ? (
                  <Button
                    size="sm"
                    variant="light"
                    color="gray"
                    leftSection={<IconMapPin size={14} />}
                    onClick={handlePlaceOnMap}
                    style={{ fontWeight: 600, alignSelf: "flex-start" }}
                  >
                    {t("modal.placeOnMap")}
                  </Button>
                ) : (
                  <Stack gap={6}>
                    <Text size="xs" c="var(--color-text-muted)">
                      {t("modal.orOnMap")}
                    </Text>
                    <LocationChallengeMap
                      source={source}
                      proposed={null}
                      placed={point}
                      picking
                      onPick={picker.placeAt}
                    />
                  </Stack>
                )
              }
            />
          </Stack>

          <Textarea
            label={t("modal.noteLabel")}
            placeholder={t("modal.notePlaceholder")}
            value={note}
            onChange={(e) => setNote(e.currentTarget.value)}
            minRows={1}
            autosize
            maxRows={4}
            maxLength={2000}
            styles={fieldLabelStyles}
          />

          <Group justify="flex-end" mt={4}>
            <Button variant="subtle" color="gray" size="sm" onClick={handleClose}>
              {tActions("cancel")}
            </Button>
            <Button
              size="sm"
              loading={submit.isPending}
              disabled={!canSubmit}
              onClick={handleSubmit}
              data-testid="location-challenge-submit"
              style={
                canSubmit
                  ? { background: "var(--color-accent)", borderColor: "var(--color-accent)", fontSize: 12 }
                  : { fontSize: 12 }
              }
            >
              {t("modal.submit")}
            </Button>
          </Group>
        </Stack>
      )}
    </Modal>
  );
}
