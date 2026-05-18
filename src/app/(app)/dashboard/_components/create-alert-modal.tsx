"use client";

import { useState } from "react";
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
  Badge,
  Checkbox,
  Alert,
  Divider,
  Loader,
  SegmentedControl,
} from "@mantine/core";
import { IconAlertTriangle, IconPlus, IconArrowLeft } from "@tabler/icons-react";
import { api } from "~/trpc/react";
import { useTeam } from "~/providers/team-provider";
import type { GqlEvent, GqlSignal } from "~/lib/types/graphql";

/* ========== Types ========== */

type Step = "select-events" | "create-event" | "alert-details";

interface AlertFormData {
  title: string;
  description: string;
  severity: string;
  status: "draft" | "published";
  selectedEventIds: string[];
}

interface CreateAlertModalProps {
  opened: boolean;
  onClose: () => void;
}

/* ========== Severity Options ========== */

const SEVERITY_OPTIONS = [
  { value: "1", label: "1 - Low" },
  { value: "2", label: "2 - Moderate" },
  { value: "3", label: "3 - High" },
  { value: "4", label: "4 - Very High" },
  { value: "5", label: "5 - Critical" },
];

const LABEL_STYLE = {
  fontSize: 11,
  fontWeight: 600,
  textTransform: "uppercase" as const,
  letterSpacing: "0.5px",
  color: "var(--color-text-muted)",
};

/* ========== Helpers ========== */

function eventDisplayTitle(event: GqlEvent): string {
  if (event.title) return event.title;
  if (event.description) return event.description;
  const loc = (event.generalLocation ?? event.originLocation)?.name;
  return loc ? `${event.types[0] ?? "Event"} - ${loc}` : (event.types[0] ?? "Event");
}

function eventLocations(event: GqlEvent): string {
  const loc = event.generalLocation ?? event.originLocation ?? event.destinationLocation;
  return loc?.name ?? "Unknown";
}

function signalDisplayTitle(signal: GqlSignal): string {
  return signal.title ?? signal.source.name ?? "Untitled Signal";
}

/* ========== Event Selection Step ========== */

function EventSelectionStep({
  events,
  eventsLoading,
  selectedIds,
  onToggle,
  onCreateEvent,
  onNext,
}: {
  events: GqlEvent[];
  eventsLoading: boolean;
  selectedIds: string[];
  onToggle: (id: string) => void;
  onCreateEvent: () => void;
  onNext: () => void;
}) {
  const sorted = [...events].sort((a, b) => {
    const aDate = new Date(a.lastSignalCreatedAt).getTime();
    const bDate = new Date(b.lastSignalCreatedAt).getTime();
    return bDate - aDate;
  });

  return (
    <Stack gap="md">
      <Text fw={600} size="sm" c="var(--color-text-secondary)">
        Select events to include in the alert
      </Text>

      {eventsLoading ? (
        <Box py={32} style={{ textAlign: "center" }}>
          <Loader size={24} />
        </Box>
      ) : sorted.length === 0 ? (
        <Alert color="yellow" variant="light">
          <Text size="sm">No events found. Create an event first.</Text>
        </Alert>
      ) : (
        <Stack gap={6} style={{ maxHeight: 340, overflowY: "auto" }}>
          {sorted.map((event) => {
            const isSelected = selectedIds.includes(event.id);
            return (
              <Box
                key={event.id}
                p={10}
                onClick={() => onToggle(event.id)}
                className="cursor-pointer transition-colors"
                style={{
                  border: isSelected ? "2px solid var(--color-accent)" : "1px solid var(--color-border)",
                  background: isSelected ? "var(--color-accent-light)" : "var(--color-bg-muted)",
                }}
              >
                <Group gap={10} wrap="nowrap">
                  <Checkbox
                    checked={isSelected}
                    onChange={() => onToggle(event.id)}
                    size="xs"
                    color="red"
                    styles={{ input: { cursor: "pointer" } }}
                  />
                  <Box style={{ flex: 1, minWidth: 0 }}>
                    <Text fw={600} style={{ fontSize: 13 }} lineClamp={1}>
                      {eventDisplayTitle(event)}
                    </Text>
                    <Text c="var(--color-text-muted)" style={{ fontSize: 11 }}>
                      {eventLocations(event)} &bull; {event.signals.length} signal{event.signals.length !== 1 ? "s" : ""}
                    </Text>
                  </Box>
                  {event.alerts.length > 0 && (
                    <Badge size="xs" variant="light" color="red" style={{ fontSize: 9, flexShrink: 0 }}>
                      Alert
                    </Badge>
                  )}
                </Group>
              </Box>
            );
          })}
        </Stack>
      )}

      <Button
        variant="outline"
        color="gray"
        size="sm"
        leftSection={<IconPlus size={14} />}
        onClick={onCreateEvent}
      >
        Create New Event
      </Button>

      <Group justify="flex-end" mt="sm">
        <Button
          onClick={onNext}
          disabled={selectedIds.length === 0}
          style={{ background: selectedIds.length > 0 ? "#E85D3D" : undefined }}
        >
          Next: Alert Details ({selectedIds.length} selected)
        </Button>
      </Group>
    </Stack>
  );
}

/* ========== Create Event Sub-Flow ========== */

function CreateEventSubFlow({
  onBack,
  onCreated,
}: {
  onBack: () => void;
  onCreated: (eventId: string) => void;
}) {
  const { activeTeamId } = useTeam();
  const signalsQuery = api.signals.list.useQuery({ teamId: activeTeamId });
  const sourcesQuery = api.signals.sources.useQuery();
  const createSignalMutation = api.signals.create.useMutation();
  const createEventMutation = api.events.create.useMutation();

  const [selectedSignalIds, setSelectedSignalIds] = useState<string[]>([]);
  const [showManualSignal, setShowManualSignal] = useState(false);
  const [manualTitle, setManualTitle] = useState("");
  const [manualSourceId, setManualSourceId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const signals = signalsQuery.data ?? [];
  const availableSignals = signals.filter((s) => s.events.length === 0);
  const sourceOptions = (sourcesQuery.data ?? []).map((s) => ({ value: s.id, label: s.name }));

  function toggleSignal(id: string) {
    setSelectedSignalIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  async function handleCreateEvent() {
    if (selectedSignalIds.length === 0) return;
    setErrorMsg(null);
    try {
      const result = await createEventMutation.mutateAsync({
        signalIds: selectedSignalIds,
      });
      onCreated(result.id);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to create event");
    }
  }

  async function handleCreateManualSignal() {
    if (!manualTitle.trim() || !manualSourceId) return;
    setErrorMsg(null);
    try {
      const newSignal = await createSignalMutation.mutateAsync({
        sourceId: manualSourceId,
        title: manualTitle.trim(),
      });
      setSelectedSignalIds((prev) => [...prev, newSignal.id]);
      setManualTitle("");
      setShowManualSignal(false);
      await signalsQuery.refetch();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to create signal");
    }
  }

  const isCreatingManual = createSignalMutation.isPending;

  return (
    <Stack gap="md">
      <Group gap={8}>
        <Button
          variant="subtle"
          color="gray"
          size="xs"
          leftSection={<IconArrowLeft size={14} />}
          onClick={onBack}
        >
          Back to Events
        </Button>
      </Group>

      <Text fw={600} size="sm" c="var(--color-text-secondary)">
        Select signals to group into a new event
      </Text>

      {errorMsg && (
        <Alert color="red" variant="light" onClose={() => setErrorMsg(null)} withCloseButton>
          {errorMsg}
        </Alert>
      )}

      {signalsQuery.isLoading ? (
        <Box py={16} style={{ textAlign: "center" }}>
          <Loader size={20} />
        </Box>
      ) : availableSignals.length === 0 && !showManualSignal ? (
        <Alert color="yellow" variant="light">
          <Text size="sm">No available signals. Create one below.</Text>
        </Alert>
      ) : (
        <Stack gap={4} style={{ maxHeight: 200, overflowY: "auto" }}>
          {availableSignals.map((signal) => {
            const isSelected = selectedSignalIds.includes(signal.id);
            return (
              <Box
                key={signal.id}
                p={8}
                onClick={() => toggleSignal(signal.id)}
                className="cursor-pointer transition-colors"
                style={{
                  border: isSelected ? "2px solid var(--color-accent)" : "1px solid var(--color-border)",
                  background: isSelected ? "var(--color-accent-light)" : "var(--color-bg-muted)",
                }}
              >
                <Group gap={8} wrap="nowrap">
                  <Checkbox
                    checked={isSelected}
                    onChange={() => toggleSignal(signal.id)}
                    size="xs"
                    color="red"
                    styles={{ input: { cursor: "pointer" } }}
                  />
                  <Box style={{ flex: 1, minWidth: 0 }}>
                    <Text fw={500} style={{ fontSize: 12 }} lineClamp={1}>
                      {signalDisplayTitle(signal)}
                    </Text>
                    <Text c="var(--color-text-muted)" style={{ fontSize: 10 }}>
                      Source: {signal.source.name}
                    </Text>
                  </Box>
                </Group>
              </Box>
            );
          })}
        </Stack>
      )}

      {/* Action buttons */}
      {!showManualSignal && (
        <Group gap={8}>
          <Button
            variant="outline"
            color="gray"
            size="xs"
            leftSection={<IconPlus size={12} />}
            onClick={() => setShowManualSignal(true)}
          >
            Create Manual Signal
          </Button>
        </Group>
      )}

      {/* Manual signal creation form */}
      {showManualSignal && (
        <Box>
          <Divider mb={8} />
          <Text style={LABEL_STYLE} mb={8}>
            Create Manual Signal
          </Text>
          <Stack gap={8}>
            <Select
              label={<Text style={LABEL_STYLE}>Data Source</Text>}
              placeholder="Select data source"
              data={sourceOptions}
              value={manualSourceId}
              onChange={setManualSourceId}
              required
            />
            <TextInput
              label={<Text style={LABEL_STYLE}>Title</Text>}
              placeholder="e.g., Cholera outbreak in El Fasher"
              value={manualTitle}
              onChange={(e) => setManualTitle(e.currentTarget.value)}
              required
            />
            <Group gap={8}>
              <Button
                size="xs"
                onClick={() => void handleCreateManualSignal()}
                disabled={!manualTitle.trim() || !manualSourceId || isCreatingManual}
                loading={isCreatingManual}
                style={{ background: manualTitle.trim() ? "#E85D3D" : undefined }}
              >
                Create Signal
              </Button>
              <Button
                variant="subtle"
                color="gray"
                size="xs"
                onClick={() => {
                  setShowManualSignal(false);
                  setManualTitle("");
                }}
              >
                Cancel
              </Button>
            </Group>
          </Stack>
        </Box>
      )}

      <Group justify="flex-end" mt="sm">
        <Button
          onClick={() => void handleCreateEvent()}
          disabled={selectedSignalIds.length === 0 || createEventMutation.isPending}
          loading={createEventMutation.isPending}
          style={{ background: selectedSignalIds.length > 0 ? "#E85D3D" : undefined }}
        >
          Create Event ({selectedSignalIds.length} signal{selectedSignalIds.length !== 1 ? "s" : ""})
        </Button>
      </Group>
    </Stack>
  );
}

/* ========== Alert Details Step ========== */

function AlertDetailsStep({
  form,
  setForm,
  events,
  onBack,
  onSubmit,
  isSubmitting,
}: {
  form: AlertFormData;
  setForm: React.Dispatch<React.SetStateAction<AlertFormData>>;
  events: GqlEvent[];
  onBack: () => void;
  onSubmit: () => void;
  isSubmitting: boolean;
}) {
  const selectedEvents = events.filter((e) =>
    form.selectedEventIds.includes(e.id),
  );

  const isValid =
    form.title.trim().length > 0 &&
    form.description.trim().length > 0 &&
    form.severity !== "" &&
    form.selectedEventIds.length > 0;

  return (
    <Stack gap="md">
      <Group gap={8}>
        <Button
          variant="subtle"
          color="gray"
          size="xs"
          leftSection={<IconArrowLeft size={14} />}
          onClick={onBack}
        >
          Back to Events
        </Button>
      </Group>

      {/* Selected events summary */}
      <Box>
        <Text style={LABEL_STYLE} mb={8}>
          Selected Events ({selectedEvents.length})
        </Text>
        <Group gap={4}>
          {selectedEvents.map((event) => (
            <Badge
              key={event.id}
              size="sm"
              variant="light"
              color="red"
              style={{ fontSize: 10 }}
            >
              {eventDisplayTitle(event)}
            </Badge>
          ))}
        </Group>
      </Box>

      <Divider />

      <TextInput
        label={<Text style={LABEL_STYLE}>Alert Title</Text>}
        placeholder="e.g., Darfur Humanitarian Crisis Alert"
        value={form.title}
        onChange={(e) => setForm((prev) => ({ ...prev, title: e.currentTarget.value }))}
        required
      />

      <Textarea
        label={<Text style={LABEL_STYLE}>Description</Text>}
        placeholder="Describe the alert, its context, and recommended actions..."
        value={form.description}
        onChange={(e) => setForm((prev) => ({ ...prev, description: e.currentTarget.value }))}
        minRows={3}
        required
      />

      <Group grow>
        <Select
          label={<Text style={LABEL_STYLE}>Severity</Text>}
          placeholder="Select severity"
          data={SEVERITY_OPTIONS}
          value={form.severity}
          onChange={(v) => setForm((prev) => ({ ...prev, severity: v ?? "" }))}
          required
          comboboxProps={{ zIndex: 1000 }}
        />

        <Box>
          <Text style={LABEL_STYLE} mb={5}>
            Status
          </Text>
          <SegmentedControl
            value={form.status}
            onChange={(v) => setForm((prev) => ({ ...prev, status: v as "draft" | "published" }))}
            data={[
              { value: "draft", label: "Draft" },
              { value: "published", label: "Published" },
            ]}
            fullWidth
            size="xs"
          />
        </Box>
      </Group>

      <Button
        fullWidth
        onClick={onSubmit}
        disabled={!isValid || isSubmitting}
        loading={isSubmitting}
        mt="sm"
        style={{ background: isValid ? "#E85D3D" : undefined }}
        leftSection={<IconAlertTriangle size={16} />}
      >
        Create Alert
      </Button>
    </Stack>
  );
}

/* ========== Main Modal ========== */

export function CreateAlertModal({ opened, onClose }: CreateAlertModalProps) {
  const [step, setStep] = useState<Step>("select-events");
  const [form, setForm] = useState<AlertFormData>({
    title: "",
    description: "",
    severity: "",
    status: "draft",
    selectedEventIds: [],
  });
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const { activeTeamId } = useTeam();
  const eventsQuery = api.events.list.useQuery({ teamId: activeTeamId }, { enabled: opened });
  const createAlertMutation = api.alerts.createAlert.useMutation();
  const utils = api.useUtils();

  function reset() {
    setStep("select-events");
    setForm({
      title: "",
      description: "",
      severity: "",
      status: "draft",
      selectedEventIds: [],
    });
    setErrorMsg(null);
    setSuccessMsg(null);
  }

  function handleClose() {
    reset();
    onClose();
  }

  function toggleEventId(id: string) {
    setForm((prev) => ({
      ...prev,
      selectedEventIds: prev.selectedEventIds.includes(id)
        ? prev.selectedEventIds.filter((x) => x !== id)
        : [...prev.selectedEventIds, id],
    }));
  }

  function handleEventCreated(eventId: string) {
    setForm((prev) => ({
      ...prev,
      selectedEventIds: [...prev.selectedEventIds, eventId],
    }));
    setStep("select-events");
    void eventsQuery.refetch();
  }

  async function handleSubmit() {
    setErrorMsg(null);
    try {
      await createAlertMutation.mutateAsync({
        title: form.title.trim(),
        description: form.description.trim(),
        severity: Number(form.severity),
        status: form.status,
        eventIds: form.selectedEventIds,
      });
      setSuccessMsg("Alert created successfully!");
      await utils.alerts.getAlerts.invalidate();
      await utils.alerts.getStats.invalidate();
      setTimeout(() => {
        handleClose();
      }, 1000);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to create alert");
    }
  }

  const stepTitles: Record<Step, string> = {
    "select-events": "Create Alert - Select Events",
    "create-event": "Create Alert - New Event",
    "alert-details": "Create Alert - Details",
  };

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title={
        <Text fw={600} size="sm">
          {stepTitles[step]}
        </Text>
      }
      size="lg"
      centered
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

      {step === "select-events" && (
        <EventSelectionStep
          events={eventsQuery.data ?? []}
          eventsLoading={eventsQuery.isLoading}
          selectedIds={form.selectedEventIds}
          onToggle={toggleEventId}
          onCreateEvent={() => setStep("create-event")}
          onNext={() => setStep("alert-details")}
        />
      )}

      {step === "create-event" && (
        <CreateEventSubFlow
          onBack={() => setStep("select-events")}
          onCreated={handleEventCreated}
        />
      )}

      {step === "alert-details" && (
        <AlertDetailsStep
          form={form}
          setForm={setForm}
          events={eventsQuery.data ?? []}
          onBack={() => setStep("select-events")}
          onSubmit={() => void handleSubmit()}
          isSubmitting={createAlertMutation.isPending}
        />
      )}
    </Modal>
  );
}
