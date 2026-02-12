"use client";

import { useState, useMemo } from "react";
import dynamic from "next/dynamic";
import type { MapMarker } from "~/components/map/crisis-map";
import {
  Box,
  Text,
  Card,
  Group,
  Badge,
  Button,
  SimpleGrid,
  Tabs,
  Modal,
  TextInput,
  Select,
  Textarea,
  Checkbox,
  Stepper,
} from "@mantine/core";
import {
  IconDownload,
  IconPlus,
  IconAlertCircle,
  IconMapPin,
  IconCheck,
  IconChevronRight,
  IconChevronLeft,
  IconPhone,
  IconCurrencyDollar,
  IconBuildingBank,
  IconCreditCard,
  IconShieldCheck,
  IconX,
} from "@tabler/icons-react";

const CrisisMap = dynamic(
  () => import("~/components/map/crisis-map").then((m) => m.CrisisMap),
  { ssr: false, loading: () => <Box w="100%" h="100%" bg="#F5F5F5" /> },
);

const stats = [
  { label: "Affected Population", value: "185,000", color: undefined },
  { label: "Cash Transfer/HH", value: "580 Birr", sub: "\u2248 $10 USD", color: undefined },
  { label: "Eligible HH (AI)", value: "5,000", color: "#059669" },
  { label: "Total Budget", value: "2.9M Birr", color: undefined },
];

interface LocationData {
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

const locations: LocationData[] = [
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
// NEW DISTRIBUTION WIZARD
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

function NewDistributionWizard({
  opened,
  onClose,
}: {
  opened: boolean;
  onClose: () => void;
}) {
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
        <Text size="xs" c="#737373" mb={16}>
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
          <Text size="sm" c="#525252" mb={16}>
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
                    : "1px solid #E5E5E5",
                  background: formData.locations.includes(location.id)
                    ? "#FEF2F0"
                    : "white",
                  cursor: "pointer",
                }}
              >
                <Group justify="space-between">
                  <Box>
                    <Text fw={600} size="sm">{location.name}</Text>
                    <Text size="xs" c="#737373">{location.affected.toLocaleString()} affected</Text>
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
            <Box mt={16} p={12} style={{ background: "#F5F5F5" }}>
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
          <Text size="sm" c="#525252" mb={16}>
            Configure the transfer modality and amount for this distribution.
          </Text>

          <Text size="xs" fw={600} c="#737373" tt="uppercase" mb={8} style={{ letterSpacing: "0.5px" }}>
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
                      : "1px solid #E5E5E5",
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
              <Text size="xs" c="#525252" mt={4}>
                Based on ~{estimatedHouseholds.toLocaleString()} households at {formData.amount} {formData.currency} each
              </Text>
            </Box>
          )}
        </Box>
      )}

      {/* Step 3: Schedule & Criteria */}
      {currentStep === 2 && (
        <Box>
          <Text size="sm" c="#525252" mb={16}>
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

          <Text size="xs" fw={600} c="#737373" tt="uppercase" mb={8} style={{ letterSpacing: "0.5px" }}>
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
                    : "1px solid #E5E5E5",
                  background: formData.verificationMethod === option.value ? "#FEF2F0" : "white",
                  cursor: "pointer",
                }}
              >
                <Text size="sm" fw={500}>{option.label}</Text>
              </Box>
            ))}
          </SimpleGrid>

          <Text size="xs" fw={600} c="#737373" tt="uppercase" mb={8} style={{ letterSpacing: "0.5px" }}>
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
          <Text size="sm" c="#525252" mb={16}>
            Review the distribution plan before creating.
          </Text>

          <Card p={0} style={{ border: "1px solid #E5E5E5" }}>
            <Box p={16} className="border-b border-[#E5E5E5]">
              <Text size="xs" fw={600} c="#737373" tt="uppercase" mb={8}>Target Locations</Text>
              <Group gap={8}>
                {selectedLocations.map((loc) => (
                  <Text key={loc.id} px={8} py={4} size="sm" fw={500} style={{ background: "#F5F5F5" }}>
                    {loc.name}
                  </Text>
                ))}
              </Group>
              <Text size="xs" c="#737373" mt={8}>
                {totalAffected.toLocaleString()} affected {"\u2022"} ~{estimatedHouseholds.toLocaleString()} households
              </Text>
            </Box>

            <SimpleGrid cols={2} spacing={0}>
              <Box p={16} className="border-b border-r border-[#E5E5E5]">
                <Text size="xs" fw={600} c="#737373" tt="uppercase" mb={4}>Transfer Modality</Text>
                <Text size="sm" fw={500}>
                  {modalityOptions.find((o) => o.value === formData.modality)?.label}
                </Text>
              </Box>
              <Box p={16} className="border-b border-[#E5E5E5]">
                <Text size="xs" fw={600} c="#737373" tt="uppercase" mb={4}>Amount per HH</Text>
                <Text size="sm" fw={500} style={{ fontFamily: "monospace" }}>
                  {formData.amount} {formData.currency}
                </Text>
              </Box>
            </SimpleGrid>

            <SimpleGrid cols={2} spacing={0}>
              <Box p={16} className="border-b border-r border-[#E5E5E5]">
                <Text size="xs" fw={600} c="#737373" tt="uppercase" mb={4}>Distribution Period</Text>
                <Text size="sm" fw={500}>
                  {formData.startDate} {formData.endDate ? `to ${formData.endDate}` : "(single day)"}
                </Text>
              </Box>
              <Box p={16} className="border-b border-[#E5E5E5]">
                <Text size="xs" fw={600} c="#737373" tt="uppercase" mb={4}>Verification</Text>
                <Text size="sm" fw={500}>
                  {verificationOptions.find((o) => o.value === formData.verificationMethod)?.label}
                </Text>
              </Box>
            </SimpleGrid>

            {formData.targetCriteria.length > 0 && (
              <Box p={16} className="border-b border-[#E5E5E5]">
                <Text size="xs" fw={600} c="#737373" tt="uppercase" mb={8}>Targeting Criteria</Text>
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
      <Group justify="space-between" mt={24} pt={16} className="border-t border-[#E5E5E5]">
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

export default function CashPage() {
  const [selectedLocation, setSelectedLocation] = useState(locations[0]!);
  const [detailTab, setDetailTab] = useState<string | null>("demographics");
  const [showDistributionWizard, setShowDistributionWizard] = useState(false);
  const d = selectedLocation.demographics;
  const total = d.male + d.female;

  const mapMarkers: MapMarker[] = useMemo(
    () =>
      locations.map((loc) => ({
        id: loc.id.charCodeAt(0),
        lng: loc.lng,
        lat: loc.lat,
        title: loc.name,
        severity: loc.severity === "CRITICAL" ? "critical" : loc.severity === "HIGH" ? "high" : "medium",
        type: `${loc.affected.toLocaleString()} affected`,
        description: `Severity: ${loc.severity}`,
      })),
    [],
  );

  return (
    <Box>
      {/* Header */}
      <Box px={24} py={12} className="border-b border-[#E5E5E5]" style={{ background: "#FFFFFF" }}>
        <Group justify="space-between">
          <Box>
            <Text fw={600} c="#171717" style={{ fontSize: 16 }}>Cash Assistance Targeting & Distribution</Text>
            <Text c="#A3A3A3" mt={2} style={{ fontSize: 12 }}>AI-powered beneficiary mapping and market analysis for emergency cash programming</Text>
          </Box>
          <Group gap={8}>
            <Button variant="outline" color="gray" size="xs" leftSection={<IconDownload size={14} />} style={{ fontSize: 13 }}>
              Export Data
            </Button>
            <Button
              size="xs"
              leftSection={<IconPlus size={14} />}
              style={{ background: "#E85D3D", borderColor: "#E85D3D", fontSize: 13 }}
              onClick={() => setShowDistributionWizard(true)}
            >
              New Distribution
            </Button>
          </Group>
        </Group>
      </Box>

      {/* Active Crisis Banner */}
      <Box px={24} py={10} style={{ background: "#FEF2E8", borderBottom: "1px solid #FDBA74" }}>
        <Group justify="space-between">
          <Group gap={12}>
            <IconAlertCircle size={18} color="#C2410C" />
            <Text size="sm" c="#171717">
              <Text span fw={700} c="#C2410C">Active Crisis:</Text> Cholera Outbreak - Somali Region {"\u2022"} Jijiga, Kebridehar
            </Text>
          </Group>
          <Text size="xs" fw={600} px={10} py={4} style={{ background: "white", border: "1px solid #E5E5E5", color: "#525252" }}>
            46h intervention window
          </Text>
        </Group>
      </Box>

      <Box p={24}>
        {/* Stats */}
        <SimpleGrid cols={4} spacing={16} mb={24}>
          {stats.map((stat) => (
            <Card key={stat.label} p="lg" style={{ border: "1px solid #E5E5E5" }}>
              <Text c="#737373" fw={600} tt="uppercase" mb={8} style={{ fontSize: 11, letterSpacing: "0.5px" }}>{stat.label}</Text>
              <Text fw={700} c={stat.color ?? "#171717"} style={{ fontSize: 28, fontFamily: "monospace" }}>
                {stat.value}
              </Text>
              {stat.sub && <Text c="#A3A3A3" mt={4} style={{ fontSize: 12 }}>{stat.sub}</Text>}
            </Card>
          ))}
        </SimpleGrid>

        {/* Map Section Header */}
        <Group gap={8} mb={4}>
          <IconMapPin size={18} color="#171717" />
          <Text size="sm" fw={600} c="#171717">Cash Assistance Mapping & Assessment</Text>
        </Group>
        <Text size="xs" c="#A3A3A3" mb={16}>
          Click on location cards to view detailed population demographics, market analysis, and field coordinator inputs
        </Text>

        {/* Map + Details Panel */}
        <Group align="flex-start" gap={16} mb={24} style={{ flexWrap: "nowrap" }}>
          {/* Map + Location Cards */}
          <Box style={{ flex: "0 0 65%" }}>
            <Card p={0} style={{ border: "1px solid #E5E5E5", overflow: "hidden" }}>
              <Box style={{ height: 500, position: "relative" }}>
                <CrisisMap
                  markers={mapMarkers}
                  center={[selectedLocation.lng, selectedLocation.lat]}
                  zoom={6.5}
                  className="w-full h-full"
                  onMarkerClick={(m) => {
                    const loc = locations.find((l) => l.name === m.title);
                    if (loc) setSelectedLocation(loc);
                  }}
                />

                {/* Map Legend */}
                <Box style={{ position: "absolute", top: 12, left: 12, background: "white", border: "1px solid #E5E5E5", padding: "10px 14px", zIndex: 5 }}>
                  <Box style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 11 }}>
                    {[
                      { color: "#DC2626", label: "Critical Exposure" },
                      { color: "#F59E0B", label: "High Exposure" },
                      { color: "#FBBF24", label: "Moderate Exposure" },
                    ].map((l) => (
                      <Group key={l.label} gap={8}>
                        <Box style={{ width: 10, height: 10, background: l.color }} />
                        <Text size="xs">{l.label}</Text>
                      </Group>
                    ))}
                  </Box>
                </Box>
              </Box>
            </Card>
          </Box>

          {/* Details Panel */}
          <Box style={{ flex: "0 0 35%", minWidth: 0 }}>
            <Card p={0} style={{ border: "1px solid #E5E5E5", height: 500, overflowY: "auto" }}>
              <Box px={16} py={12} className="border-b border-[#E5E5E5]" style={{ position: "sticky", top: 0, background: "white", zIndex: 5 }}>
                <Group gap={8}>
                  <IconMapPin size={16} color="#A3A3A3" />
                  <Text fw={600} size="sm">{selectedLocation.name}</Text>
                </Group>
              </Box>

              {/* Total Affected */}
              <Box px={20} py={16} className="border-b border-[#E5E5E5]">
                <Group justify="space-between">
                  <Box>
                    <Text size="xs" c="#A3A3A3" tt="uppercase" style={{ letterSpacing: "0.5px" }} mb={4}>Total Affected</Text>
                    <Text size="xl" fw={700} style={{ fontFamily: "monospace" }}>{selectedLocation.affected.toLocaleString()}</Text>
                  </Box>
                  <Badge size="lg" style={{ background: selectedLocation.severityColor, color: "white", fontWeight: 600 }}>
                    {selectedLocation.severity}
                  </Badge>
                </Group>
              </Box>

              {/* Export button */}
              <Box px={20} py={12} className="border-b border-[#E5E5E5]">
                <Button fullWidth size="sm" style={{ background: "#E85D3D", borderColor: "#E85D3D", fontSize: 13 }}>Export Cash Assessment Report (PDF)</Button>
              </Box>

              {/* Detail Tabs */}
              <Tabs value={detailTab} onChange={setDetailTab} styles={{ tab: { fontSize: 13, fontWeight: 500 } }}>
                <Tabs.List>
                  <Tabs.Tab value="demographics" style={{ flex: 1 }}>Demographics</Tabs.Tab>
                  <Tabs.Tab value="market" style={{ flex: 1 }}>Market</Tabs.Tab>
                  <Tabs.Tab value="field" style={{ flex: 1 }}>Field Input</Tabs.Tab>
                </Tabs.List>

                <Tabs.Panel value="demographics">
                  <Box p={16}>
                    {/* Gender */}
                    <Text size="xs" fw={600} c="#A3A3A3" tt="uppercase" mb={10}>Gender Distribution</Text>
                    {[
                      { label: "Male", value: d.male, pct: Math.round((d.male / total) * 100) },
                      { label: "Female", value: d.female, pct: Math.round((d.female / total) * 100) },
                    ].map((g) => (
                      <Box key={g.label} mb={8}>
                        <Group justify="space-between" mb={4}>
                          <Text size="xs">{g.label}</Text>
                          <Text size="xs" style={{ fontFamily: "monospace" }}>{g.value.toLocaleString()} ({g.pct}%)</Text>
                        </Group>
                        <Box style={{ height: 6, background: "#F5F5F5" }}>
                          <Box style={{ height: "100%", width: `${g.pct}%`, background: "#525252" }} />
                        </Box>
                      </Box>
                    ))}

                    {/* Age Distribution */}
                    <Text size="xs" fw={600} c="#A3A3A3" tt="uppercase" mt={20} mb={10}>Age Distribution</Text>
                    <SimpleGrid cols={4} spacing={8}>
                      {Object.entries(d.ages).map(([label, value]) => (
                        <Box key={label} p={10} style={{ background: "#F5F5F5", textAlign: "center" }}>
                          <Text size="xs" c="#A3A3A3" mb={4}>{label}</Text>
                          <Text size="sm" fw={600} style={{ fontFamily: "monospace" }}>{value.toLocaleString()}</Text>
                        </Box>
                      ))}
                    </SimpleGrid>

                    {/* Vulnerability */}
                    <Text size="xs" fw={600} c="#A3A3A3" tt="uppercase" mt={20} mb={10}>Vulnerability Indicators (HH)</Text>
                    {Object.entries(d.vulnerability).map(([label, value]) => (
                      <Group key={label} justify="space-between" py={6} className="border-b border-[#E5E5E5]">
                        <Text size="xs">{label}</Text>
                        <Text size="xs" fw={500} style={{ fontFamily: "monospace" }}>{value}</Text>
                      </Group>
                    ))}

                    {/* Housing */}
                    <Text size="xs" fw={600} c="#A3A3A3" tt="uppercase" mt={20} mb={10}>Housing Conditions (HH)</Text>
                    {Object.entries(d.housing).map(([label, value]) => (
                      <Group key={label} justify="space-between" py={6} className="border-b border-[#E5E5E5]">
                        <Text size="xs">{label}</Text>
                        <Text size="xs" fw={500} style={{ fontFamily: "monospace" }}>{value}</Text>
                      </Group>
                    ))}

                    {/* Avg Persons/Room */}
                    <Box mt={16} p={12} style={{ background: "#F5F5F5" }}>
                      <Text size="xs" c="#A3A3A3" mb={4}>Avg. Persons/Room</Text>
                      <Text size="lg" fw={700} style={{ fontFamily: "monospace" }}>{d.personsPerRoom}</Text>
                    </Box>
                  </Box>
                </Tabs.Panel>

                <Tabs.Panel value="market">
                  <Box p={16}>
                    <Text size="xs" fw={600} c="#A3A3A3" tt="uppercase" mb={10}>Market Functionality</Text>
                    <Box p={12} mb={8} style={{ background: "#D1FAE5" }}>
                      <Group gap={8}>
                        <Box style={{ width: 8, height: 8, background: "#059669" }} />
                        <Text size="sm" fw={500} c="#059669">Markets Operational</Text>
                      </Group>
                    </Box>
                    <Text size="xs" c="#525252" style={{ lineHeight: 1.5 }} mb={20}>
                      3 of 4 major markets in the area are functioning normally. One market has reduced hours due to security concerns.
                    </Text>

                    <Text size="xs" fw={600} c="#A3A3A3" tt="uppercase" mb={10}>Vendor Availability</Text>
                    {[
                      { label: "Food vendors", value: "12 active", color: "#059669" },
                      { label: "NFI vendors", value: "8 active", color: "#059669" },
                      { label: "Mobile money agents", value: "3 active", color: "#F59E0B" },
                    ].map((v) => (
                      <Group key={v.label} justify="space-between" py={6} className="border-b border-[#E5E5E5]">
                        <Text size="xs">{v.label}</Text>
                        <Text size="xs" fw={500} c={v.color} style={{ fontFamily: "monospace" }}>{v.value}</Text>
                      </Group>
                    ))}

                    <Text size="xs" fw={600} c="#A3A3A3" tt="uppercase" mt={20} mb={10}>Price Stability</Text>
                    {[
                      { label: "Staple foods", value: "+12% vs baseline", color: "#F59E0B" },
                      { label: "Water (20L)", value: "+28% vs baseline", color: "#DC2626" },
                      { label: "Transport", value: "+5% vs baseline", color: "#059669" },
                    ].map((p) => (
                      <Group key={p.label} justify="space-between" py={6} className="border-b border-[#E5E5E5]">
                        <Text size="xs">{p.label}</Text>
                        <Text size="xs" c={p.color}>{p.value}</Text>
                      </Group>
                    ))}

                    <Box mt={16} p={12} style={{ background: "#F0F9FF", borderLeft: "3px solid #3B82F6" }}>
                      <Text size="xs" fw={600} c="#3B82F6" mb={4}>Recommendation</Text>
                      <Text size="xs" c="#525252">Cash transfer is viable. Consider voucher restrictions for water purchases due to price inflation.</Text>
                    </Box>
                  </Box>
                </Tabs.Panel>

                <Tabs.Panel value="field">
                  <Box p={16}>
                    <Text size="xs" fw={600} c="#A3A3A3" tt="uppercase" mb={10}>Coordinator Notes</Text>
                    <Box p={12} mb={20} style={{ background: "#F5F5F5" }}>
                      <Text size="xs" c="#525252" style={{ lineHeight: 1.6 }}>
                        &ldquo;Community leaders have been consulted and are supportive of cash distribution. Women&apos;s groups prefer mobile money due to safety concerns with physical cash. Recommend morning distributions to avoid afternoon heat.&rdquo;
                      </Text>
                      <Text size="xs" c="#A3A3A3" mt={8}>&mdash; Ahmed M., Field Coordinator, Dec 14</Text>
                    </Box>

                    <Text size="xs" fw={600} c="#A3A3A3" tt="uppercase" mb={10}>Accessibility</Text>
                    {[
                      { label: "Road access", value: "Good", color: "#059669" },
                      { label: "Mobile network", value: "Intermittent", color: "#F59E0B" },
                      { label: "Distribution points", value: "2 identified", color: undefined },
                    ].map((a) => (
                      <Group key={a.label} justify="space-between" py={6} className="border-b border-[#E5E5E5]">
                        <Text size="xs">{a.label}</Text>
                        <Text size="xs" fw={500} c={a.color}>{a.value}</Text>
                      </Group>
                    ))}

                    {/* Security Considerations - NEW */}
                    <Text size="xs" fw={600} c="#A3A3A3" tt="uppercase" mt={20} mb={10}>Security Considerations</Text>
                    <Box p={12} mb={8} style={{ background: "#FEF3C7" }}>
                      <Group gap={8}>
                        <IconShieldCheck size={16} color="#D97706" />
                        <Text size="sm" fw={500} c="#D97706">Moderate Risk</Text>
                      </Group>
                    </Box>
                    <Text size="xs" c="#525252" style={{ lineHeight: 1.5 }} mb={16}>
                      Avoid large gatherings. Recommend staggered distribution times and multiple smaller distribution points.
                    </Text>

                    <Box mt={16} p={12} style={{ background: "#F5F5F5" }}>
                      <Text size="xs" c="#A3A3A3" mb={4}>Last Field Visit</Text>
                      <Text size="sm" fw={600}>December 12, 2024</Text>
                    </Box>
                  </Box>
                </Tabs.Panel>
              </Tabs>
            </Card>
          </Box>
        </Group>

        {/* Data Sources */}
        <Text size="sm" fw={600} c="#171717" mb={12}>Data Sources</Text>
        <SimpleGrid cols={2} spacing={16}>
          {[
            { title: "Rapid Assessment", org: "NRC/UNHCR", date: "10/21/2025", pct: 68, color: "#2563EB" },
            { title: "Census Projection", org: "National Statistics", date: "2024 Baseline", pct: 100, color: "#059669" },
          ].map((src) => (
            <Card key={src.title} p={16} style={{ border: "1px solid #E5E5E5" }}>
              <Group justify="space-between" mb={8}>
                <Box>
                  <Text fw={600} c="#171717" style={{ fontSize: 14 }}>{src.title}</Text>
                  <Text size="xs" c="#A3A3A3">{src.org}</Text>
                  <Text size="xs" c="#A3A3A3">{src.date}</Text>
                </Box>
                <Text size="sm" fw={600} style={{ fontFamily: "monospace" }} c={src.color}>{src.pct}%</Text>
              </Group>
              <Box style={{ height: 4, background: "#F5F5F5" }}>
                <Box style={{ height: "100%", width: `${src.pct}%`, background: src.color }} />
              </Box>
            </Card>
          ))}
        </SimpleGrid>
      </Box>

      {/* Distribution Wizard Modal */}
      <NewDistributionWizard
        opened={showDistributionWizard}
        onClose={() => setShowDistributionWizard(false)}
      />
    </Box>
  );
}
