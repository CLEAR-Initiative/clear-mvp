"use client";

import { useState, useMemo } from "react";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { Box, Text, Group, Select, Checkbox } from "@mantine/core";
import Link from "next/link";
import { IconMap, IconMapPin, IconLayersLinked } from "@tabler/icons-react";
import { api } from "~/trpc/react";
import type { MapMarker } from "~/components/map/crisis-map";
import type { GqlLocation } from "~/lib/types/graphql";

const CrisisMap = dynamic(
  () => import("~/components/map/crisis-map").then((m) => m.CrisisMap),
  { ssr: false, loading: () => <Box style={{ width: "100%", aspectRatio: "4/3", background: "var(--color-bg-muted)" }} /> },
);

type BoundaryLevel = "none" | "A1" | "A2";

// labelKey: i18n keys under map.boundaries.* - resolved via t() at render time.
const BOUNDARY_OPTIONS = [
  { value: "none", labelKey: "none" },
  { value: "A1",   labelKey: "a1" },
  { value: "A2",   labelKey: "a2" },
] as const;

interface MinimapCardProps {
  markers: MapMarker[];
  center: [number, number];
  sudanGeometry: unknown | undefined;
  sudanId: string | null;
  /**
   * The primary location for this entity (A2 district or A1 state).
   * MinimapCard uses location.parent.id (for level-2) or location.id (for level-1)
   * to fetch the A1 state geometry and zoom + highlight it - identical to the
   * detection page's region-picker approach.
   */
  location?: GqlLocation | null;
  /** Shown in the header instead of the generic "Location" label. */
  locationName?: string;
  /** Override the "Full map" href (defaults to "/map"). */
  fullMapHref?: string;
}

export function MinimapCard({ markers, center, sudanGeometry, sudanId, location, locationName, fullMapHref = "/map" }: MinimapCardProps) {
  const t = useTranslations("map");
  const [layersOpen, setLayersOpen] = useState(false);
  const [boundaryLevel, setBoundaryLevel] = useState<BoundaryLevel>("A2");
  const [showPopulation, setShowPopulation] = useState(false);

  // Derive the A1 state ID from the location:
  //   level 1 (state)    -> location itself
  //   level 2 (district) -> direct parent
  //   level 3+ (city/point) -> find A1 in ancestors array
  const a1StateId = useMemo(() => {
    if (!location) return null;
    if (location.level === 1) return location.id;
    if (location.level === 2) return location.parent?.id ?? null;
    return location.ancestors?.find((a) => a.level === 1)?.id ?? null;
  }, [location]);

  // Fetch state geometry directly by ID - identical to detection's regionQuery pattern.
  const stateQuery = api.locations.getById.useQuery(
    { id: a1StateId! },
    { enabled: !!a1StateId, staleTime: 1000 * 60 * 60, refetchOnWindowFocus: false },
  );

  const fitBoundsGeometry = stateQuery.data?.geometry ?? undefined;

  const a1BoundaryQuery = api.locations.getAdminBoundaries.useQuery(
    { level: 1, countryId: sudanId ?? undefined },
    { enabled: boundaryLevel === "A1" && !!sudanId, staleTime: 1000 * 60 * 60, refetchOnWindowFocus: false },
  );
  const a2BoundaryQuery = api.locations.getAdminBoundaries.useQuery(
    a1StateId
      ? { level: 2, stateId: a1StateId }
      : { level: 2, countryId: sudanId ?? undefined },
    { enabled: boundaryLevel === "A2" && (!!a1StateId || !!sudanId), staleTime: 1000 * 60 * 60, refetchOnWindowFocus: false },
  );

  const adminBoundaries = useMemo(() => {
    if (boundaryLevel === "A1") return a1BoundaryQuery.data ?? [];
    if (boundaryLevel === "A2") return a2BoundaryQuery.data ?? [];
    return [];
  }, [boundaryLevel, a1BoundaryQuery.data, a2BoundaryQuery.data]);
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
    <Box p={0} style={{ border: "1px solid var(--color-border)", background: "var(--color-bg-white)" }}>
      {/* Header */}
      <Box px={16} py={10} style={{ borderBottom: "1px solid var(--color-border)" }}>
        <Group justify="space-between">
          <Group gap={6}>
            <IconMapPin size={14} color="var(--color-text-secondary)" />
            <Text fw={600} c="var(--color-text-primary)" style={{ fontSize: 13 }}>
              {locationName ?? t("minimap.location")}
            </Text>
          </Group>
          <Link href={fullMapHref} style={{ textDecoration: "none" }}>
            <Group gap={4} className="hover:opacity-70">
              <IconMap size={12} color="var(--color-accent)" />
              <Text size="xs" c="var(--color-accent)" fw={500}>{t("minimap.fullMap")}</Text>
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
          fitBoundsGeometry={fitBoundsGeometry}
          adminBoundaries={adminBoundaries}
          adminBoundaryLevel={adminBoundaryLevel as 1 | 2 | undefined}
          populationBoundaries={populationBoundaries}
        />

        {/* Layers toggle button */}
        <Box style={{ position: "absolute", top: 6, left: 6, zIndex: 10 }}>
          <button
            title={t("panels.layers")}
            onClick={() => setLayersOpen((o) => !o)}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              width: 26, height: 26,
              border: "1px solid var(--color-border)", borderRadius: 4,
              background: layersOpen ? "var(--color-info-light)" : "var(--color-bg-muted)",
              color: layersOpen ? "var(--color-info)" : "var(--color-text-secondary)",
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
                background: "var(--color-bg-white)",
                border: "1px solid var(--color-border)",
                boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
                zIndex: 20,
                padding: "10px 12px",
              }}
            >
              <Text fw={700} tt="uppercase" c="var(--color-text-muted)" style={{ fontSize: 9, letterSpacing: "0.06em", opacity: 0.7 }} mb={6}>
                {t("panels.boundaries")}
              </Text>
              <Select
                size="xs"
                value={boundaryLevel}
                onChange={(v) => setBoundaryLevel((v ?? "none") as BoundaryLevel)}
                data={BOUNDARY_OPTIONS.map((o) => ({ value: o.value, label: t(`boundaries.${o.labelKey}`) }))}
                mb={10}
                styles={{ input: { fontWeight: 600, fontSize: 12 } }}
              />
              <Box
                style={{ borderTop: "1px solid var(--color-border)", paddingTop: 8 }}
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
                  <Text size="xs" c="var(--color-text-secondary)" style={{ fontSize: 12 }}>{t("panels.population")}</Text>
                </Group>
              </Box>
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
}
