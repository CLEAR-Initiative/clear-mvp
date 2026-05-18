"use client";

import { useState, useRef, useEffect } from "react";
import {
  Modal,
  TextInput,
  Textarea,
  Select,
  Button,
  Group,
  Stack,
  Text,
  Box,
  ActionIcon,
} from "@mantine/core";
import {
  IconCircleCheck,
  IconUpload,
  IconX,
  IconFile,
  IconArrowRight,
  IconArrowLeft,
  IconAlertTriangle,
} from "@tabler/icons-react";
import { api } from "~/trpc/react";
import { useTeam } from "~/providers/team-provider";
import { sourceLabels, isManualSourceType } from "~/lib/constants/sources";

type Step = "details" | "media" | "success";

interface SignalFormData {
  title: string;
  description: string;
  locationId: string;
  sourceId: string;
  severity: string;
}

const SEVERITY_OPTIONS = [
  { value: "2", label: "Low" },
  { value: "3", label: "Medium" },
  { value: "4", label: "High" },
  { value: "5", label: "Critical" },
];

interface SelectedFile {
  file: File;
  id: string;
}

interface CreateSignalModalProps {
  opened: boolean;
  onClose: () => void;
}

const LABEL_STYLE: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  textTransform: "uppercase",
  letterSpacing: "0.5px",
  color: "var(--color-text-muted)",
};

function fileIcon(_file: File) {
  return <IconFile size={14} />;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/* ── Step 1: Signal Details ──────────────────────────────────── */

function DetailsStep({
  form,
  setForm,
  onNext,
  locationOptions,
  locationsLoading,
  sourceOptions,
  sourcesLoading,
}: {
  form: SignalFormData;
  setForm: React.Dispatch<React.SetStateAction<SignalFormData>>;
  onNext: () => void;
  locationOptions: { value: string; label: string }[];
  locationsLoading: boolean;
  sourceOptions: { value: string; label: string }[];
  sourcesLoading: boolean;
}) {
  const isValid = form.title.trim().length > 0 && form.sourceId.length > 0;
  const isHighSeverity = form.severity === "4" || form.severity === "5";

  return (
    <Stack gap="md">
      <TextInput
        label={<Text style={LABEL_STYLE}>Title</Text>}
        placeholder="e.g., Flooding reported in Kassala State"
        value={form.title}
        onChange={(e) => { const v = e.currentTarget.value; setForm((p) => ({ ...p, title: v })); }}
        required
        autoFocus
      />

      <Textarea
        label={<Text style={LABEL_STYLE}>Description</Text>}
        placeholder="Describe what was observed, source, and any relevant context…"
        value={form.description}
        onChange={(e) => { const v = e.currentTarget.value; setForm((p) => ({ ...p, description: v })); }}
        minRows={3}
        autosize
        maxRows={6}
      />

      <Select
        label={<Text style={LABEL_STYLE}>Source</Text>}
        placeholder={sourcesLoading ? "Loading sources…" : "Select a source…"}
        data={sourceOptions}
        value={form.sourceId || null}
        onChange={(v) => setForm((p) => ({ ...p, sourceId: v ?? "" }))}
        disabled={sourcesLoading}
        required
        comboboxProps={{ zIndex: 1000 }}
        nothingFoundMessage="No sources available"
      />

      <Select
        label={<Text style={LABEL_STYLE}>Location</Text>}
        placeholder={locationsLoading ? "Loading locations…" : "Search location…"}
        data={locationOptions}
        value={form.locationId || null}
        onChange={(v) => setForm((p) => ({ ...p, locationId: v ?? "" }))}
        searchable
        clearable
        disabled={locationsLoading}
        comboboxProps={{ zIndex: 1000 }}
        nothingFoundMessage="No matching location"
      />

      <Box>
        <Select
          label={<Text style={LABEL_STYLE}>Severity</Text>}
          placeholder="Select severity…"
          data={SEVERITY_OPTIONS}
          value={form.severity || null}
          onChange={(v) => setForm((p) => ({ ...p, severity: v ?? "" }))}
          clearable
          comboboxProps={{ zIndex: 1000 }}
        />
        {isHighSeverity && (
          <Box mt={8} style={{ display: "grid", gridTemplateColumns: "16px 1fr", gap: 6, alignItems: "center" }}>
            <IconAlertTriangle size={14} style={{ color: "var(--color-warning)", justifySelf: "center" }} />
            <Text size="xs" c="var(--color-warning)">
              {form.severity === "5" ? "Critical" : "High"} severity signals may trigger an alert and notify team members subscribed to alerts at this level.
            </Text>
          </Box>
        )}
      </Box>

      <Group justify="flex-end" mt="xs">
        <Button
          rightSection={<IconArrowRight size={14} />}
          onClick={onNext}
          disabled={!isValid}
          color="accent"
          style={{ fontSize: 13 }}
        >
          Next: Add Media
        </Button>
      </Group>
    </Stack>
  );
}

/* ── Step 2: Media Upload ────────────────────────────────────── */

function MediaStep({
  files,
  onAdd,
  onRemove,
  onBack,
  onSubmit,
  isSubmitting,
}: {
  files: SelectedFile[];
  onAdd: (f: File[]) => void;
  onRemove: (id: string) => void;
  onBack: () => void;
  onSubmit: () => void;
  isSubmitting: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const dropped = Array.from(e.dataTransfer.files);
    if (dropped.length > 0) onAdd(dropped);
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? []);
    if (picked.length > 0) onAdd(picked);
    e.target.value = "";
  }

  return (
    <Stack gap="md">
      {/* Dropzone */}
      <Box
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        style={{
          border: `2px dashed ${dragging ? "var(--color-accent)" : "var(--color-border-dark)"}`,
          borderRadius: 4,
          padding: "32px 16px",
          textAlign: "center",
          cursor: "pointer",
          background: dragging ? "var(--color-accent-light)" : "var(--color-bg-muted)",
          transition: "border-color 150ms, background 150ms",
        }}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt"
          style={{ display: "none" }}
          onChange={handleFileInput}
        />
        <IconUpload size={24} style={{ color: "var(--color-text-muted)", marginBottom: 8 }} />
        <Text size="sm" fw={500} c="var(--color-text-secondary)">
          Drop files here or click to browse
        </Text>
        <Text size="xs" c="var(--color-text-muted)" mt={4}>
          PDFs, Word, Excel, CSV, text files
        </Text>
      </Box>

      {/* File list */}
      {files.length > 0 && (
        <Stack gap={6}>
          {files.map(({ file, id }) => (
            <Group
              key={id}
              gap={10}
              p={10}
              style={{
                background: "var(--color-bg-muted)",
                border: "1px solid var(--color-border)",
              }}
            >
              <Box style={{ color: "var(--color-text-muted)", flexShrink: 0 }}>
                {fileIcon(file)}
              </Box>
              <Box style={{ flex: 1, minWidth: 0 }}>
                <Text size="xs" fw={500} c="var(--color-text-primary)" truncate="end">
                  {file.name}
                </Text>
                <Text size="xs" c="var(--color-text-muted)">
                  {formatBytes(file.size)}
                </Text>
              </Box>
              <ActionIcon
                size="xs"
                variant="subtle"
                color="gray"
                onClick={() => onRemove(id)}
              >
                <IconX size={12} />
              </ActionIcon>
            </Group>
          ))}
        </Stack>
      )}

      <Group justify="space-between" mt="xs">
        <Button
          variant="subtle"
          color="gray"
          leftSection={<IconArrowLeft size={14} />}
          onClick={onBack}
          style={{ fontSize: 13 }}
        >
          Back
        </Button>
        <Group gap={8}>
          <Button
            variant="subtle"
            color="gray"
            onClick={onSubmit}
            loading={isSubmitting}
            disabled={isSubmitting}
            style={{ fontSize: 13 }}
          >
            Skip & Submit
          </Button>
          <Button
            color="accent"
            onClick={onSubmit}
            loading={isSubmitting}
            disabled={isSubmitting}
            style={{ fontSize: 13 }}
          >
            Submit Signal
          </Button>
        </Group>
      </Group>
    </Stack>
  );
}

/* ── Step 3: Success ─────────────────────────────────────────── */

function SuccessStep({ onClose }: { onClose: () => void }) {
  return (
    <Stack align="center" gap={16} py={24}>
      <IconCircleCheck size={56} color="var(--color-success)" style={{ strokeWidth: 1.5 }} />
      <Box ta="center">
        <Text fw={700} size="lg" c="var(--color-text-primary)">
          Signal created
        </Text>
        <Text size="sm" c="var(--color-text-muted)" mt={4} maw={280} mx="auto">
          Your signal has been submitted and is now visible to your team.
        </Text>
      </Box>
      <Button color="accent" onClick={onClose} mt={8} style={{ fontSize: 13 }}>
        Done
      </Button>
    </Stack>
  );
}

/* ── Main Modal ──────────────────────────────────────────────── */

const STEP_TITLES: Record<Step, string> = {
  details: "Create a Signal - Details",
  media: "Create a Signal - Add Media",
  success: "Signal Created",
};

export function CreateSignalModal({ opened, onClose }: CreateSignalModalProps) {
  const [step, setStep] = useState<Step>("details");
  const [form, setForm] = useState<SignalFormData>({ title: "", description: "", locationId: "", sourceId: "", severity: "" });
  const [files, setFiles] = useState<SelectedFile[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { activeTeamId } = useTeam();
  const locationsQuery = api.locations.list.useQuery(undefined, { enabled: opened, staleTime: 1000 * 60 * 10 });
  const sourcesQuery = api.signals.sources.useQuery(undefined, { enabled: opened, staleTime: 1000 * 60 * 10 });
  const createSignal = api.signals.createManual.useMutation();
  const utils = api.useUtils();

  const locationOptions = (locationsQuery.data ?? [])
    .filter((loc) => loc.level <= 2)
    .map((loc) => ({
      value: loc.id,
      label: loc.parent ? `${loc.name} (${loc.parent.name})` : loc.name,
    }));

  const sourceOptions = (sourcesQuery.data ?? [])
    .filter((s) => isManualSourceType(s.type))
    .map((s) => ({
      value: s.id,
      label: isManualSourceType(s.type) ? sourceLabels[s.type] : s.name,
    }));

  // Auto-select source: always prefer field_officer (trusted type required by backend)
  useEffect(() => {
    if (!sourcesQuery.data || form.sourceId) return;
    const sources = sourcesQuery.data;
    const auto =
      sources.find((s) => s.name === "field_officer") ??
      sources.find((s) => s.type === "field_officer") ??
      sources.find((s) => /partner|government/i.test(s.type)) ??
      sources[0];
    if (auto) setForm((p) => ({ ...p, sourceId: auto.id }));
  }, [sourcesQuery.data, form.sourceId]);

  function reset() {
    setStep("details");
    setForm({ title: "", description: "", locationId: "", sourceId: "", severity: "" });
    setFiles([]);
    setErrorMsg(null);
  }

  function handleClose() {
    reset();
    onClose();
  }

  function addFiles(incoming: File[]) {
    setFiles((prev) => [
      ...prev,
      ...incoming.map((f) => ({ file: f, id: `${f.name}-${f.size}-${Date.now()}` })),
    ]);
  }

  function removeFile(id: string) {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  }

  async function handleSubmit() {
    setErrorMsg(null);
    try {
      // Upload files to S3 if any - returns S3 keys (presigned URLs generated at read time)
      let mediaKeys: string[] = [];
      if (files.length > 0) {
        const formData = new FormData();
        files.forEach(({ file }) => formData.append("files", file));

        const uploadResp = await fetch("/api/proxy/upload", {
          method: "POST",
          body: formData,
        });
        if (!uploadResp.ok) {
          throw new Error("File upload failed");
        }
        const uploadData = (await uploadResp.json()) as { keys: string[] };
        mediaKeys = uploadData.keys;
      }

      await createSignal.mutateAsync({
        sourceId: form.sourceId,
        title: form.title.trim(),
        description: form.description.trim() || form.title.trim(),
        locationId: form.locationId || undefined,
        severity: form.severity ? parseInt(form.severity) : undefined,
        mediaUrls: mediaKeys.length > 0 ? mediaKeys : undefined,
      });
      void utils.signals.list.invalidate({ teamId: activeTeamId ?? undefined });
      setStep("success");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to create signal");
    }
  }

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title={
        <Text fw={600} size="sm" c="var(--color-text-primary)">
          {STEP_TITLES[step]}
        </Text>
      }
      size="md"
      centered
    >
      {errorMsg && (
        <Box
          mb="md"
          p={12}
          style={{
            background: "var(--color-critical-light)",
            border: "1px solid #FECACA",
            color: "#B91C1C",
            fontSize: 13,
          }}
        >
          {errorMsg}
        </Box>
      )}

      {step === "details" && (
        <DetailsStep
          form={form}
          setForm={setForm}
          onNext={() => setStep("media")}
          locationOptions={locationOptions}
          locationsLoading={locationsQuery.isLoading}
          sourceOptions={sourceOptions}
          sourcesLoading={sourcesQuery.isLoading}
        />
      )}

      {step === "media" && (
        <MediaStep
          files={files}
          onAdd={addFiles}
          onRemove={removeFile}
          onBack={() => setStep("details")}
          onSubmit={() => void handleSubmit()}
          isSubmitting={createSignal.isPending}
        />
      )}

      {step === "success" && <SuccessStep onClose={handleClose} />}
    </Modal>
  );
}
