"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Box,
  Card,
  Group,
  Text,
  Button,
  TextInput,
  SimpleGrid,
  Select,
  UnstyledButton,
} from "@mantine/core";
import {
  IconSearch,
  IconUpload,
  IconMapPin,
  IconX,
} from "@tabler/icons-react";
import { PageHeader } from "~/components/ui";
import {
  locationData,
  contentTypes,
  activeCrises,
  allDocuments,
  allContacts,
} from "./_components/knowledge-data";
import { HumChatSidebar } from "./_components/humchat-sidebar";
import { CrisisResources } from "./_components/crisis-resources";
import { DocumentLibrary } from "./_components/document-library";
import { ContactsPanel } from "./_components/contacts-panel";

export default function KnowledgePage() {
  const [isChatExpanded, setIsChatExpanded] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Location filters
  const [selectedRegion, setSelectedRegion] = useState<string | null>("all");
  const [selectedCountry, setSelectedCountry] = useState<string | null>("all");
  const [selectedZone, setSelectedZone] = useState<string | null>("all");
  const [selectedType, setSelectedType] = useState<string | null>("all");

  // Available countries based on selected region
  const availableCountries = useMemo(() => {
    const region = selectedRegion ?? "all";
    if (region === "all") return [{ value: "all", label: "All Countries" }];
    const regionData = locationData.regions.find((r) => r.id === region);
    if (!regionData) return [{ value: "all", label: "All Countries" }];
    return [
      { value: "all", label: "All Countries" },
      ...regionData.countries.map((c) => ({ value: c, label: locationData.countries[c]?.name ?? c })),
    ];
  }, [selectedRegion]);

  // Available zones based on selected country
  const availableZones = useMemo(() => {
    const country = selectedCountry ?? "all";
    if (country === "all") return [{ value: "all", label: "All Zones" }];
    const countryData = locationData.countries[country];
    if (!countryData) return [{ value: "all", label: "All Zones" }];
    return [
      { value: "all", label: "All Zones" },
      ...countryData.zones.map((z) => ({ value: z, label: locationData.zones[z]?.name ?? z })),
    ];
  }, [selectedCountry]);

  // Reset dependent filters when parent changes
  useEffect(() => {
    setSelectedCountry("all");
    setSelectedZone("all");
  }, [selectedRegion]);

  useEffect(() => {
    setSelectedZone("all");
  }, [selectedCountry]);

  // Filter crises
  const filteredCrises = useMemo(() => {
    const region = selectedRegion ?? "all";
    const country = selectedCountry ?? "all";
    const zone = selectedZone ?? "all";
    return activeCrises.filter((crisis) => {
      if (region !== "all" && crisis.region !== region) return false;
      if (country !== "all" && crisis.country !== country) return false;
      if (zone !== "all" && crisis.zone !== zone) return false;
      return true;
    });
  }, [selectedRegion, selectedCountry, selectedZone]);

  // Filter documents
  const filteredDocuments = useMemo(() => {
    const region = selectedRegion ?? "all";
    const country = selectedCountry ?? "all";
    const type = selectedType ?? "all";
    return allDocuments.filter((doc) => {
      if (region !== "all" && doc.region !== "all" && doc.region !== region) return false;
      if (country !== "all" && doc.country !== "all" && doc.country !== country) return false;
      if (type !== "all" && doc.type !== type) return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (!doc.title.toLowerCase().includes(query) && !doc.sector.toLowerCase().includes(query)) return false;
      }
      return true;
    });
  }, [selectedRegion, selectedCountry, selectedType, searchQuery]);

  // Filter contacts
  const filteredContacts = useMemo(() => {
    const region = selectedRegion ?? "all";
    const country = selectedCountry ?? "all";
    const zone = selectedZone ?? "all";
    return allContacts.filter((contact) => {
      if (region !== "all" && contact.region !== region) return false;
      if (country !== "all" && contact.country !== country) return false;
      if (zone !== "all" && contact.zone !== "all" && contact.zone !== zone) return false;
      return true;
    });
  }, [selectedRegion, selectedCountry, selectedZone]);

  const hasActiveFilters = (selectedRegion ?? "all") !== "all" || (selectedCountry ?? "all") !== "all" || (selectedZone ?? "all") !== "all" || (selectedType ?? "all") !== "all" || searchQuery;

  const clearFilters = () => {
    setSelectedRegion("all");
    setSelectedCountry("all");
    setSelectedZone("all");
    setSelectedType("all");
    setSearchQuery("");
  };

  return (
    <Box style={{ display: "flex", height: "100vh" }}>
      {/* Main Content */}
      <Box style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column", transition: "all 0.3s ease" }}>
        <PageHeader title="Knowledge Hub">
          <TextInput
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.currentTarget.value)}
            placeholder="Search documents..."
            size="xs"
            leftSection={<IconSearch size={14} />}
            style={{ width: 200 }}
          />
          <Button size="xs" leftSection={<IconUpload size={14} />} style={{ background: "#E85D3D", borderColor: "#E85D3D", fontSize: 13 }}>
            Upload
          </Button>
        </PageHeader>

        <Box style={{ flex: 1, overflowY: "auto" }} p={24}>
          {/* Location Filters Bar */}
          <Card p={16} mb={24} style={{ border: "1px solid #E5E5E5" }}>
            <Group gap={8} mb={12}>
              <IconMapPin size={16} color="#E85D3D" />
              <Text fw={600} c="var(--color-text-primary)" style={{ fontSize: 13 }}>Filter by Location & Type</Text>
              {hasActiveFilters && (
                <UnstyledButton
                  onClick={clearFilters}
                  ml="auto"
                  style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "#737373" }}
                  className="hover:text-[#E85D3D]"
                >
                  <IconX size={12} /> Clear filters
                </UnstyledButton>
              )}
            </Group>
            <Group gap={12}>
              <Select
                label="Region"
                size="xs"
                value={selectedRegion}
                onChange={setSelectedRegion}
                data={[
                  { value: "all", label: "All Regions" },
                  ...locationData.regions.map((r) => ({ value: r.id, label: r.name })),
                ]}
                style={{ minWidth: 180 }}
                styles={{ label: { fontSize: 11, color: "#737373", fontWeight: 500 } }}
              />
              <Select
                label="Country"
                size="xs"
                value={selectedCountry}
                onChange={setSelectedCountry}
                data={availableCountries}
                disabled={(selectedRegion ?? "all") === "all"}
                style={{ minWidth: 160 }}
                styles={{ label: { fontSize: 11, color: "#737373", fontWeight: 500 } }}
              />
              <Select
                label="Zone"
                size="xs"
                value={selectedZone}
                onChange={setSelectedZone}
                data={availableZones}
                disabled={(selectedCountry ?? "all") === "all"}
                style={{ minWidth: 160 }}
                styles={{ label: { fontSize: 11, color: "#737373", fontWeight: 500 } }}
              />
              <Box style={{ borderLeft: "1px solid #E5E5E5", height: 32, margin: "auto 4px" }} />
              <Select
                label="Type"
                size="xs"
                value={selectedType}
                onChange={setSelectedType}
                data={contentTypes}
                style={{ minWidth: 140 }}
                styles={{ label: { fontSize: 11, color: "#737373", fontWeight: 500 } }}
              />
            </Group>
          </Card>

          {/* Active Crisis Resources */}
          {filteredCrises.length > 0 && (
            <Box mb={24}>
              <CrisisResources filteredCrises={filteredCrises} />
            </Box>
          )}

          {/* Two Column: Document Library + Contacts */}
          <SimpleGrid cols={{ base: 1, lg: 3 }} spacing={16}>
            <Box style={{ gridColumn: "span 2" }}>
              <DocumentLibrary filteredDocuments={filteredDocuments} />
            </Box>
            <ContactsPanel filteredContacts={filteredContacts} />
          </SimpleGrid>
        </Box>
      </Box>

      {/* HumChat Sidebar */}
      <Box
        style={{
          width: isChatExpanded ? 380 : 0,
          flexShrink: 0,
          transition: "width 0.3s ease",
          overflow: "hidden",
          height: "100vh",
        }}
      >
        <HumChatSidebar isExpanded={isChatExpanded} onToggle={() => setIsChatExpanded(!isChatExpanded)} />
      </Box>
      {!isChatExpanded && (
        <HumChatSidebar isExpanded={false} onToggle={() => setIsChatExpanded(true)} />
      )}
    </Box>
  );
}
