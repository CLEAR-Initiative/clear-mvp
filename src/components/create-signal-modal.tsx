"use client";

import { useState, useRef } from "react";
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
  IconPhoto,
  IconVideo,
  IconArrowRight,
  IconArrowLeft,
} from "@tabler/icons-react";
import { api } from "~/trpc/react";
import { useTeam } from "~/providers/team-provider";

type Step = "details" | "media" | "success";

interface SignalFormData {
  title: string;
  description: string;
  locationId: string;
}

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

function fileIcon(file: File) {
  if (file.type.startsWith("image/")) return <IconPhoto size={14} />;
  if (file.type.startsWith("video/")) return <IconVideo size={14} />;
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
}: {
  form: SignalFormData;
  setForm: React.Dispatch<React.SetStateAction<SignalFormData>>;
  onNext: () => void;
  locationOptions: { value: string; label: string }[];
  locationsLoading: boolean;
}) {
  const isValid = form.title.trim().length > 0;

  return (
    <Stack gap="md">
      <TextInput
        label={<Text style={LABEL_STYLE}>Title *</Text>}
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
          accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx"
          style={{ display: "none" }}
          onChange={handleFileInput}
        />
        <IconUpload size={24} style={{ color: "var(--color-text-muted)", marginBottom: 8 }} />
        <Text size="sm" fw={500} c="#525252">
          Drop files here or click to browse
        </Text>
        <Text size="xs" c="#A3A3A3" mt={4}>
          Photos, videos, PDFs, documents
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
                <Text size="xs" fw={500} c="#171717" truncate="end">
                  {file.name}
                </Text>
                <Text size="xs" c="#A3A3A3">
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
        <Text fw={700} size="lg" c="#171717">
          Signal created
        </Text>
        <Text size="sm" c="#737373" mt={4} maw={280} mx="auto">
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
  details: "Create a Signal — Details",
  media: "Create a Signal — Add Media",
  success: "Signal Created",
};

export function CreateSignalModal({ opened, onClose }: CreateSignalModalProps) {
  const [step, setStep] = useState<Step>("details");
  const [form, setForm] = useState<SignalFormData>({ title: "", description: "", locationId: "" });
  const [files, setFiles] = useState<SelectedFile[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { activeTeamId } = useTeam();
  const locationsQuery = api.locations.list.useQuery(undefined, { enabled: opened, staleTime: 1000 * 60 * 10 });
  const createSignal = api.signals.create.useMutation();
  const utils = api.useUtils();

  const locationOptions = (locationsQuery.data ?? []).map((loc) => ({
    value: loc.id,
    label: loc.parent ? `${loc.name} (${loc.parent.name})` : loc.name,
  }));

  function reset() {
    setStep("details");
    setForm({ title: "", description: "", locationId: "" });
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
      await createSignal.mutateAsync({
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        locationId: form.locationId || undefined,
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
        <Text fw={600} size="sm" c="#171717">
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
