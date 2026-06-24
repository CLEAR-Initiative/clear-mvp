"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
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

// labelKey: i18n keys under dashboard.createAlert.severityOptions.* - resolved via t() at render time.
const SEVERITY_OPTIONS = [
  { value: "1", labelKey: "low" },
  { value: "2", labelKey: "moderate" },
  { value: "3", labelKey: "high" },
  { value: "4", labelKey: "veryHigh" },
  { value: "5", labelKey: "critical" },
] as const;

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
  const t = useTranslations("dashboard");
  const sorted = [...events].sort((a, b) => {
    const aDate = new Date(a.lastSignalCreatedAt).getTime();
    const bDate = new Date(b.lastSignalCreatedAt).getTime();
    return bDate - aDate;
  });

  return (
    <Stack gap="md">
      <Text fw={600} size="sm" c="var(--color-text-secondary)">
        {t("createAlert.selectEventsPrompt")}
      </Text>

      {eventsLoading ? (
        <Box py={32} style={{ textAlign: "center" }}>
          <Loader size={24} />
        </Box>
      ) : sorted.length === 0 ? (
        <Alert color="yellow" variant="light">
          <Text size="sm">{t("createAlert.noEvents")}</Text>
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
                      {eventLocations(event)} &bull; {t("createAlert.signalCount", { count: event.signals.length })}
                    </Text>
                  </Box>
                  {event.alerts.length > 0 && (
                    <Badge size="xs" variant="light" color="red" style={{ fontSize: 9, flexShrink: 0 }}>
                      {t("createAlert.alertBadge")}
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
        {t("createAlert.createNewEvent")}
      </Button>

      <Group justify="flex-end" mt="sm">
        <Button
          onClick={onNext}
          disabled={selectedIds.length === 0}
          style={{ background: selectedIds.length > 0 ? "#E85D3D" : undefined }}
        >
          {t("createAlert.nextDetails", { count: selectedIds.length })}
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
  const t = useTranslations("dashboard");
  const tActions = useTranslations("common.actions");
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
      setErrorMsg(err instanceof Error ? err.message : t("createAlert.errors.createEvent"));
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
      setErrorMsg(err instanceof Error ? err.message : t("createAlert.errors.createSignal"));
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
          {t("createAlert.backToEvents")}
        </Button>
      </Group>

      <Text fw={600} size="sm" c="var(--color-text-secondary)">
        {t("createAlert.selectSignalsPrompt")}
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
          <Text size="sm">{t("createAlert.noAvailableSignals")}</Text>
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
                      {t("createAlert.sourceLabel", { name: signal.source.name })}
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
            {t("createAlert.createManualSignal")}
          </Button>
        </Group>
      )}

      {/* Manual signal creation form */}
      {showManualSignal && (
        <Box>
          <Divider mb={8} />
          <Text style={LABEL_STYLE} mb={8}>
            {t("createAlert.createManualSignal")}
          </Text>
          <Stack gap={8}>
            <Select
              label={<Text style={LABEL_STYLE}>{t("createAlert.fieldDataSource")}</Text>}
              placeholder={t("createAlert.dataSourcePlaceholder")}
              data={sourceOptions}
              value={manualSourceId}
              onChange={setManualSourceId}
              required
            />
            <TextInput
              label={<Text style={LABEL_STYLE}>{t("createAlert.fieldTitle")}</Text>}
              placeholder={t("createAlert.titlePlaceholder")}
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
                {t("createAlert.createSignal")}
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
                {tActions("cancel")}
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
          {t("createAlert.createEventCount", { count: selectedSignalIds.length })}
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
  const t = useTranslations("dashboard");
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
          {t("createAlert.backToEvents")}
        </Button>
      </Group>

      {/* Selected events summary */}
      <Box>
        <Text style={LABEL_STYLE} mb={8}>
          {t("createAlert.selectedEvents", { count: selectedEvents.length })}
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
        label={<Text style={LABEL_STYLE}>{t("createAlert.fieldAlertTitle")}</Text>}
        placeholder={t("createAlert.alertTitlePlaceholder")}
        value={form.title}
        onChange={(e) => setForm((prev) => ({ ...prev, title: e.currentTarget.value }))}
        required
      />

      <Textarea
        label={<Text style={LABEL_STYLE}>{t("createAlert.fieldDescription")}</Text>}
        placeholder={t("createAlert.descriptionPlaceholder")}
        value={form.description}
        onChange={(e) => setForm((prev) => ({ ...prev, description: e.currentTarget.value }))}
        minRows={3}
        required
      />

      <Group grow>
        <Select
          label={<Text style={LABEL_STYLE}>{t("createAlert.fieldSeverity")}</Text>}
          placeholder={t("createAlert.severityPlaceholder")}
          data={SEVERITY_OPTIONS.map((o) => ({ value: o.value, label: t(`createAlert.severityOptions.${o.labelKey}`) }))}
          value={form.severity}
          onChange={(v) => setForm((prev) => ({ ...prev, severity: v ?? "" }))}
          required
          comboboxProps={{ zIndex: 1000 }}
        />

        <Box>
          <Text style={LABEL_STYLE} mb={5}>
            {t("createAlert.fieldStatus")}
          </Text>
          <SegmentedControl
            value={form.status}
            onChange={(v) => setForm((prev) => ({ ...prev, status: v as "draft" | "published" }))}
            data={[
              { value: "draft", label: t("createAlert.statusDraft") },
              { value: "published", label: t("createAlert.statusPublished") },
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
        {t("createAlert.submit")}
      </Button>
    </Stack>
  );
}

/* ========== Main Modal ========== */

export function CreateAlertModal({ opened, onClose }: CreateAlertModalProps) {
  const t = useTranslations("dashboard");
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
      setSuccessMsg(t("createAlert.success"));
      await utils.alerts.getAlerts.invalidate();
      await utils.alerts.getStats.invalidate();
      setTimeout(() => {
        handleClose();
      }, 1000);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : t("createAlert.errors.createAlert"));
    }
  }

  const stepTitles: Record<Step, string> = {
    "select-events": t("createAlert.steps.selectEvents"),
    "create-event": t("createAlert.steps.createEvent"),
    "alert-details": t("createAlert.steps.details"),
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
