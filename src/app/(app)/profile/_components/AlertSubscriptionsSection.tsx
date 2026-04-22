"use client";

import { useState } from "react";
import {
  Card,
  Text,
  Group,
  Stack,
  Box,
  Button,
  Badge,
  MultiSelect,
  Select,
  ActionIcon,
  Loader,
  Popover,
  Checkbox,
  UnstyledButton,
  Collapse,
  ScrollArea,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
  IconBellRinging,
  IconPlus,
  IconTrash,
  IconCheck,
  IconChevronRight,
  IconChevronDown,
} from "@tabler/icons-react";
import { api } from "~/trpc/react";
import { getDisasterLabel } from "~/lib/disaster-types";
import { severityLabels } from "~/lib/constants/severity";

const FREQUENCY_LABELS: Record<string, string> = {
  immediately: "Immediately",
  daily: "Daily digest",
  weekly: "Weekly digest",
  monthly: "Monthly digest",
};

export function AlertSubscriptionsSection() {
  const utils = api.useUtils();
  const subsQuery = api.subscriptions.list.useQuery();
  const disasterTypesQuery = api.subscriptions.disasterTypes.useQuery();
  const hierarchyQuery = api.subscriptions.disasterTypeHierarchy.useQuery();
  const locationsQuery = api.subscriptions.locations.useQuery();

  const [showForm, setShowForm] = useState(false);
  const [formLocationIds, setFormLocationIds] = useState<string[]>([]);
  const [formAlertTypes, setFormAlertTypes] = useState<string[]>([]);
  const [formSeverities, setFormSeverities] = useState<string[]>(["critical", "high"]);
  const [formFrequency, setFormFrequency] = useState<string | null>("immediately");

  const subscribeBatchMutation = api.subscriptions.subscribeBatch.useMutation({
    onSuccess: (created) => {
      notifications.show({
        title: "Subscribed",
        message: `Created ${created.length} subscription${created.length === 1 ? "" : "s"}.`,
        color: "green",
      });
      void utils.subscriptions.list.invalidate();
      setShowForm(false);
      setFormLocationIds([]);
      setFormAlertTypes([]);
      setFormSeverities(["critical", "high"]);
    },
    onError: (err) => {
      notifications.show({ title: "Error", message: err.message, color: "red" });
    },
  });

  const unsubscribeMutation = api.subscriptions.unsubscribe.useMutation({
    onSuccess: () => {
      notifications.show({ title: "Unsubscribed", message: "Subscription removed.", color: "gray" });
      void utils.subscriptions.list.invalidate();
    },
  });

  const toggleMutation = api.subscriptions.update.useMutation({
    onSuccess: () => {
      void utils.subscriptions.list.invalidate();
    },
  });

  const subscriptions = subsQuery.data ?? [];
  const disasterTypes = disasterTypesQuery.data ?? [];
  const hierarchy = hierarchyQuery.data ?? [];
  const locations = locationsQuery.data ?? [];

  // Map glide code → level-2 name for rendering subscription rows.
  // Falls back to getDisasterLabel() if the hierarchy hasn't loaded yet.
  const codeToTypeName: Record<string, string> = {};
  for (const l1 of hierarchy) {
    for (const l2 of l1.groups) {
      for (const code of l2.codes) {
        codeToTypeName[code.toLowerCase()] = l2.name;
      }
    }
  }
  const labelFor = (code: string): string => {
    const name = codeToTypeName[code.toLowerCase()];
    if (name) {
      // Capitalise first letter of each word for display
      return name.replace(/\b\w/g, (c) => c.toUpperCase());
    }
    return getDisasterLabel(code);
  };

  const LEVEL_GROUP: Record<number, string> = {
    0: "Country",
    1: "State",
    2: "District",
  };

  const locationOptions = [0, 1, 2].flatMap((level) => {
    const items = locations
      .filter((l) => l.level === level)
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((l) => ({ value: l.id, label: l.name }));
    return items.length > 0 ? [{ group: LEVEL_GROUP[level]!, items }] : [];
  });

  /**
   * State for the alert-type tree picker stores *only* level-2 keys of the
   * form "<l1>::<l2>". Level-1 selection is derived from its children:
   *   - "checked" if every child is in the set
   *   - "indeterminate" if some children are in the set
   *   - "unchecked" otherwise
   */
  const l2KeysForL1 = (l1Name: string): string[] => {
    const l1 = hierarchy.find((h) => h.name === l1Name);
    return l1?.groups.map((l2) => `${l1Name}::${l2.name}`) ?? [];
  };

  const isL2Selected = (l1Name: string, l2Name: string): boolean => {
    return formAlertTypes.includes(`${l1Name}::${l2Name}`);
  };

  const getL1State = (l1Name: string): "all" | "some" | "none" => {
    const children = l2KeysForL1(l1Name);
    if (children.length === 0) return "none";
    const selected = children.filter((k) => formAlertTypes.includes(k));
    if (selected.length === 0) return "none";
    if (selected.length === children.length) return "all";
    return "some";
  };

  const toggleL1 = (l1Name: string) => {
    const children = l2KeysForL1(l1Name);
    setFormAlertTypes((prev) => {
      const state = getL1State(l1Name);
      if (state === "all") {
        // Uncheck everything in this L1
        return prev.filter((k) => !children.includes(k));
      }
      // Otherwise (none/some): select all children
      return [...new Set([...prev, ...children])];
    });
  };

  const toggleL2 = (l1Name: string, l2Name: string) => {
    const key = `${l1Name}::${l2Name}`;
    setFormAlertTypes((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  };

  const expandSelectionsToCodes = (selections: string[]): string[] => {
    const codes = new Set<string>();
    for (const value of selections) {
      // value is always "<l1>::<l2>"
      const [l1Name, l2Name] = value.split("::");
      const l1 = hierarchy.find((h) => h.name === l1Name);
      const l2 = l1?.groups.find((g) => g.name === l2Name);
      l2?.codes.forEach((c) => codes.add(c));
    }
    return [...codes];
  };

  const handleSubscribe = async () => {
    if (formLocationIds.length === 0 || formAlertTypes.length === 0 || !formFrequency) return;

    const resolvedTypes = expandSelectionsToCodes(formAlertTypes);
    if (resolvedTypes.length === 0) {
      notifications.show({
        title: "No disaster types selected",
        message: "Please select at least one disaster type or category.",
        color: "red",
      });
      return;
    }

    // Map string severity labels to the lowest integer minSeverity among selections
    // critical=5, high=4, medium=3, low=2. If multiple selected, use the lowest
    // threshold so more events match. Default to high (4).
    const SEVERITY_TO_INT: Record<string, number> = {
      critical: 5,
      high: 4,
      medium: 3,
      low: 2,
    };
    const minSeverity = formSeverities.length > 0
      ? Math.min(...formSeverities.map((s) => SEVERITY_TO_INT[s] ?? 4))
      : 4;

    try {
      await subscribeBatchMutation.mutateAsync({
        locationIds: formLocationIds,
        alertTypes: resolvedTypes,
        channel: "email" as const,
        frequency: formFrequency as "immediately" | "daily" | "weekly" | "monthly",
        minSeverity,
      });
    } catch {
      // Error already shown by onError handler
    }
  };

  // Group subscriptions by location for display
  const groupedByLocation = subscriptions.reduce<Record<string, typeof subscriptions>>((acc, sub) => {
    const locName = sub.location.name;
    if (!acc[locName]) acc[locName] = [];
    acc[locName].push(sub);
    return acc;
  }, {});

  return (
    <Card p="lg" mb={16} style={{ border: "1px solid #E5E5E5" }}>
      <Group gap={8} mb={16} justify="space-between">
        <Group gap={8}>
          <IconBellRinging size={18} color="#E85D3D" />
          <Text fw={700} size="sm" tt="uppercase" style={{ letterSpacing: "0.05em", fontSize: 11 }}>
            Alert Subscriptions
          </Text>
          {subscriptions.length > 0 && (
            <Badge size="xs" color="teal" variant="light">{subscriptions.length}</Badge>
          )}
        </Group>
        {!showForm && (
          <Button
            size="xs"
            variant="light"
            color="dark"
            leftSection={<IconPlus size={12} />}
            onClick={() => setShowForm(true)}
          >
            Add
          </Button>
        )}
      </Group>

      {/* New subscription form */}
      {showForm && (
        <Card p="sm" mb={16} style={{ background: "#F9FAFB", border: "1px solid #E5E5E5" }}>
          <Text size="xs" fw={600} mb={8} tt="uppercase" style={{ letterSpacing: "0.05em", fontSize: 10 }}>
            New Subscription
          </Text>
          <Stack gap={8}>
            <MultiSelect
              label="Locations"
              placeholder="Select one or more locations"
              data={locationOptions}
              value={formLocationIds}
              onChange={setFormLocationIds}
              searchable
              size="xs"
              maxDropdownHeight={200}
              styles={{ groupLabel: { paddingTop: 12, paddingBottom: 4 } }}
            />
            <AlertTypeTreePicker
              hierarchy={hierarchy}
              selected={formAlertTypes}
              onToggleL1={toggleL1}
              onToggleL2={toggleL2}
              getL1State={getL1State}
              isL2Selected={isL2Selected}
            />
            <MultiSelect
              label="Minimum Severity"
              placeholder="Select severity levels"
              data={[
                { value: "critical", label: severityLabels.critical! },
                { value: "high", label: severityLabels.high! },
                { value: "medium", label: severityLabels.medium! },
                { value: "low", label: severityLabels.low! },
              ]}
              value={formSeverities}
              onChange={setFormSeverities}
              size="xs"
            />
            <Select
              label="Frequency"
              data={[
                { value: "immediately", label: "Immediately" },
                { value: "daily", label: "Daily digest" },
                { value: "weekly", label: "Weekly digest" },
                { value: "monthly", label: "Monthly digest" },
              ]}
              value={formFrequency}
              onChange={setFormFrequency}
              size="xs"
            />
            <Group gap={8} justify="flex-end">
              <Button size="xs" variant="subtle" color="gray" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
              <Button
                size="xs"
                color="dark"
                leftSection={<IconCheck size={12} />}
                loading={subscribeBatchMutation.isPending}
                disabled={formLocationIds.length === 0 || formAlertTypes.length === 0}
                onClick={() => void handleSubscribe()}
              >
                Subscribe ({formLocationIds.length} × {formAlertTypes.length})
              </Button>
            </Group>
          </Stack>
        </Card>
      )}

      {/* Subscription list */}
      {subsQuery.isLoading ? (
        <Box py={16} style={{ textAlign: "center" }}>
          <Loader size={16} />
        </Box>
      ) : subscriptions.length === 0 ? (
        <Text size="sm" c="#737373">
          No alert subscriptions yet. Click &quot;Add&quot; to subscribe to alerts for specific locations and types.
        </Text>
      ) : (
        <Stack gap={12}>
          {Object.entries(groupedByLocation).map(([locName, subs]) => (
            <Box key={locName}>
              <Text size="xs" fw={600} c="#525252" mb={4}>{locName}</Text>
              <Stack gap={4}>
                {subs.map((sub) => (
                  <Group
                    key={sub.id}
                    justify="space-between"
                    px={8}
                    py={6}
                    style={{
                      border: "1px solid #E5E5E5",
                      background: sub.active ? "#fff" : "#F5F5F5",
                      opacity: sub.active ? 1 : 0.6,
                    }}
                  >
                    <Group gap={6}>
                      <Badge size="xs" variant="light" color="blue">{labelFor(sub.alertType)}</Badge>
                      <Text size="xs" c="#737373">
                        {FREQUENCY_LABELS[sub.frequency] ?? sub.frequency}
                      </Text>
                    </Group>
                    <Group gap={4}>
                      <Button
                        size="compact-xs"
                        variant="subtle"
                        color={sub.active ? "gray" : "teal"}
                        onClick={() => toggleMutation.mutate({ id: sub.id, active: !sub.active })}
                        style={{ fontSize: 10 }}
                      >
                        {sub.active ? "Pause" : "Resume"}
                      </Button>
                      <ActionIcon
                        size="xs"
                        variant="subtle"
                        color="red"
                        onClick={() => unsubscribeMutation.mutate({ id: sub.id })}
                      >
                        <IconTrash size={12} />
                      </ActionIcon>
                    </Group>
                  </Group>
                ))}
              </Stack>
            </Box>
          ))}
        </Stack>
      )}
    </Card>
  );
}

/* ──────────────────────────────────────────────────────────────────────
 * Alert-type tree picker
 *
 * Shows a button that opens a popover with a hierarchical list:
 *   - Top level: level-1 categories (collapsed by default)
 *   - Expandable: reveals level-2 children
 *   - Clicking an L1 checkbox = select/deselect all its L2 children
 *   - Clicking an L2 checkbox = toggle just that level-2
 *   - L1 checkbox shows indeterminate state when some children selected
 * ────────────────────────────────────────────────────────────────────── */

interface HierarchyLevel1 {
  name: string;
  groups: Array<{ name: string; codes: string[] }>;
}

function AlertTypeTreePicker({
  hierarchy,
  selected,
  onToggleL1,
  onToggleL2,
  getL1State,
  isL2Selected,
}: {
  hierarchy: HierarchyLevel1[];
  selected: string[];
  onToggleL1: (l1Name: string) => void;
  onToggleL2: (l1Name: string, l2Name: string) => void;
  getL1State: (l1Name: string) => "all" | "some" | "none";
  isL2Selected: (l1Name: string, l2Name: string) => boolean;
}) {
  const [opened, setOpened] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggleExpand = (l1Name: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(l1Name)) next.delete(l1Name);
      else next.add(l1Name);
      return next;
    });
  };

  const summary = selected.length === 0
    ? "Select one or more disaster types"
    : `${selected.length} type${selected.length === 1 ? "" : "s"} selected`;

  return (
    <Box>
      <Text size="xs" fw={500} mb={4} c="#525252">
        Alert Types
      </Text>
      <Popover
        opened={opened}
        onChange={setOpened}
        width="target"
        position="bottom-start"
        shadow="md"
        withinPortal
      >
        <Popover.Target>
          <UnstyledButton
            onClick={() => setOpened((o) => !o)}
            style={{
              display: "block",
              width: "100%",
              padding: "6px 10px",
              border: "1px solid #CED4DA",
              borderRadius: 4,
              fontSize: 12,
              background: "#fff",
              textAlign: "left",
              color: selected.length === 0 ? "#868E96" : "#212529",
            }}
          >
            {summary}
          </UnstyledButton>
        </Popover.Target>
        <Popover.Dropdown p={0}>
          <ScrollArea.Autosize mah={280} type="auto">
            <Stack gap={0} p={4}>
              {hierarchy.map((l1) => {
                const state = getL1State(l1.name);
                const isExpanded = expanded.has(l1.name);
                return (
                  <Box key={l1.name}>
                    <Group gap={6} wrap="nowrap" px={6} py={6} style={{ borderRadius: 4 }}>
                      <UnstyledButton
                        onClick={() => toggleExpand(l1.name)}
                        aria-label={isExpanded ? "Collapse" : "Expand"}
                        style={{ display: "flex", alignItems: "center" }}
                      >
                        {isExpanded
                          ? <IconChevronDown size={14} color="#737373" />
                          : <IconChevronRight size={14} color="#737373" />}
                      </UnstyledButton>
                      <Checkbox
                        size="xs"
                        checked={state === "all"}
                        indeterminate={state === "some"}
                        onChange={() => onToggleL1(l1.name)}
                        label={
                          <Text size="xs" fw={600} tt="capitalize">
                            {l1.name}
                          </Text>
                        }
                        styles={{ label: { paddingLeft: 6 } }}
                      />
                    </Group>
                    <Collapse in={isExpanded}>
                      <Stack gap={2} pl={32} pb={4}>
                        {l1.groups.map((l2) => (
                          <Checkbox
                            key={l2.name}
                            size="xs"
                            checked={isL2Selected(l1.name, l2.name)}
                            onChange={() => onToggleL2(l1.name, l2.name)}
                            label={
                              <Text size="xs" tt="capitalize">
                                {l2.name}
                              </Text>
                            }
                            styles={{ label: { paddingLeft: 6 }, body: { padding: "3px 4px" } }}
                          />
                        ))}
                      </Stack>
                    </Collapse>
                  </Box>
                );
              })}
              {hierarchy.length === 0 && (
                <Text size="xs" c="#737373" px={8} py={8}>
                  Loading disaster types…
                </Text>
              )}
            </Stack>
          </ScrollArea.Autosize>
        </Popover.Dropdown>
      </Popover>
    </Box>
  );
}
