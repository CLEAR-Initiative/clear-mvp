"use client";

import { useState } from "react";
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

const SEVERITY_OPTIONS = [
  { value: "1", label: "1 — Low" },
  { value: "2", label: "2 — Moderate" },
  { value: "3", label: "3 — High" },
  { value: "4", label: "4 — Very High" },
  { value: "5", label: "5 — Critical" },
];

const SECTION_LABEL_STYLE = {
  fontSize: 11,
  fontWeight: 600,
  textTransform: "uppercase" as const,
  letterSpacing: "0.5px",
  color: "#737373",
};

export function CreateAlertModal({ opened, onClose, onSuccess }: CreateAlertModalProps) {
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
      setSuccessMsg("Alert created successfully.");
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
          Create Manual Alert
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
        {/* Section 1 — Alert Content */}
        <Divider />
        <Text style={SECTION_LABEL_STYLE}>Alert Content</Text>

        <TextInput
          label={<Text style={SECTION_LABEL_STYLE}>Title</Text>}
          placeholder="Alert title/headline"
          value={form.title}
          onChange={(e) => {
            const v = e.currentTarget?.value ?? "";
            setForm((p) => ({ ...p, title: v }));
          }}
          required
        />

        <Textarea
          label={<Text style={SECTION_LABEL_STYLE}>Description</Text>}
          placeholder="Main alert content and details"
          value={form.description}
          onChange={(e) => {
            const v = e.currentTarget?.value ?? "";
            setForm((p) => ({ ...p, description: v }));
          }}
          minRows={4}
          required
        />

        {/* Section 2 — Classification */}
        <Divider />
        <Text style={SECTION_LABEL_STYLE}>Classification</Text>

        <Group grow>
          <Select
            label={<Text style={SECTION_LABEL_STYLE}>Severity</Text>}
            placeholder="Select severity"
            data={SEVERITY_OPTIONS}
            value={form.severity}
            onChange={(v) => setForm((p) => ({ ...p, severity: v ?? "" }))}
            required
            comboboxProps={{ zIndex: 1000 }}
          />
          <Stack gap={4}>
            <Text style={SECTION_LABEL_STYLE}>Status</Text>
            <SegmentedControl
              value={form.status}
              onChange={(v) => setForm((p) => ({ ...p, status: v as "draft" | "published" }))}
              data={[
                { label: "Draft", value: "draft" },
                { label: "Published", value: "published" },
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
          Create Alert
        </Button>
      </Stack>
    </Modal>
  );
}
