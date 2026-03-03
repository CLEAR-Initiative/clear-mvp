"use client";

import { useState } from "react";
import {
  Modal,
  TextInput,
  Textarea,
  Select,
  SimpleGrid,
  Checkbox,
  Group,
  Button,
  Divider,
  Text,
  Alert,
  Skeleton,
  Box,
} from "@mantine/core";
import { api } from "~/trpc/react";

interface CreateAlertModalProps {
  opened: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface FormData {
  title: string;
  text: string;
  shock_type_id: string;
  data_source_id: string;
  shock_date: string;
  severity: string;
  valid_from: string;
  valid_until: string;
  location_ids: number[];
}

const SEVERITY_OPTIONS = [
  { value: "1", label: "1 — Low" },
  { value: "2", label: "2 — Moderate" },
  { value: "3", label: "3 — High" },
  { value: "4", label: "4 — Very High" },
  { value: "5", label: "5 — Critical" },
];

function toLocalISOString(d: Date): string {
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString();
}

function today(): string {
  return toLocalISOString(new Date()).split("T")[0]!;
}

function nowLocal(): string {
  const d = new Date();
  d.setSeconds(0, 0);
  return toLocalISOString(d).slice(0, 16);
}

function plusSevenDaysLocal(): string {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  d.setSeconds(0, 0);
  return toLocalISOString(d).slice(0, 16);
}

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
    text: "",
    shock_type_id: "",
    data_source_id: "",
    shock_date: today(),
    severity: "",
    valid_from: nowLocal(),
    valid_until: plusSevenDaysLocal(),
    location_ids: [],
  });

  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const shockTypesQuery = api.alerts.getShockTypes.useQuery(undefined, { enabled: opened });
  const sourcesQuery = api.pipeline.getSources.useQuery(undefined, { enabled: opened });
  const locationsQuery = api.pipeline.getLocations.useQuery({ adminLevel: "1" }, { enabled: opened });

  const createMutation = api.alerts.createAlert.useMutation({
    onSuccess: (data) => {
      setSuccessMsg(data.message ?? "Alert created successfully.");
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
      text: "",
      shock_type_id: "",
      data_source_id: "",
      shock_date: today(),
      severity: "",
      valid_from: nowLocal(),
      valid_until: plusSevenDaysLocal(),
      location_ids: [],
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
    form.text.trim().length > 0 &&
    form.shock_type_id !== "" &&
    form.data_source_id !== "" &&
    form.shock_date !== "" &&
    form.severity !== "";

  function handleSubmit() {
    if (!isValid) return;
    setErrorMsg(null);
    if (form.valid_from && form.valid_until) {
      if (new Date(form.valid_from) > new Date(form.valid_until)) {
        setErrorMsg("'Valid From' must be before 'Valid Until'.");
        return;
      }
    }
    createMutation.mutate({
      title: form.title.trim(),
      text: form.text.trim(),
      shock_type_id: Number(form.shock_type_id),
      data_source_id: Number(form.data_source_id),
      shock_date: form.shock_date,
      severity: Number(form.severity),
      valid_from: form.valid_from || undefined,
      valid_until: form.valid_until || undefined,
      location_ids: form.location_ids.length > 0 ? form.location_ids : undefined,
    });
  }

  const locations = locationsQuery.data?.locations ?? [];

  function toggleLocation(id: number) {
    setForm((prev) => ({
      ...prev,
      location_ids: prev.location_ids.includes(id)
        ? prev.location_ids.filter((l) => l !== id)
        : [...prev.location_ids, id],
    }));
  }

  function selectAllLocations() {
    setForm((prev) => ({ ...prev, location_ids: locations.map((l) => l.id) }));
  }

  function clearAllLocations() {
    setForm((prev) => ({ ...prev, location_ids: [] }));
  }

  const shockTypeOptions =
    shockTypesQuery.data?.shock_types?.map((st) => ({
      value: String(st.id),
      label: st.name,
    })) ?? [];

  const fetchedSources =
    sourcesQuery.data?.sources?.map((s) => ({
      value: String(s.id),
      label: s.name,
    })) ?? [];
  const sourceOptions =
    fetchedSources.length > 0 ? fetchedSources : [{ value: "7", label: "Test Source" }];

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

      {/* Section 1 — Alert Content */}
      <Divider mb={8} />
      <Text style={SECTION_LABEL_STYLE} mb={12}>
        Alert Content
      </Text>

      <TextInput
        label={<Text style={SECTION_LABEL_STYLE}>Title</Text>}
        placeholder="Alert title/headline"
        value={form.title}
        onChange={(e) => {
          const v = e.currentTarget?.value ?? "";
          setForm((p) => ({ ...p, title: v }));
        }}
        mb={12}
        required
      />

      <Textarea
        label={<Text style={SECTION_LABEL_STYLE}>Text</Text>}
        placeholder="Main alert content and details"
        value={form.text}
        onChange={(e) => {
          const v = e.currentTarget?.value ?? "";
          setForm((p) => ({ ...p, text: v }));
        }}
        minRows={4}
        mb={20}
        required
      />

      {/* Section 2 — Classification */}
      <Divider mb={8} />
      <Text style={SECTION_LABEL_STYLE} mb={12}>
        Classification
      </Text>

      <SimpleGrid cols={2} mb={20}>
        <Select
          label={<Text style={SECTION_LABEL_STYLE}>Shock Type</Text>}
          placeholder={shockTypesQuery.isLoading ? "Loading…" : "Select shock type"}
          data={shockTypeOptions}
          value={form.shock_type_id}
          onChange={(v) => setForm((p) => ({ ...p, shock_type_id: v ?? "" }))}
          disabled={shockTypesQuery.isLoading}
          required
          comboboxProps={{ zIndex: 1000 }}
        />
        <Select
          label={<Text style={SECTION_LABEL_STYLE}>Severity</Text>}
          placeholder="Select severity"
          data={SEVERITY_OPTIONS}
          value={form.severity}
          onChange={(v) => setForm((p) => ({ ...p, severity: v ?? "" }))}
          required
          comboboxProps={{ zIndex: 1000 }}
        />
        <Select
          label={<Text style={SECTION_LABEL_STYLE}>Data Source</Text>}
          placeholder={sourcesQuery.isLoading ? "Loading…" : "Select data source"}
          data={sourceOptions}
          value={form.data_source_id}
          onChange={(v) => setForm((p) => ({ ...p, data_source_id: v ?? "" }))}
          disabled={sourcesQuery.isLoading}
          required
          comboboxProps={{ zIndex: 1000 }}
        />
        <TextInput
          label={<Text style={SECTION_LABEL_STYLE}>Shock Date</Text>}
          type="date"
          value={form.shock_date}
          onChange={(e) => {
            const v = e.currentTarget?.value ?? "";
            setForm((p) => ({ ...p, shock_date: v }));
          }}
          required
        />
      </SimpleGrid>

      {/* Section 3 — Validity Period */}
      <Divider mb={8} />
      <Text style={SECTION_LABEL_STYLE} mb={12}>
        Validity Period
      </Text>

      <SimpleGrid cols={2} mb={20}>
        <TextInput
          label={<Text style={SECTION_LABEL_STYLE}>Valid From</Text>}
          type="datetime-local"
          value={form.valid_from}
          onChange={(e) => {
            const v = e.currentTarget?.value ?? "";
            setForm((p) => ({ ...p, valid_from: v }));
          }}
        />
        <TextInput
          label={<Text style={SECTION_LABEL_STYLE}>Valid Until</Text>}
          type="datetime-local"
          value={form.valid_until}
          onChange={(e) => {
            const v = e.currentTarget?.value ?? "";
            setForm((p) => ({ ...p, valid_until: v }));
          }}
        />
      </SimpleGrid>

      {/* Section 4 — Geographic Scope */}
      <Divider mb={8} />
      <Text style={SECTION_LABEL_STYLE} mb={8}>
        Geographic Scope
      </Text>

      <Group gap={8} mb={12}>
        <Button
          variant="outline"
          color="gray"
          size="xs"
          onClick={selectAllLocations}
          disabled={locationsQuery.isLoading}
        >
          Select All
        </Button>
        <Button
          variant="outline"
          color="gray"
          size="xs"
          onClick={clearAllLocations}
          disabled={locationsQuery.isLoading}
        >
          Clear All
        </Button>
      </Group>

      {locationsQuery.isError && (
        <Alert color="yellow" variant="light" mb={12} styles={{ message: { fontSize: 12 } }}>
          Could not load locations: {locationsQuery.error.message}. Ensure you are logged in.
        </Alert>
      )}
      {locationsQuery.isLoading ? (
        <SimpleGrid cols={3} mb={20}>
          {Array.from({ length: 9 }).map((_, i) => (
            <Skeleton key={i} height={24} radius="sm" />
          ))}
        </SimpleGrid>
      ) : (
        <SimpleGrid cols={3} mb={20}>
          {locations.map((loc) => (
            <Box
              key={loc.id}
              style={{
                border: "1px solid #e5e7eb",
                borderRadius: 4,
                padding: "6px 10px",
              }}
            >
              <Checkbox
                label={
                  <Text size="xs" style={{ lineHeight: 1.3 }}>
                    {loc.name}
                  </Text>
                }
                checked={form.location_ids.includes(loc.id)}
                onChange={() => toggleLocation(loc.id)}
                size="xs"
              />
            </Box>
          ))}
          {locations.length === 0 && (
            <Text size="xs" c="dimmed" style={{ gridColumn: "1 / -1" }}>
              No locations available.
            </Text>
          )}
        </SimpleGrid>
      )}

      <Button
        fullWidth
        onClick={handleSubmit}
        disabled={!isValid || createMutation.isPending}
        loading={createMutation.isPending}
        style={{ background: "#E85D3D", borderColor: "#E85D3D" }}
      >
        Create Alert
      </Button>
    </Modal>
  );
}
