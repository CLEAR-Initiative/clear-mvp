"use client";

import { useEffect, useState } from "react";
import {
  Modal,
  Stack,
  SegmentedControl,
  MultiSelect,
  Select,
  Button,
  Alert,
  Text,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconAlertCircle } from "@tabler/icons-react";
import { api } from "~/trpc/react";
import type { DjangoSubscription } from "~/lib/types/django";

interface SubscriptionFormModalProps {
  opened: boolean;
  onClose: () => void;
  subscription?: DjangoSubscription | null;
  hasMobileNumber: boolean;
  smsEnabled: boolean;
}

export function SubscriptionFormModal({
  opened,
  onClose,
  subscription,
  hasMobileNumber,
  smsEnabled,
}: SubscriptionFormModalProps) {
  const isEdit = !!subscription;

  const [method, setMethod] = useState<string>(subscription?.method ?? "email");
  const [frequency, setFrequency] = useState<string>(
    subscription?.frequency ?? "immediate",
  );
  const [selectedLocations, setSelectedLocations] = useState<string[]>(
    subscription?.locations.map((l) => String(l.id)) ?? [],
  );
  const [selectedShockTypes, setSelectedShockTypes] = useState<string[]>(
    subscription?.shock_types.map((s) => String(s.id)) ?? [],
  );

  // Reset form when subscription changes
  useEffect(() => {
    if (opened) {
      setMethod(subscription?.method ?? "email");
      setFrequency(subscription?.frequency ?? "immediate");
      setSelectedLocations(
        subscription?.locations.map((l) => String(l.id)) ?? [],
      );
      setSelectedShockTypes(
        subscription?.shock_types.map((s) => String(s.id)) ?? [],
      );
    }
  }, [opened, subscription]);

  const utils = api.useUtils();

  const { data: shockTypesData } = api.subscriptions.shockTypes.useQuery(
    undefined,
    { enabled: opened },
  );
  const { data: locationsData } = api.subscriptions.locations.useQuery(
    undefined,
    { enabled: opened },
  );

  const createMutation = api.subscriptions.create.useMutation({
    onSuccess: () => {
      notifications.show({
        title: "Created",
        message: "Subscription created successfully.",
        color: "green",
      });
      void utils.subscriptions.list.invalidate();
      onClose();
    },
    onError: (err) => {
      notifications.show({
        title: "Error",
        message: err.message,
        color: "red",
      });
    },
  });

  const updateMutation = api.subscriptions.update.useMutation({
    onSuccess: () => {
      notifications.show({
        title: "Updated",
        message: "Subscription updated successfully.",
        color: "green",
      });
      void utils.subscriptions.list.invalidate();
      onClose();
    },
    onError: (err) => {
      notifications.show({
        title: "Error",
        message: err.message,
        color: "red",
      });
    },
  });

  const isSaving = createMutation.isPending || updateMutation.isPending;

  // Build options from API data, seeding with subscription values so labels
  // are available immediately when editing (before the API query resolves)
  const shockTypeOptions = (() => {
    const apiOptions =
      shockTypesData?.shock_types?.map((st) => ({
        value: String(st.id),
        label: st.name,
      })) ?? [];
    if (!subscription) return apiOptions;
    const apiIds = new Set(apiOptions.map((o) => o.value));
    const seed = subscription.shock_types
      .filter((st) => !apiIds.has(String(st.id)))
      .map((st) => ({ value: String(st.id), label: st.name }));
    return [...seed, ...apiOptions];
  })();

  const locationOptions = (() => {
    const apiOptions =
      locationsData?.locations?.map((loc) => ({
        value: String(loc.id),
        label: loc.name,
      })) ?? [];
    if (!subscription) return apiOptions;
    const apiIds = new Set(apiOptions.map((o) => o.value));
    const seed = subscription.locations
      .filter((l) => !apiIds.has(String(l.id)))
      .map((l) => ({ value: String(l.id), label: l.name }));
    return [...seed, ...apiOptions];
  })();

  const showSmsWarning = method === "sms" && (!hasMobileNumber || !smsEnabled);

  const handleSubmit = () => {
    if (selectedLocations.length === 0 || selectedShockTypes.length === 0) {
      notifications.show({
        title: "Validation",
        message:
          "Please select at least one location and one shock type.",
        color: "orange",
      });
      return;
    }

    const payload = {
      method: method as "email" | "sms",
      frequency: frequency as "immediate" | "daily" | "weekly" | "monthly",
      location_ids: selectedLocations.map(Number),
      shock_type_ids: selectedShockTypes.map(Number),
    };

    if (isEdit && subscription) {
      updateMutation.mutate({ id: subscription.id, ...payload });
    } else {
      createMutation.mutate({ ...payload, active: true });
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Text fw={700}>
          {isEdit ? "Edit Subscription" : "New Subscription"}
        </Text>
      }
      size="md"
    >
      <Stack gap={16}>
        {/* Method */}
        <div>
          <Text size="sm" fw={500} mb={4}>
            Delivery Method
          </Text>
          <SegmentedControl
            value={method}
            onChange={setMethod}
            data={[
              { label: "Email", value: "email" },
              { label: "SMS", value: "sms" },
            ]}
            fullWidth
          />
          {showSmsWarning && (
            <Alert
              icon={<IconAlertCircle size={16} />}
              color="orange"
              mt={8}
              p="xs"
            >
              <Text size="xs">
                {!hasMobileNumber
                  ? "Add a mobile number in Notification Preferences above to use SMS."
                  : "Enable SMS notifications in Notification Preferences above."}
              </Text>
            </Alert>
          )}
        </div>

        {/* Shock Types */}
        <MultiSelect
          label="Alert Types"
          placeholder="Select shock types..."
          data={shockTypeOptions}
          value={selectedShockTypes}
          onChange={setSelectedShockTypes}
          searchable
          styles={{
            input: { border: "1px solid #E5E5E5", borderRadius: 8 },
          }}
        />

        {/* Locations */}
        <MultiSelect
          label="Locations"
          placeholder="Select locations..."
          data={locationOptions}
          value={selectedLocations}
          onChange={setSelectedLocations}
          searchable
          styles={{
            input: { border: "1px solid #E5E5E5", borderRadius: 8 },
          }}
        />

        {/* Frequency */}
        <Select
          label="Frequency"
          data={[
            { value: "immediate", label: "Immediate" },
            { value: "daily", label: "Daily Digest" },
            { value: "weekly", label: "Weekly Digest" },
            { value: "monthly", label: "Monthly Digest" },
          ]}
          value={frequency}
          onChange={(val) => val && setFrequency(val)}
          styles={{
            input: { border: "1px solid #E5E5E5", borderRadius: 8 },
          }}
        />

        {/* Actions */}
        <Button
          color="dark"
          fullWidth
          loading={isSaving}
          onClick={handleSubmit}
          disabled={showSmsWarning}
        >
          {isEdit ? "Update Subscription" : "Create Subscription"}
        </Button>
      </Stack>
    </Modal>
  );
}
