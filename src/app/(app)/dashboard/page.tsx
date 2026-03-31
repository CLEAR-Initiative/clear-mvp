"use client";

import { useState, useMemo } from "react";
import { Box } from "@mantine/core";
import { nrcLocations, getOperationalLocations } from "~/lib/data/nrc-locations";
import { MapSection } from "./_components/map-section";
import { RightPanel } from "./_components/right-panel";

// Detailed region options for priority countries
const countryRegions: Record<string, string[]> = {
  Sudan: ["All Regions", "Khartoum", "North Darfur", "South Darfur", "West Darfur", "Central Darfur", "Blue Nile", "Red Sea", "Kassala"],
  Ethiopia: ["All Regions", "Somali", "Oromia", "Afar", "Amhara", "Tigray", "SNNPR"],
  "South Sudan": ["All Regions", "Central Equatoria", "Jonglei", "Unity", "Upper Nile", "Lakes"],
  Somalia: ["All Regions", "Banadir", "Bay", "Gedo", "Lower Juba", "Middle Shabelle"],
  Yemen: ["All Regions", "Sana'a", "Aden", "Taiz", "Hodeidah", "Marib"],
};

const priorityCenters: Record<string, { center: [number, number]; zoom: number }> = {
  Sudan: { center: [30.0, 15.5], zoom: 5.0 },
  Ethiopia: { center: [40.5, 8.5], zoom: 5.5 },
  "South Sudan": { center: [31.0, 7.0], zoom: 5.5 },
  Somalia: { center: [46.0, 5.0], zoom: 5.0 },
  Yemen: { center: [48.0, 15.5], zoom: 5.5 },
};

function getCountryConfig(country: string): { center: [number, number]; zoom: number; regions: string[] } {
  if (priorityCenters[country]) {
    return {
      center: priorityCenters[country].center,
      zoom: priorityCenters[country].zoom,
      regions: countryRegions[country] ?? ["All Regions"],
    };
  }
  const loc = nrcLocations.find((l) => l.country === country);
  return {
    center: loc ? [loc.longitude, loc.latitude] : [30.0, 15.5],
    zoom: 5.5,
    regions: ["All Regions"],
  };
}

export default function DashboardPage() {
  const [selectedCountry, setSelectedCountry] = useState("Sudan");
  const [selectedRegion, setSelectedRegion] = useState("All Regions");
  const [activeView, setActiveView] = useState("single");
  const [activeMonth, setActiveMonth] = useState(2);

  const countryConfig = useMemo(() => getCountryConfig(selectedCountry), [selectedCountry]);

  const countries = useMemo(
    () =>
      [...new Set([...Object.keys(countryRegions), ...getOperationalLocations().map((l) => l.country)])].sort(),
    [],
  );

  const handleCountryChange = (country: string) => {
    setSelectedCountry(country);
    setSelectedRegion("All Regions");
    if (activeView === "nrc-global") {
      setActiveView("single");
    }
  };

  return (
    <Box className="flex flex-col sm:flex-row overflow-hidden" style={{ height: "100vh" }}>
      <MapSection
        selectedCountry={selectedCountry}
        selectedRegion={selectedRegion}
        onCountryChange={handleCountryChange}
        onRegionChange={(v) => setSelectedRegion(v ?? "All Regions")}
        activeView={activeView}
        onViewChange={setActiveView}
        mapCenter={countryConfig.center}
        mapZoom={countryConfig.zoom}
        activeMonth={activeMonth}
        onMonthChange={setActiveMonth}
        countries={countries}
        regionOptions={countryConfig.regions}
      />
      <RightPanel
        selectedCountry={selectedCountry}
        onCountryChange={handleCountryChange}
        onViewChange={setActiveView}
        activeView={activeView}
      />
    </Box>
  );
}
