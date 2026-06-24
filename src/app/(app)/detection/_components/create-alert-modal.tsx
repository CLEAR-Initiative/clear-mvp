"use client";

import { useState } from "react";
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
} from "@mantine/core";
import { api } from "~/trpc/react";

interface CreateAlertModalProps {
  opened: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface FormData {
  title: string;
  description: string;
  severity: string;
  status: "draft" | "published";
}

// labelKey: i18n keys under detection.createAlert.severityOptions.* - resolved via t() at render time.
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

export function CreateAlertModal({ opened, onClose, onSuccess }: CreateAlertModalProps) {
  const t = useTranslations("detection");
  const [form, setForm] = useState<FormData>({
    title: "",
    description: "",
    severity: "",
    status: "draft",
  });

  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const createMutation = api.alerts.createAlert.useMutation({
    onSuccess: () => {
      setSuccessMsg(t("createAlert.success"));
      setTimeout(() => {
        setSuccessMsg(null);
        resetForm();
        onClose();
        onSuccess?.();
      }, 1500);
    },
    onError: (err) => {
      setErrorMsg(err.message);
    },
  });

  function resetForm() {
    setForm({
      title: "",
      description: "",
      severity: "",
      status: "draft",
    });
    setErrorMsg(null);
    setSuccessMsg(null);
  }

  function handleClose() {
    resetForm();
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
    });
  }

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title={
        <Text fw={600} size="sm">
          {t("createAlert.title")}
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
        {/* Section 1 - Alert Content */}
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
        />

        {/* Section 2 - Classification */}
        <Divider />
        <Text style={SECTION_LABEL_STYLE}>{t("createAlert.sectionClassification")}</Text>

        <Group grow>
          <Select
            label={<Text style={SECTION_LABEL_STYLE}>{t("createAlert.fieldSeverity")}</Text>}
            placeholder={t("createAlert.severityPlaceholder")}
            data={SEVERITY_OPTIONS.map((o) => ({ value: o.value, label: t(`createAlert.severityOptions.${o.labelKey}`) }))}
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
        >
          {t("createAlert.submit")}
        </Button>
      </Stack>
    </Modal>
  );
}
