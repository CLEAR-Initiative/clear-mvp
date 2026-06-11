"use client";

import { useState } from "react";
import {
  Card, Text, Group, Stack, Box, Button, Badge,
  MultiSelect, Select, ActionIcon, Loader, Divider,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useTranslations } from "next-intl";
import { IconBellRinging, IconPlus, IconTrash, IconCheck, IconPlayerPause, IconPlayerPlay } from "@tabler/icons-react";
import { api } from "~/trpc/react";
import { DisasterTypePicker, expandSelectionsToCodes } from "~/components/disaster-type-picker";
import { getDisasterPills } from "~/lib/disaster-types";

// i18n keys under profile.subscriptions.* - resolved via t() at render time.
const SEVERITY_LABEL_KEYS: Record<number, "s1" | "s2" | "s3" | "s4" | "s5"> = {
  1: "s1",
  2: "s2",
  3: "s3",
  4: "s4",
  5: "s5",
};

const FREQUENCY_KEYS = ["immediately", "daily", "weekly", "monthly"] as const;

const LEVEL_KEYS: Record<number, "country" | "state" | "district"> = { 0: "country", 1: "state", 2: "district" };

export function AlertSubscriptionsSection() {
  const t = useTranslations("profile.subscriptions");
  const tToasts = useTranslations("common.toasts");
  const tActions = useTranslations("common.actions");
  const utils = api.useUtils();
  const subsQuery = api.subscriptions.list.useQuery();
  const hierarchyQuery = api.alerts.getDisasterTypeHierarchy.useQuery(undefined, {
    staleTime: Infinity, refetchOnWindowFocus: false,
  });
  const locationsQuery = api.subscriptions.locations.useQuery();

  const [showForm, setShowForm] = useState(false);
  const [formLocationIds, setFormLocationIds] = useState<string[]>([]);
  const [formAlertTypes, setFormAlertTypes] = useState<string[]>([]);
  const [formFrequency, setFormFrequency] = useState<string | null>("immediately");
  const [formMinSeverity, setFormMinSeverity] = useState<string>("4");
  const [deletingGroup, setDeletingGroup] = useState<string | null>(null);
  const [togglingGroup, setTogglingGroup] = useState<string | null>(null);

  const subscribeBatchMutation = api.subscriptions.subscribeBatch.useMutation();
  const unsubscribeMutation = api.subscriptions.unsubscribe.useMutation();
  const toggleMutation = api.subscriptions.update.useMutation();

  const subscriptions = subsQuery.data ?? [];
  const hierarchy = hierarchyQuery.data ?? [];
  const locations = locationsQuery.data ?? [];

  const locationOptions = [0, 1, 2].flatMap((level) => {
    const items = locations
      .filter((l) => l.level === level)
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((l) => ({ value: l.id, label: l.name }));
    return items.length > 0 ? [{ group: t(`levels.${LEVEL_KEYS[level]}`), items }] : [];
  });

  // Group subscriptions by (locationId, frequency, minSeverity) - each group = one card
  const groups = Object.values(
    subscriptions.reduce<Record<string, { key: string; locationId: string; locationName: string; locationLevel: number; frequency: string; minSeverity: number; active: boolean; ids: string[]; types: string[] }>>(
      (acc, sub) => {
        const key = `${sub.location.id}::${sub.frequency}::${sub.minSeverity ?? 1}`;
        if (!acc[key]) {
          acc[key] = {
            key,
            locationId: sub.location.id,
            locationName: sub.location.name,
            locationLevel: sub.location.level,
            frequency: sub.frequency,
            minSeverity: sub.minSeverity ?? 1,
            active: sub.active,
            ids: [],
            types: [],
          };
        }
        acc[key].ids.push(sub.id);
        acc[key].types.push(sub.alertType);
        if (sub.active) acc[key].active = true;
        return acc;
      },
      {},
    ),
  );

  async function handleSubscribe() {
    if (formLocationIds.length === 0 || !formFrequency) return;
    const resolvedTypes = formAlertTypes.length > 0
      ? expandSelectionsToCodes(formAlertTypes, hierarchy)
      : hierarchy.flatMap((h) => h.groups.flatMap((g) => g.codes));

    const typesToCreate = resolvedTypes.length > 0 ? resolvedTypes : ["ot"];

    try {
      await Promise.all(
        formLocationIds.map((locationId) =>
          subscribeBatchMutation.mutateAsync({
            locationIds: [locationId],
            alertTypes: typesToCreate,
            channel: "email" as const,
            frequency: formFrequency as "immediately" | "daily" | "weekly" | "monthly",
            minSeverity: parseInt(formMinSeverity),
          }),
        ),
      );
      notifications.show({ title: t("subscribedTitle"), message: t("subscribedMessage"), color: "green" });
      void utils.subscriptions.list.invalidate();
      setShowForm(false);
      setFormLocationIds([]);
      setFormAlertTypes([]);
      setFormMinSeverity("4");
    } catch (err: unknown) {
      notifications.show({ title: tToasts("error"), message: err instanceof Error ? err.message : t("failed"), color: "red" });
    }
  }

  async function handleDeleteGroup(ids: string[]) {
    const key = ids[0] ?? "";
    setDeletingGroup(key);
    try {
      await Promise.all(ids.map((id) => unsubscribeMutation.mutateAsync({ id })));
      void utils.subscriptions.list.invalidate();
    } finally {
      setDeletingGroup(null);
    }
  }

  async function handleToggleGroup(ids: string[], currentActive: boolean) {
    const key = ids[0] ?? "";
    setTogglingGroup(key);
    try {
      await Promise.all(ids.map((id) => toggleMutation.mutateAsync({ id, active: !currentActive })));
      void utils.subscriptions.list.invalidate();
    } finally {
      setTogglingGroup(null);
    }
  }

  return (
    <Card p="lg" mb={16} style={{ border: "1px solid var(--color-border)" }}>
      <Group gap={8} mb={16} justify="space-between">
        <Group gap={8}>
          <IconBellRinging size={18} color="var(--color-accent)" />
          <Text fw={700} size="sm" tt="uppercase" style={{ letterSpacing: "0.05em", fontSize: 11 }}>
            {t("title")}
          </Text>
          {groups.length > 0 && (
            <Badge size="xs" color="teal" variant="light">{groups.length}</Badge>
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
            {t("add")}
          </Button>
        )}
      </Group>

      {/* New subscription form */}
      {showForm && (
        <Card p="sm" mb={16} style={{ background: "var(--color-bg-muted)", border: "1px solid var(--color-border)" }}>
          <Text size="xs" fw={600} mb={12} tt="uppercase" style={{ letterSpacing: "0.05em", fontSize: 10 }}>
            {t("new")}
          </Text>
          <Stack gap={10}>
            <MultiSelect
              label={t("location")}
              placeholder={t("locationPlaceholder")}
              data={locationOptions}
              value={formLocationIds}
              onChange={setFormLocationIds}
              searchable
              size="xs"
              maxDropdownHeight={200}
              styles={{ groupLabel: { paddingTop: 12, paddingBottom: 4 } }}
            />
            <DisasterTypePicker
              label={t("alertTypes")}
              hierarchy={hierarchy}
              selected={formAlertTypes}
              onChange={setFormAlertTypes}
            />
            <Select
              label={t("minSeverity")}
              data={[
                { value: "1", label: t("severityOptions.all") },
                { value: "2", label: t("severityOptions.low") },
                { value: "3", label: t("severityOptions.medium") },
                { value: "4", label: t("severityOptions.high") },
                { value: "5", label: t("severityOptions.critical") },
              ]}
              value={formMinSeverity}
              onChange={(v) => v && setFormMinSeverity(v)}
              size="xs"
            />
            <Select
              label={t("frequency")}
              data={FREQUENCY_KEYS.map((key) => ({ value: key, label: t(`frequencyOptions.${key}`) }))}
              value={formFrequency}
              onChange={setFormFrequency}
              size="xs"
            />
            <Group gap={8} justify="flex-end" mt={4}>
              <Button size="xs" variant="subtle" color="gray" onClick={() => setShowForm(false)}>
                {tActions("cancel")}
              </Button>
              <Button
                size="xs"
                color="dark"
                leftSection={<IconCheck size={12} />}
                loading={subscribeBatchMutation.isPending}
                disabled={formLocationIds.length === 0}
                onClick={() => void handleSubscribe()}
              >
                {t("subscribe")}
              </Button>
            </Group>
          </Stack>
        </Card>
      )}

      {/* Subscription cards */}
      {subsQuery.isLoading ? (
        <Box py={16} style={{ textAlign: "center" }}><Loader size={16} /></Box>
      ) : groups.length === 0 ? (
        <Text size="sm" c="var(--color-text-muted)">
          {t("empty")}
        </Text>
      ) : (
        <Stack gap={8}>
          {groups.map((group) => {
            const pills = getDisasterPills(group.types);
            const typeLabel = pills.length === 0
              ? t("allTypes")
              : pills.length <= 3
              ? pills.map((p) => p.label).join(", ")
              : t("moreTypes", { labels: pills.slice(0, 2).map((p) => p.label).join(", "), count: pills.length - 2 });

            const isDeleting = deletingGroup === group.ids[0];
            const isToggling = togglingGroup === group.ids[0];

            return (
              <Box
                key={group.key}
                p={12}
                style={{
                  border: "1px solid var(--color-border)",
                  background: group.active ? "var(--color-bg-white)" : "var(--color-bg-muted)",
                  opacity: group.active ? 1 : 0.65,
                }}
              >
                <Group justify="space-between" wrap="nowrap">
                  <Box style={{ flex: 1, minWidth: 0 }}>
                    <Group gap={6} mb={4}>
                      <Text fw={600} size="sm" c="var(--color-text-primary)" truncate="end">
                        {group.locationName}
                      </Text>
                      <Badge size="xs" variant="light" color="gray" style={{ fontSize: 9, textTransform: "uppercase" }}>
                        {LEVEL_KEYS[group.locationLevel] ? t(`levels.${LEVEL_KEYS[group.locationLevel]}`) : ""}
                      </Badge>
                    </Group>
                    <Group gap={6}>
                      <Text size="xs" c="var(--color-text-muted)">{typeLabel}</Text>
                      <Divider orientation="vertical" />
                      <Text size="xs" c="var(--color-text-muted)">{SEVERITY_LABEL_KEYS[group.minSeverity] ? t(`severityLabels.${SEVERITY_LABEL_KEYS[group.minSeverity]}`) : t("severityFallback", { value: group.minSeverity })}</Text>
                      <Divider orientation="vertical" />
                      <Text size="xs" c="var(--color-text-muted)">{(FREQUENCY_KEYS as readonly string[]).includes(group.frequency) ? t(`frequencyOptions.${group.frequency as (typeof FREQUENCY_KEYS)[number]}`) : group.frequency}</Text>
                    </Group>
                  </Box>
                  <Group gap={4} wrap="nowrap">
                    <ActionIcon
                      size="sm"
                      variant="subtle"
                      color={group.active ? "gray" : "teal"}
                      loading={isToggling}
                      title={group.active ? t("pause") : t("resume")}
                      onClick={() => void handleToggleGroup(group.ids, group.active)}
                    >
                      {group.active
                        ? <IconPlayerPause size={13} />
                        : <IconPlayerPlay size={13} />}
                    </ActionIcon>
                    <ActionIcon
                      size="sm"
                      variant="subtle"
                      color="red"
                      loading={isDeleting}
                      title={t("delete")}
                      onClick={() => void handleDeleteGroup(group.ids)}
                    >
                      <IconTrash size={13} />
                    </ActionIcon>
                  </Group>
                </Group>
              </Box>
            );
          })}
        </Stack>
      )}
    </Card>
  );
}
