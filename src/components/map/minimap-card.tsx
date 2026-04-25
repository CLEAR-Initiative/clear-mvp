"use client";

import { useState, useMemo } from "react";
import dynamic from "next/dynamic";
import { Box, Text, Group, Select, Checkbox } from "@mantine/core";
import Link from "next/link";
import { IconMap, IconMapPin, IconLayersLinked } from "@tabler/icons-react";
import { api } from "~/trpc/react";
import type { MapMarker } from "~/components/map/crisis-map";

const CrisisMap = dynamic(
  () => import("~/components/map/crisis-map").then((m) => m.CrisisMap),
  { ssr: false, loading: () => <Box style={{ width: "100%", aspectRatio: "4/3", background: "#F5F5F5" }} /> },
);

type BoundaryLevel = "none" | "A1" | "A2";

const BOUNDARY_OPTIONS = [
  { value: "none", label: "None" },
  { value: "A1",   label: "A1 - States" },
  { value: "A2",   label: "A2 - Districts" },
];

interface MinimapCardProps {
  markers: MapMarker[];
  center: [number, number];
  sudanGeometry: unknown | undefined;
  sudanId: string | null;
}

export function MinimapCard({ markers, center, sudanGeometry, sudanId }: MinimapCardProps) {
  const [layersOpen, setLayersOpen] = useState(false);
  const [boundaryLevel, setBoundaryLevel] = useState<BoundaryLevel>("none");
  const [showPopulation, setShowPopulation] = useState(false);

  const a1Query = api.locations.getAdminBoundaries.useQuery(
    { level: 1, countryId: sudanId ?? undefined },
    { enabled: boundaryLevel === "A1" && !!sudanId, staleTime: 1000 * 60 * 60, refetchOnWindowFocus: false },
  );
  const a2Query = api.locations.getAdminBoundaries.useQuery(
    { level: 2, countryId: sudanId ?? undefined },
    { enabled: boundaryLevel === "A2" && !!sudanId, staleTime: 1000 * 60 * 60, refetchOnWindowFocus: false },
  );
  const adminBoundaries = useMemo(() => {
    if (boundaryLevel === "A1") return a1Query.data ?? [];
    if (boundaryLevel === "A2") return a2Query.data ?? [];
    return [];
  }, [boundaryLevel, a1Query.data, a2Query.data]);
  const adminBoundaryLevel = boundaryLevel === "A1" ? 1 : boundaryLevel === "A2" ? 2 : undefined;

  const populationQuery = api.locations.getPopulationBoundaries.useQuery(
    { countryId: sudanId ?? undefined },
    { enabled: showPopulation && !!sudanId, staleTime: Infinity, refetchOnWindowFocus: false },
  );
  const populationBoundaries = useMemo(
    () => (showPopulation ? (populationQuery.data ?? []) : []),
    [showPopulation, populationQuery.data],
  );

  return (
    <Box p={0} style={{ border: "1px solid #E5E5E5", background: "#fff" }}>
      {/* Header */}
      <Box px={16} py={10} className="border-b border-[#E5E5E5]">
        <Group justify="space-between">
          <Group gap={6}>
            <IconMapPin size={14} color="#525252" />
            <Text fw={600} c="#171717" style={{ fontSize: 13 }}>Location</Text>
          </Group>
          <Link href="/map" style={{ textDecoration: "none" }}>
            <Group gap={4} className="hover:opacity-70">
              <IconMap size={12} color="#E85D3D" />
              <Text size="xs" c="#E85D3D" fw={500}>Full map</Text>
            </Group>
          </Link>
        </Group>
      </Box>

      {/* Map area */}
      <Box style={{ aspectRatio: "4/3", position: "relative" }}>
        <CrisisMap
          markers={markers}
          center={center}
          zoom={4.5}
          className="w-full h-full"
          focusCountryPCode="SD"
          focusCountryName="Sudan"
          focusCountryGeometry={sudanGeometry}
          fitBoundsOnFocus={false}
          adminBoundaries={adminBoundaries}
          adminBoundaryLevel={adminBoundaryLevel as 1 | 2 | undefined}
          populationBoundaries={populationBoundaries}
        />

        {/* Layers toggle button */}
        <Box style={{ position: "absolute", top: 6, left: 6, zIndex: 10 }}>
          <button
            title="Layers"
            onClick={() => setLayersOpen((o) => !o)}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              width: 26, height: 26,
              border: "1px solid #E5E5E5", borderRadius: 4,
              background: layersOpen ? "#DBEAFE" : "#fff",
              color: layersOpen ? "#2563EB" : "#525252",
              cursor: "pointer", padding: 0,
              boxShadow: "0 1px 3px rgba(0,0,0,0.12)",
            }}
          >
            <IconLayersLinked size={13} />
          </button>

          {layersOpen && (
            <Box
              style={{
                position: "absolute", top: 30, left: 0,
                width: 180,
                background: "#fff",
                border: "1px solid #E5E5E5",
                boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
                zIndex: 20,
                padding: "10px 12px",
              }}
            >
              <Text fw={700} tt="uppercase" c="#737373" style={{ fontSize: 9, letterSpacing: "0.06em", opacity: 0.7 }} mb={6}>
                Boundaries
              </Text>
              <Select
                size="xs"
                value={boundaryLevel}
                onChange={(v) => setBoundaryLevel((v ?? "none") as BoundaryLevel)}
                data={BOUNDARY_OPTIONS}
                mb={10}
                styles={{ input: { fontWeight: 600, fontSize: 12 } }}
              />
              <Box
                style={{ borderTop: "1px solid #F0F0F0", paddingTop: 8 }}
              >
                <Group
                  gap={8}
                  className="cursor-pointer"
                  onClick={() => setShowPopulation((v) => !v)}
                  style={{ userSelect: "none" }}
                >
                  <Checkbox
                    size="xs"
                    checked={showPopulation}
                    onChange={(e) => setShowPopulation(e.currentTarget.checked)}
                    styles={{ input: { cursor: "pointer" } }}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <Text size="xs" c="#525252" style={{ fontSize: 12 }}>Population</Text>
                </Group>
              </Box>
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
}
