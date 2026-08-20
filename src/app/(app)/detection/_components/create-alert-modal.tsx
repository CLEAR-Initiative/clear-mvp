"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import {
  Modal,
  TextInput,
  Textarea,
  Select,
  SegmentedControl,
  Group,
  Button,
  Divider,
  Text,
  Alert,
  Stack,
  Badge,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { api } from "~/trpc/react";

interface CreateAlertModalProps {
  opened: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  /** When set (bulk Raise Alert), attach these events to the new alert. */
  eventIds?: string[];
  suggestedTitle?: string;
  defaultSeverity?: number;
}

interface FormData {
  title: string;
  description: string;
  severity: string;
  status: "draft" | "published";
}

const SEVERITY_OPTIONS = [
  { value: "1", labelKey: "low" },
  { value: "2", labelKey: "moderate" },
  { value: "3", labelKey: "high" },
  { value: "4", labelKey: "veryHigh" },
  { value: "5", labelKey: "critical" },
] as const;

const SECTION_LABEL_STYLE = {
  fontSize: 11,
  fontWeight: 600,
  textTransform: "uppercase" as const,
  letterSpacing: "0.5px",
  color: "var(--color-text-muted)",
};

function clampSeverity(n: number): string {
  if (!Number.isFinite(n)) return "3";
  return String(Math.min(5, Math.max(1, Math.round(n))));
}

export function CreateAlertModal({
  opened,
  onClose,
  onSuccess,
  eventIds = [],
  suggestedTitle = "",
  defaultSeverity = 3,
}: CreateAlertModalProps) {
  const t = useTranslations("detection");
  const tBulk = useTranslations("detection.bulk");
  const utils = api.useUtils();
  const linkedEventIds = useMemo(() => [...new Set(eventIds)], [eventIds]);

  const [form, setForm] = useState<FormData>({
    title: "",
    description: "",
    severity: "",
    status: "draft",
  });
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!opened) return;
    setForm({
      title: suggestedTitle,
      description: "",
      severity: clampSeverity(defaultSeverity),
      status: "draft",
    });
    setErrorMsg(null);
    setSuccessMsg(null);
  }, [opened, suggestedTitle, defaultSeverity]);

  const createMutation = api.alerts.createAlert.useMutation({
    onSuccess: () => {
      setSuccessMsg(t("createAlert.success"));
      void Promise.all([
        utils.alerts.alertsPage.invalidate(),
        utils.alerts.getAlerts.invalidate(),
        utils.alerts.getStats.invalidate(),
        utils.alerts.eventsPage.invalidate(),
      ]);
      setTimeout(() => {
        setSuccessMsg(null);
        onClose();
        onSuccess?.();
      }, 900);
    },
    onError: (err) => {
      setErrorMsg(err.message);
      notifications.show({
        color: "red",
        title: tBulk("raiseAlertError"),
        message: err.message,
      });
    },
  });

  function handleClose() {
    setErrorMsg(null);
    setSuccessMsg(null);
    onClose();
  }

  const isValid =
    form.title.trim().length > 0 &&
    form.description.trim().length > 0 &&
    form.severity !== "";

  function handleSubmit() {
    if (!isValid) return;
    setErrorMsg(null);
    createMutation.mutate({
      title: form.title.trim(),
      description: form.description.trim(),
      severity: Number(form.severity),
      status: form.status,
      ...(linkedEventIds.length > 0
        ? {
            eventIds: linkedEventIds,
            primaryEventId: linkedEventIds[0],
          }
        : {}),
    });
  }

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title={
        <Text fw={600} size="sm">
          {linkedEventIds.length > 0 ? tBulk("raiseAlertTitle") : t("createAlert.title")}
        </Text>
      }
      size="lg"
      centered
      radius={0}
    >
      {successMsg && (
        <Alert color="green" mb="md">
          {successMsg}
        </Alert>
      )}
      {errorMsg && (
        <Alert color="red" mb="md" onClose={() => setErrorMsg(null)} withCloseButton>
          {errorMsg}
        </Alert>
      )}

      <Stack gap="md">
        {linkedEventIds.length > 0 && (
          <Badge size="sm" variant="light" color="gray" w="fit-content">
            {tBulk("raiseAlertEvents", { count: linkedEventIds.length })}
          </Badge>
        )}

        <Divider />
        <Text style={SECTION_LABEL_STYLE}>{t("createAlert.sectionContent")}</Text>

        <TextInput
          label={<Text style={SECTION_LABEL_STYLE}>{t("createAlert.fieldTitle")}</Text>}
          placeholder={t("createAlert.titlePlaceholder")}
          value={form.title}
          onChange={(e) => {
            const v = e.currentTarget?.value ?? "";
            setForm((p) => ({ ...p, title: v }));
          }}
          required
          data-testid="bulk-alert-title"
        />

        <Textarea
          label={<Text style={SECTION_LABEL_STYLE}>{t("createAlert.fieldDescription")}</Text>}
          placeholder={t("createAlert.descriptionPlaceholder")}
          value={form.description}
          onChange={(e) => {
            const v = e.currentTarget?.value ?? "";
            setForm((p) => ({ ...p, description: v }));
          }}
          minRows={4}
          required
          data-testid="bulk-alert-description"
        />

        <Divider />
        <Text style={SECTION_LABEL_STYLE}>{t("createAlert.sectionClassification")}</Text>

        <Group grow>
          <Select
            label={<Text style={SECTION_LABEL_STYLE}>{t("createAlert.fieldSeverity")}</Text>}
            placeholder={t("createAlert.severityPlaceholder")}
            data={SEVERITY_OPTIONS.map((o) => ({
              value: o.value,
              label: t(`createAlert.severityOptions.${o.labelKey}`),
            }))}
            value={form.severity}
            onChange={(v) => setForm((p) => ({ ...p, severity: v ?? "" }))}
            required
            comboboxProps={{ zIndex: 1000 }}
          />
          <Stack gap={4}>
            <Text style={SECTION_LABEL_STYLE}>{t("createAlert.fieldStatus")}</Text>
            <SegmentedControl
              value={form.status}
              onChange={(v) => setForm((p) => ({ ...p, status: v as "draft" | "published" }))}
              data={[
                { label: t("createAlert.statusDraft"), value: "draft" },
                { label: t("createAlert.statusPublished"), value: "published" },
              ]}
              size="xs"
            />
          </Stack>
        </Group>

        <Button
          fullWidth
          onClick={handleSubmit}
          disabled={!isValid || createMutation.isPending}
          loading={createMutation.isPending}
          style={{ background: "#E85D3D", borderColor: "#E85D3D" }}
          data-testid="bulk-alert-submit"
        >
          {t("createAlert.submit")}
        </Button>
      </Stack>
    </Modal>
  );
}
