"use client";

import { useEffect, useState } from "react";
import {
  Modal,
  Stack,
  Text,
  TextInput,
  Textarea,
  Button,
  Group,
  NumberInput,
  Box,
  UnstyledButton,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useTranslations } from "next-intl";
import { IconCircleCheck, IconMapPin, IconMapPinOff } from "@tabler/icons-react";
import { api } from "~/trpc/react";

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
  /** Prefill from the current source pin when proposing a nudge. */
  sourceLat?: number;
  sourceLng?: number;
  /**
   * Map context: leave the modal and place a corrected pin by clicking the map.
   * When omitted (e.g. Signal detail), only manual coordinates are offered.
   */
  onPlaceOnMap?: (draft: { note?: string }) => void;
  /**
   * When clear-api schema is not shipped yet, optionally queue a local
   * visual fallback (map dual-pin / challenged affordance) instead of only
   * failing the submit.
   */
  onUnavailableQueue?: (payload: LocationChallengeQueuePayload) => void;
}

export function LocationChallengeModal({
  opened,
  onClose,
  signalId,
  sourceLat,
  sourceLng,
  onPlaceOnMap,
  onUnavailableQueue,
}: LocationChallengeModalProps) {
  const t = useTranslations("locationChallenge");
  const tActions = useTranslations("common.actions");
  const tToasts = useTranslations("common.toasts");
  const utils = api.useUtils();

  const [manualEntry, setManualEntry] = useState(false);
  const [lat, setLat] = useState<number | string>(sourceLat ?? "");
  const [lng, setLng] = useState<number | string>(sourceLng ?? "");
  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submittedWithCorrection, setSubmittedWithCorrection] = useState(false);

  useEffect(() => {
    if (!opened) return;
    setManualEntry(false);
    setLat(sourceLat ?? "");
    setLng(sourceLng ?? "");
    setName("");
    setNote("");
    setSubmitted(false);
    setSubmittedWithCorrection(false);
  }, [opened, sourceLat, sourceLng]);

  const submit = api.locationChallenge.submit.useMutation({
    onSuccess: async (_data, variables) => {
      setSubmittedWithCorrection(
        variables.proposedLat != null && variables.proposedLng != null,
      );
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
        setSubmittedWithCorrection(
          variables.proposedLat != null && variables.proposedLng != null,
        );
        setSubmitted(true);
        notifications.show({
          title: tToasts("error"),
          message: t("errors.backendUnavailable"),
          color: "yellow",
        });
        return;
      }
      notifications.show({
        title: tToasts("error"),
        message: backendMissing ? t("errors.backendUnavailable") : t("errors.submitFailed"),
        color: "red",
      });
    },
  });

  const latNum = typeof lat === "number" ? lat : Number(lat);
  const lngNum = typeof lng === "number" ? lng : Number(lng);
  const hasManualPoint =
    manualEntry &&
    Number.isFinite(latNum) &&
    Number.isFinite(lngNum) &&
    latNum >= -90 &&
    latNum <= 90 &&
    lngNum >= -180 &&
    lngNum <= 180;
  function handleClose() {
    onClose();
  }

  function handlePlaceOnMap() {
    onPlaceOnMap?.({ note: note.trim() || undefined });
    onClose();
  }

  function handleSubmit() {
    submit.mutate({
      signalId,
      note: note.trim() || undefined,
      proposedName: hasManualPoint ? name.trim() || undefined : undefined,
      proposedLat: hasManualPoint ? latNum : undefined,
      proposedLng: hasManualPoint ? lngNum : undefined,
    });
  }

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title={submitted ? undefined : t("modal.title")}
      size="sm"
      centered
      styles={{
        title: { fontSize: 15, fontWeight: 700, color: "var(--color-text-primary)" },
        body: { paddingTop: submitted ? 0 : 8 },
      }}
    >
      {submitted ? (
        <Stack align="center" gap={12} py={28}>
          <IconCircleCheck size={52} color="var(--color-success)" style={{ strokeWidth: 1.5 }} />
          <Text fw={700} size="lg" c="var(--color-text-primary)">
            {t("modal.successTitle")}
          </Text>
          <Text size="sm" c="var(--color-text-muted)" ta="center" maw={280}>
            {submittedWithCorrection
              ? t("modal.successCorrection")
              : t("modal.successChallenge")}
          </Text>
          <Button variant="subtle" color="gray" size="sm" mt={4} onClick={handleClose}>
            {tActions("close")}
          </Button>
        </Stack>
      ) : (
        <Stack gap={14}>
          <Box
            p={10}
            style={{
              background: "var(--color-bg-muted)",
              border: "1px solid var(--color-border)",
              borderRadius: 6,
              display: "flex",
              gap: 10,
              alignItems: "flex-start",
            }}
          >
            <IconMapPinOff size={18} color="var(--color-text-secondary)" style={{ flexShrink: 0, marginTop: 1 }} />
            <Text size="xs" c="var(--color-text-secondary)" style={{ lineHeight: 1.5 }}>
              {t("modal.intro")}
            </Text>
          </Box>

          <Textarea
            label={t("modal.noteLabel")}
            placeholder={t("modal.notePlaceholder")}
            value={note}
            onChange={(e) => setNote(e.currentTarget.value)}
            minRows={2}
            autosize
            maxRows={5}
            maxLength={2000}
            styles={{
              label: {
                fontSize: 12,
                fontWeight: 600,
                color: "var(--color-text-primary)",
                marginBottom: 4,
              },
            }}
          />

          <Stack gap={8}>
            <Text size="xs" fw={600} c="var(--color-text-primary)">
              {t("modal.proposeCorrection")}
            </Text>
            <Text size="xs" c="var(--color-text-muted)" style={{ lineHeight: 1.4, marginTop: -4 }}>
              {onPlaceOnMap ? t("modal.placeOnMapHint") : t("modal.proposeCorrectionHint")}
            </Text>

            {onPlaceOnMap && (
              <Button
                size="sm"
                variant="light"
                color="gray"
                leftSection={<IconMapPin size={14} />}
                onClick={handlePlaceOnMap}
                style={{ fontWeight: 600 }}
              >
                {t("modal.placeOnMap")}
              </Button>
            )}

            <UnstyledButton
              type="button"
              onClick={() => setManualEntry((v) => !v)}
              style={{
                fontSize: 11,
                fontWeight: 500,
                color: "var(--color-text-muted)",
                cursor: "pointer",
                alignSelf: onPlaceOnMap ? "flex-start" : undefined,
                padding: 0,
              }}
            >
              {manualEntry
                ? t("modal.hideManualCoordinates")
                : t("modal.enterCoordinatesManually")}
            </UnstyledButton>

            {manualEntry && (
              <Stack gap={10}>
                <Group grow align="flex-start">
                  <NumberInput
                    label={t("modal.lat")}
                    value={lat}
                    onChange={setLat}
                    decimalScale={6}
                    hideControls
                    required
                    styles={{
                      label: {
                        fontSize: 12,
                        fontWeight: 600,
                        color: "var(--color-text-primary)",
                        marginBottom: 4,
                      },
                    }}
                  />
                  <NumberInput
                    label={t("modal.lng")}
                    value={lng}
                    onChange={setLng}
                    decimalScale={6}
                    hideControls
                    required
                    styles={{
                      label: {
                        fontSize: 12,
                        fontWeight: 600,
                        color: "var(--color-text-primary)",
                        marginBottom: 4,
                      },
                    }}
                  />
                </Group>
                <TextInput
                  label={t("modal.placeName")}
                  placeholder={t("modal.placeNamePlaceholder")}
                  value={name}
                  onChange={(e) => setName(e.currentTarget.value)}
                  maxLength={500}
                  styles={{
                    label: {
                      fontSize: 12,
                      fontWeight: 600,
                      color: "var(--color-text-primary)",
                      marginBottom: 4,
                    },
                  }}
                />
              </Stack>
            )}
          </Stack>

          <Group justify="flex-end" mt={4}>
            <Button variant="subtle" color="gray" size="sm" onClick={handleClose}>
              {tActions("cancel")}
            </Button>
            <Button
              size="sm"
              loading={submit.isPending}
              onClick={handleSubmit}
              style={{
                background: "var(--color-accent)",
                borderColor: "var(--color-accent)",
                fontSize: 12,
              }}
            >
              {hasManualPoint ? t("modal.submitCorrection") : t("modal.submitChallenge")}
            </Button>
          </Group>
        </Stack>
      )}
    </Modal>
  );
}
