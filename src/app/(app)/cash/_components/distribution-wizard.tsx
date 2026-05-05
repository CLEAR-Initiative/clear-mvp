"use client";

import { useState } from "react";
import {
  Box,
  Text,
  Card,
  Group,
  Badge,
  Button,
  SimpleGrid,
  Modal,
  TextInput,
  Select,
  Textarea,
  Checkbox,
  Stepper,
} from "@mantine/core";
import {
  IconCheck,
  IconChevronRight,
  IconChevronLeft,
  IconPhone,
  IconCurrencyDollar,
  IconBuildingBank,
  IconCreditCard,
} from "@tabler/icons-react";

// ============================================================================
// SHARED DATA - exported for use by the main page and other components
// ============================================================================

export interface LocationData {
  id: string;
  name: string;
  lat: number;
  lng: number;
  affected: number;
  severity: string;
  severityColor: string;
  demographics: {
    male: number;
    female: number;
    ages: Record<string, number>;
    vulnerability: Record<string, number>;
    housing: Record<string, number>;
    personsPerRoom: number;
  };
}

export const locations: LocationData[] = [
  {
    id: "fik",
    name: "Fik",
    lat: 8.13,
    lng: 43.63,
    affected: 6700,
    severity: "HIGH",
    severityColor: "#F59E0B",
    demographics: {
      male: 3283, female: 3417,
      ages: { "0-5 years": 1005, "6-17 years": 2010, "18-59 years": 3216, "60+ years": 469 },
      vulnerability: { "Female-headed": 87, "Child-headed": 9, "Elderly single": 19, "With disability": 52, "Chronic illness": 78 },
      housing: { "Tents/makeshift": 123, "Temporary shelter": 189, "Damaged housing": 98, "Adequate housing": 23 },
      personsPerRoom: 4.5,
    },
  },
  {
    id: "jijiga",
    name: "Jijiga",
    lat: 9.35,
    lng: 42.79,
    affected: 13200,
    severity: "CRITICAL",
    severityColor: "#DC2626",
    demographics: {
      male: 6468, female: 6732,
      ages: { "0-5 years": 1980, "6-17 years": 3960, "18-59 years": 6336, "60+ years": 924 },
      vulnerability: { "Female-headed": 172, "Child-headed": 18, "Elderly single": 38, "With disability": 103, "Chronic illness": 154 },
      housing: { "Tents/makeshift": 243, "Temporary shelter": 372, "Damaged housing": 193, "Adequate housing": 45 },
      personsPerRoom: 5.2,
    },
  },
  {
    id: "gode",
    name: "Gode",
    lat: 5.95,
    lng: 43.55,
    affected: 8400,
    severity: "HIGH",
    severityColor: "#F59E0B",
    demographics: {
      male: 4116, female: 4284,
      ages: { "0-5 years": 1260, "6-17 years": 2520, "18-59 years": 4032, "60+ years": 588 },
      vulnerability: { "Female-headed": 109, "Child-headed": 11, "Elderly single": 24, "With disability": 66, "Chronic illness": 98 },
      housing: { "Tents/makeshift": 154, "Temporary shelter": 236, "Damaged housing": 123, "Adequate housing": 29 },
      personsPerRoom: 4.8,
    },
  },
  {
    id: "kebridehar",
    name: "Kebridehar",
    lat: 6.73,
    lng: 44.28,
    affected: 7100,
    severity: "MODERATE",
    severityColor: "#FBBF24",
    demographics: {
      male: 3479, female: 3621,
      ages: { "0-5 years": 1065, "6-17 years": 2130, "18-59 years": 3408, "60+ years": 497 },
      vulnerability: { "Female-headed": 92, "Child-headed": 9, "Elderly single": 20, "With disability": 55, "Chronic illness": 83 },
      housing: { "Tents/makeshift": 130, "Temporary shelter": 200, "Damaged housing": 104, "Adequate housing": 24 },
      personsPerRoom: 4.3,
    },
  },
  {
    id: "degehabur",
    name: "Degehabur",
    lat: 8.22,
    lng: 43.56,
    affected: 15300,
    severity: "CRITICAL",
    severityColor: "#DC2626",
    demographics: {
      male: 7497, female: 7803,
      ages: { "0-5 years": 2295, "6-17 years": 4590, "18-59 years": 7344, "60+ years": 1071 },
      vulnerability: { "Female-headed": 199, "Child-headed": 21, "Elderly single": 44, "With disability": 119, "Chronic illness": 179 },
      housing: { "Tents/makeshift": 281, "Temporary shelter": 431, "Damaged housing": 224, "Adequate housing": 52 },
      personsPerRoom: 5.5,
    },
  },
];

// ============================================================================
// WIZARD CONSTANTS
// ============================================================================

interface DistributionData {
  locations: string[];
  modality: string;
  amount: string;
  currency: string;
  frequency: string;
  startDate: string;
  endDate: string;
  verificationMethod: string;
  targetCriteria: string[];
  notes: string;
}

const WIZARD_STEPS = [
  { title: "Target Locations", description: "Select distribution areas" },
  { title: "Transfer Details", description: "Configure amount and modality" },
  { title: "Schedule & Criteria", description: "Set timing and targeting" },
  { title: "Review & Confirm", description: "Verify distribution plan" },
];

const modalityOptions = [
  { value: "mobile-money", label: "Mobile Money Transfer", icon: IconPhone },
  { value: "cash-in-hand", label: "Cash-in-Hand Distribution", icon: IconCurrencyDollar },
  { value: "bank-transfer", label: "Bank Account Transfer", icon: IconBuildingBank },
  { value: "voucher", label: "E-Voucher / Paper Voucher", icon: IconCreditCard },
];

const verificationOptions = [
  { value: "biometric", label: "Biometric Verification" },
  { value: "id-card", label: "ID Card + PIN" },
  { value: "token", label: "Token-Based Distribution" },
  { value: "community", label: "Community-Based Verification" },
];

const targetingCriteria = [
  "Female-headed households",
  "Child-headed households",
  "Elderly single-person households",
  "Households with disabled members",
  "Households with chronic illness",
  "Inadequate housing (tents/temporary)",
  "High persons per room (>4)",
];

// ============================================================================
// WIZARD COMPONENT
// ============================================================================

interface NewDistributionWizardProps {
  opened: boolean;
  onClose: () => void;
}

export function NewDistributionWizard({ opened, onClose }: NewDistributionWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<DistributionData>({
    locations: [],
    modality: "",
    amount: "",
    currency: "ETB",
    frequency: "one-time",
    startDate: "",
    endDate: "",
    verificationMethod: "",
    targetCriteria: [],
    notes: "",
  });

  const updateFormData = (updates: Partial<DistributionData>) => {
    setFormData((prev) => ({ ...prev, ...updates }));
  };

  const toggleLocation = (locationId: string) => {
    setFormData((prev) => ({
      ...prev,
      locations: prev.locations.includes(locationId)
        ? prev.locations.filter((id) => id !== locationId)
        : [...prev.locations, locationId],
    }));
  };

  const toggleCriteria = (criterion: string) => {
    setFormData((prev) => ({
      ...prev,
      targetCriteria: prev.targetCriteria.includes(criterion)
        ? prev.targetCriteria.filter((c) => c !== criterion)
        : [...prev.targetCriteria, criterion],
    }));
  };

  const canProceed = () => {
    switch (currentStep) {
      case 0: return formData.locations.length > 0;
      case 1: return formData.modality !== "" && formData.amount !== "";
      case 2: return formData.startDate !== "" && formData.verificationMethod !== "";
      case 3: return true;
      default: return false;
    }
  };

  const selectedLocations = locations.filter((l) => formData.locations.includes(l.id));
  const totalAffected = selectedLocations.reduce((sum, l) => sum + l.affected, 0);
  const estimatedHouseholds = Math.round(totalAffected / 5);
  const estimatedBudget = estimatedHouseholds * (parseInt(formData.amount) || 0);

  const handleSubmit = () => {
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      onClose();
      setCurrentStep(0);
      setFormData({
        locations: [], modality: "", amount: "", currency: "ETB",
        frequency: "one-time", startDate: "", endDate: "",
        verificationMethod: "", targetCriteria: [], notes: "",
      });
    }, 1500);
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="New Cash Distribution"
      size="lg"
      centered
    >
      {/* Step Indicator */}
      <Box mb={24}>
        <Text size="xs" c="var(--color-text-muted)" mb={16}>
          Step {currentStep + 1} of 4: {WIZARD_STEPS[currentStep]?.title}
        </Text>
        <Stepper active={currentStep} size="xs" color="#E85D3D">
          {WIZARD_STEPS.map((step) => (
            <Stepper.Step key={step.title} label={step.title} />
          ))}
        </Stepper>
      </Box>

      {/* Step 1: Target Locations */}
      {currentStep === 0 && (
        <Box>
          <Text size="sm" c="var(--color-text-secondary)" mb={16}>
            Select the locations where cash assistance will be distributed. You can select multiple locations.
          </Text>
          <SimpleGrid cols={2} spacing={12}>
            {locations.map((location) => (
              <Box
                key={location.id}
                p={16}
                onClick={() => toggleLocation(location.id)}
                style={{
                  border: formData.locations.includes(location.id)
                    ? "2px solid #E85D3D"
                    : "1px solid var(--color-border)",
                  background: formData.locations.includes(location.id)
                    ? "#FEF2F0"
                    : "white",
                  cursor: "pointer",
                }}
              >
                <Group justify="space-between">
                  <Box>
                    <Text fw={600} size="sm">{location.name}</Text>
                    <Text size="xs" c="var(--color-text-muted)">{location.affected.toLocaleString()} affected</Text>
                  </Box>
                  <Group gap={8}>
                    <Badge size="xs" style={{ background: location.severityColor, color: "white" }}>
                      {location.severity}
                    </Badge>
                    {formData.locations.includes(location.id) && (
                      <IconCheck size={18} color="#E85D3D" />
                    )}
                  </Group>
                </Group>
              </Box>
            ))}
          </SimpleGrid>
          {formData.locations.length > 0 && (
            <Box mt={16} p={12} style={{ background: "var(--color-bg-muted)" }}>
              <Text size="sm">
                <Text span fw={700}>{formData.locations.length}</Text> location(s) selected{" \u2022 "}
                <Text span fw={700}>{totalAffected.toLocaleString()}</Text> total affected{" \u2022 "}
                ~<Text span fw={700}>{estimatedHouseholds.toLocaleString()}</Text> estimated households
              </Text>
            </Box>
          )}
        </Box>
      )}

      {/* Step 2: Transfer Details */}
      {currentStep === 1 && (
        <Box>
          <Text size="sm" c="var(--color-text-secondary)" mb={16}>
            Configure the transfer modality and amount for this distribution.
          </Text>

          <Text size="xs" fw={600} c="var(--color-text-muted)" tt="uppercase" mb={8} style={{ letterSpacing: "0.5px" }}>
            Transfer Modality
          </Text>
          <SimpleGrid cols={2} spacing={12} mb={20}>
            {modalityOptions.map((option) => {
              const Icon = option.icon;
              return (
                <Box
                  key={option.value}
                  p={16}
                  onClick={() => updateFormData({ modality: option.value })}
                  style={{
                    border: formData.modality === option.value
                      ? "2px solid #E85D3D"
                      : "1px solid var(--color-border)",
                    background: formData.modality === option.value ? "#FEF2F0" : "white",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                  }}
                >
                  <Icon size={20} color="#737373" />
                  <Text size="sm" fw={500}>{option.label}</Text>
                </Box>
              );
            })}
          </SimpleGrid>

          <SimpleGrid cols={2} spacing={12} mb={20}>
            <TextInput
              label="Amount per Household"
              placeholder="e.g., 580"
              value={formData.amount}
              onChange={(e) => updateFormData({ amount: e.currentTarget.value })}
              type="number"
              required
              styles={{ label: { fontSize: 11, textTransform: "uppercase", letterSpacing: "0.5px", color: "#737373", fontWeight: 600 } }}
            />
            <Select
              label="Currency"
              value={formData.currency}
              onChange={(val) => updateFormData({ currency: val ?? "ETB" })}
              data={[
                { value: "ETB", label: "Ethiopian Birr (ETB)" },
                { value: "USD", label: "US Dollar (USD)" },
              ]}
              styles={{ label: { fontSize: 11, textTransform: "uppercase", letterSpacing: "0.5px", color: "#737373", fontWeight: 600 } }}
            />
          </SimpleGrid>

          <Select
            label="Distribution Frequency"
            value={formData.frequency}
            onChange={(val) => updateFormData({ frequency: val ?? "one-time" })}
            data={[
              { value: "one-time", label: "One-time Distribution" },
              { value: "monthly", label: "Monthly (3 months)" },
              { value: "bi-weekly", label: "Bi-weekly (6 weeks)" },
            ]}
            mb={20}
            styles={{ label: { fontSize: 11, textTransform: "uppercase", letterSpacing: "0.5px", color: "#737373", fontWeight: 600 } }}
          />

          {formData.amount && (
            <Box p={16} style={{ background: "#F0F9FF", borderLeft: "4px solid #E85D3D" }}>
              <Text size="xs" fw={600} c="#E85D3D" tt="uppercase" mb={4}>Estimated Budget</Text>
              <Text size="xl" fw={700} style={{ fontFamily: "monospace" }}>
                {estimatedBudget.toLocaleString()} {formData.currency}
              </Text>
              <Text size="xs" c="var(--color-text-secondary)" mt={4}>
                Based on ~{estimatedHouseholds.toLocaleString()} households at {formData.amount} {formData.currency} each
              </Text>
            </Box>
          )}
        </Box>
      )}

      {/* Step 3: Schedule & Criteria */}
      {currentStep === 2 && (
        <Box>
          <Text size="sm" c="var(--color-text-secondary)" mb={16}>
            Set the distribution schedule and targeting criteria.
          </Text>

          <SimpleGrid cols={2} spacing={12} mb={20}>
            <TextInput
              label="Start Date"
              type="date"
              value={formData.startDate}
              onChange={(e) => updateFormData({ startDate: e.currentTarget.value })}
              required
              styles={{ label: { fontSize: 11, textTransform: "uppercase", letterSpacing: "0.5px", color: "#737373", fontWeight: 600 } }}
            />
            <TextInput
              label="End Date"
              type="date"
              value={formData.endDate}
              onChange={(e) => updateFormData({ endDate: e.currentTarget.value })}
              styles={{ label: { fontSize: 11, textTransform: "uppercase", letterSpacing: "0.5px", color: "#737373", fontWeight: 600 } }}
            />
          </SimpleGrid>

          <Text size="xs" fw={600} c="var(--color-text-muted)" tt="uppercase" mb={8} style={{ letterSpacing: "0.5px" }}>
            Verification Method <Text span c="#DC2626">*</Text>
          </Text>
          <SimpleGrid cols={2} spacing={12} mb={20}>
            {verificationOptions.map((option) => (
              <Box
                key={option.value}
                p={12}
                onClick={() => updateFormData({ verificationMethod: option.value })}
                style={{
                  border: formData.verificationMethod === option.value
                    ? "2px solid #E85D3D"
                    : "1px solid var(--color-border)",
                  background: formData.verificationMethod === option.value ? "#FEF2F0" : "white",
                  cursor: "pointer",
                }}
              >
                <Text size="sm" fw={500}>{option.label}</Text>
              </Box>
            ))}
          </SimpleGrid>

          <Text size="xs" fw={600} c="var(--color-text-muted)" tt="uppercase" mb={8} style={{ letterSpacing: "0.5px" }}>
            Targeting Criteria (Optional)
          </Text>
          <Box style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {targetingCriteria.map((criterion) => (
              <Checkbox
                key={criterion}
                label={criterion}
                checked={formData.targetCriteria.includes(criterion)}
                onChange={() => toggleCriteria(criterion)}
                size="sm"
                styles={{ label: { fontSize: 13 } }}
              />
            ))}
          </Box>
        </Box>
      )}

      {/* Step 4: Review & Confirm */}
      {currentStep === 3 && (
        <Box>
          <Text size="sm" c="var(--color-text-secondary)" mb={16}>
            Review the distribution plan before creating.
          </Text>

          <Card p={0} style={{ border: "1px solid var(--color-border)" }}>
            <Box p={16} className="border-b border-[var(--color-border)]">
              <Text size="xs" fw={600} c="var(--color-text-muted)" tt="uppercase" mb={8}>Target Locations</Text>
              <Group gap={8}>
                {selectedLocations.map((loc) => (
                  <Text key={loc.id} px={8} py={4} size="sm" fw={500} style={{ background: "var(--color-bg-muted)" }}>
                    {loc.name}
                  </Text>
                ))}
              </Group>
              <Text size="xs" c="var(--color-text-muted)" mt={8}>
                {totalAffected.toLocaleString()} affected {"\u2022"} ~{estimatedHouseholds.toLocaleString()} households
              </Text>
            </Box>

            <SimpleGrid cols={2} spacing={0}>
              <Box p={16} className="border-b border-r border-[var(--color-border)]">
                <Text size="xs" fw={600} c="var(--color-text-muted)" tt="uppercase" mb={4}>Transfer Modality</Text>
                <Text size="sm" fw={500}>
                  {modalityOptions.find((o) => o.value === formData.modality)?.label}
                </Text>
              </Box>
              <Box p={16} className="border-b border-[var(--color-border)]">
                <Text size="xs" fw={600} c="var(--color-text-muted)" tt="uppercase" mb={4}>Amount per HH</Text>
                <Text size="sm" fw={500} style={{ fontFamily: "monospace" }}>
                  {formData.amount} {formData.currency}
                </Text>
              </Box>
            </SimpleGrid>

            <SimpleGrid cols={2} spacing={0}>
              <Box p={16} className="border-b border-r border-[var(--color-border)]">
                <Text size="xs" fw={600} c="var(--color-text-muted)" tt="uppercase" mb={4}>Distribution Period</Text>
                <Text size="sm" fw={500}>
                  {formData.startDate} {formData.endDate ? `to ${formData.endDate}` : "(single day)"}
                </Text>
              </Box>
              <Box p={16} className="border-b border-[var(--color-border)]">
                <Text size="xs" fw={600} c="var(--color-text-muted)" tt="uppercase" mb={4}>Verification</Text>
                <Text size="sm" fw={500}>
                  {verificationOptions.find((o) => o.value === formData.verificationMethod)?.label}
                </Text>
              </Box>
            </SimpleGrid>

            {formData.targetCriteria.length > 0 && (
              <Box p={16} className="border-b border-[var(--color-border)]">
                <Text size="xs" fw={600} c="var(--color-text-muted)" tt="uppercase" mb={8}>Targeting Criteria</Text>
                <Group gap={8}>
                  {formData.targetCriteria.map((c) => (
                    <Text key={c} px={8} py={4} size="xs" style={{ background: "#FEF3C7", color: "#92400E" }}>
                      {c}
                    </Text>
                  ))}
                </Group>
              </Box>
            )}

            <Box p={16} style={{ background: "#D1FAE5" }}>
              <Text size="xs" fw={600} c="#059669" tt="uppercase" mb={4}>Total Estimated Budget</Text>
              <Text size="xl" fw={700} c="#059669" style={{ fontFamily: "monospace" }}>
                {estimatedBudget.toLocaleString()} {formData.currency}
              </Text>
            </Box>
          </Card>

          <Textarea
            label="Additional Notes"
            placeholder="Any additional instructions or notes for field coordinators..."
            value={formData.notes}
            onChange={(e) => updateFormData({ notes: e.currentTarget.value })}
            rows={3}
            mt={16}
            styles={{ label: { fontSize: 11, textTransform: "uppercase", letterSpacing: "0.5px", color: "#737373", fontWeight: 600 } }}
          />
        </Box>
      )}

      {/* Footer Navigation */}
      <Group justify="space-between" mt={24} pt={16} className="border-t border-[var(--color-border)]">
        <Button
          variant="outline"
          color="gray"
          size="sm"
          leftSection={currentStep > 0 ? <IconChevronLeft size={16} /> : undefined}
          onClick={currentStep === 0 ? onClose : () => setCurrentStep((s) => s - 1)}
          style={{ fontSize: 13 }}
        >
          {currentStep === 0 ? "Cancel" : "Back"}
        </Button>

        {currentStep < 3 ? (
          <Button
            size="sm"
            rightSection={<IconChevronRight size={16} />}
            onClick={() => setCurrentStep((s) => s + 1)}
            disabled={!canProceed()}
            style={{ background: canProceed() ? "#E85D3D" : undefined, borderColor: canProceed() ? "#E85D3D" : undefined, fontSize: 13 }}
          >
            Next
          </Button>
        ) : (
          <Button
            size="sm"
            leftSection={isSubmitting ? undefined : <IconCheck size={16} />}
            onClick={handleSubmit}
            loading={isSubmitting}
            style={{ background: "#059669", borderColor: "#059669", fontSize: 13 }}
          >
            Create Distribution
          </Button>
        )}
      </Group>
    </Modal>
  );
}
