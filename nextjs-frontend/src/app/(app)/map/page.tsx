"use client";

import { useEffect, useRef, useState } from "react";
import {
  Box,
  Text,
  Card,
  Group,
  Badge,
  Button,
  TextInput,
} from "@mantine/core";
import {
  IconDownload,
  IconSearch,
  IconPlus,
  IconMinus,
  IconMapPin,
  IconGrid3x3,
} from "@tabler/icons-react";
import Link from "next/link";

const crises = [
  { id: "cholera", name: "Cholera Outbreak", region: "Somali Region", detail: "247 cases", severity: "Critical", severityColor: "#DC2626", severityBg: "#FEE2E2", dotColor: "#DC2626", pulse: true },
  { id: "flooding", name: "Flooding Risk", region: "Oromia Region", detail: "36h warning", severity: "High", severityColor: "#F59E0B", severityBg: "#FEF3C7", dotColor: "#F59E0B", pulse: false },
  { id: "drought", name: "Drought Monitoring", region: "Afar Region", detail: "Early warning", severity: "Medium", severityColor: "#D97706", severityBg: "#FEF3C7", dotColor: "#D97706", pulse: false },
];

const legend = [
  { color: "#DC2626", label: "Critical - Immediate action" },
  { color: "#F59E0B", label: "High - Urgent attention" },
  { color: "#D97706", label: "Medium - Monitoring" },
  { color: "#059669", label: "Response team location" },
  { color: "#2563EB", label: "Resource/logistics hub" },
];

const quickStats = [
  { label: "Active Crises", value: "3", color: "#DC2626" },
  { label: "Teams Deployed", value: "12", color: "#059669" },
  { label: "Regions Affected", value: "3", color: "#171717" },
];

export default function MapPage() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<unknown>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  useEffect(() => {
    if (!mapContainer.current) return;
    if (mapRef.current) return;

    // Load Mapbox GL CSS
    const link = document.createElement("link");
    link.href = "https://api.mapbox.com/mapbox-gl-js/v3.0.1/mapbox-gl.css";
    link.rel = "stylesheet";
    document.head.appendChild(link);

    // Load Mapbox GL JS
    const script = document.createElement("script");
    script.src = "https://api.mapbox.com/mapbox-gl-js/v3.0.1/mapbox-gl.js";
    script.onload = () => {
      const mapboxgl = (window as unknown as Record<string, unknown>)["mapboxgl"] as {
        accessToken: string;
        Map: new (opts: Record<string, unknown>) => {
          on: (event: string, cb: () => void) => void;
          zoomIn: () => void;
          zoomOut: () => void;
          flyTo: (opts: Record<string, unknown>) => void;
        };
        Marker: new (el: HTMLElement) => {
          setLngLat: (coords: number[]) => { setPopup: (popup: unknown) => { addTo: (map: unknown) => void } };
        };
        Popup: new (opts: Record<string, unknown>) => {
          setHTML: (html: string) => unknown;
        };
      };

      mapboxgl.accessToken = "pk.eyJ1Ijoic2FtZnJvbnMiLCJhIjoiY20wcXprNHFmMDM5dDJpb3A3czEyYXU2OCJ9.z7lv5-q6CZW8Xq59kn1bYA";

      const map = new mapboxgl.Map({
        container: mapContainer.current!,
        style: "mapbox://styles/mapbox/light-v11",
        center: [40.5, 8.5],
        zoom: 5.5,
      });

      mapRef.current = map;

      map.on("load", () => {
        setMapLoaded(true);

        // Add crisis markers
        const markerData = [
          { coords: [42.79, 9.35], color: "#DC2626", name: "Cholera - Jijiga", info: "158 cases" },
          { coords: [44.2, 6.73], color: "#DC2626", name: "Cholera - Kebridehar", info: "89 cases" },
          { coords: [39.76, 7.0], color: "#F59E0B", name: "Flood Risk - Bale", info: "36h warning" },
          { coords: [40.0, 11.5], color: "#D97706", name: "Drought - Afar", info: "Early warning" },
          { coords: [42.5, 9.2], color: "#059669", name: "WASH Team Alpha", info: "6 members" },
          { coords: [44.0, 6.5], color: "#059669", name: "Health Team Bravo", info: "5 members" },
        ];

        markerData.forEach((m) => {
          const el = document.createElement("div");
          el.style.cssText = `width: 14px; height: 14px; background: ${m.color}; cursor: pointer;`;

          const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(
            `<div style="font-family: Inter, sans-serif;"><div style="font-weight: 600; font-size: 13px;">${m.name}</div><div style="font-size: 12px; color: #6B7280;">${m.info}</div></div>`
          );

          new mapboxgl.Marker(el)
            .setLngLat(m.coords)
            .setPopup(popup as unknown as undefined)
            .addTo(map);
        });
      });
    };
    document.body.appendChild(script);

    return () => {
      link.remove();
      script.remove();
    };
  }, []);

  const handleZoomIn = () => {
    const map = mapRef.current as { zoomIn: () => void } | null;
    map?.zoomIn();
  };
  const handleZoomOut = () => {
    const map = mapRef.current as { zoomOut: () => void } | null;
    map?.zoomOut();
  };
  const handleResetView = () => {
    const map = mapRef.current as { flyTo: (opts: Record<string, unknown>) => void } | null;
    map?.flyTo({ center: [40.5, 8.5], zoom: 5.5 });
  };

  return (
    <Box style={{ position: "relative", height: "100vh", overflow: "hidden" }}>
      {/* Map Header Overlay */}
      <Box
        style={{
          position: "absolute", top: 0, left: 0, right: 0, zIndex: 100,
          padding: "16px 24px",
          background: "linear-gradient(to bottom, rgba(255,255,255,0.95), rgba(255,255,255,0))",
          display: "flex", justifyContent: "space-between", alignItems: "flex-start",
        }}
      >
        <Box>
          <Text fw={600} c="#171717" style={{ fontSize: 16 }}>Crisis Map</Text>
          <Text size="xs" c="#A3A3A3" mt={4}>Ethiopia \u2022 Real-time situational awareness</Text>
        </Box>
        <Group gap={8}>
          <TextInput
            placeholder="Search locations..."
            size="xs"
            leftSection={<IconSearch size={14} />}
            style={{ width: 250 }}
            styles={{ input: { boxShadow: "0 2px 4px rgba(0,0,0,0.1)" } }}
          />
          <Button variant="outline" color="gray" size="xs" leftSection={<IconDownload size={14} />}
            style={{ background: "white", boxShadow: "0 2px 4px rgba(0,0,0,0.1)", fontSize: 13 }}>
            Export
          </Button>
        </Group>
      </Box>

      {/* Full Screen Map */}
      <div ref={mapContainer} style={{ height: "100vh", width: "100%" }} />

      {/* Quick Stats (Top Right under header) */}
      <Box style={{ position: "absolute", top: 80, right: 24, zIndex: 100, display: "flex", gap: 12 }}>
        {quickStats.map((s) => (
          <Box key={s.label} style={{ background: "white", padding: "12px 16px", boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}>
            <Text c="#737373" fw={600} tt="uppercase" style={{ fontSize: 11, letterSpacing: "0.5px" }}>{s.label}</Text>
            <Text fw={700} c={s.color} style={{ fontSize: 28 }}>{s.value}</Text>
          </Box>
        ))}
      </Box>

      {/* Map Controls (Right side) */}
      <Box style={{ position: "absolute", top: "50%", right: 24, transform: "translateY(-50%)", zIndex: 100, display: "flex", flexDirection: "column", gap: 8 }}>
        <Button variant="outline" color="gray" size="xs" style={{ width: 40, height: 40, padding: 0, background: "white", boxShadow: "0 2px 4px rgba(0,0,0,0.1)" }}
          onClick={handleZoomIn}>
          <IconPlus size={20} />
        </Button>
        <Button variant="outline" color="gray" size="xs" style={{ width: 40, height: 40, padding: 0, background: "white", boxShadow: "0 2px 4px rgba(0,0,0,0.1)" }}
          onClick={handleZoomOut}>
          <IconMinus size={20} />
        </Button>
        <Box style={{ height: 8 }} />
        <Button variant="outline" color="gray" size="xs" style={{ width: 40, height: 40, padding: 0, background: "white", boxShadow: "0 2px 4px rgba(0,0,0,0.1)" }}
          onClick={handleResetView}>
          <IconMapPin size={20} />
        </Button>
        <Button variant="outline" color="gray" size="xs" style={{ width: 40, height: 40, padding: 0, background: "white", boxShadow: "0 2px 4px rgba(0,0,0,0.1)" }}>
          <IconGrid3x3 size={20} />
        </Button>
      </Box>

      {/* Active Crises Panel (Bottom Left) */}
      <Box style={{ position: "absolute", bottom: 24, left: 24, zIndex: 100, width: 320 }}>
        <Card p={0} style={{ boxShadow: "0 4px 12px rgba(0,0,0,0.15)", border: "1px solid #E5E5E5" }}>
          <Box px={16} py={12}>
            <Text fw={600} size="sm">Active Crises</Text>
          </Box>
          {crises.map((crisis, i) => (
            <Link key={crisis.id} href={`/crisis/${crisis.id}`} style={{ textDecoration: "none", color: "inherit" }}>
              <Box
                px={16} py={12}
                className={`hover:bg-[#F9FAFB] ${i < crises.length - 1 ? "border-b border-[#E5E5E5]" : ""}`}
              >
                <Group gap={12}>
                  <Box style={{
                    width: 10, height: 10, background: crisis.dotColor,
                    animation: crisis.pulse ? "pulse 2s infinite" : undefined,
                  }} />
                  <Box style={{ flex: 1 }}>
                    <Text fw={600} size="sm" c="#171717">{crisis.name}</Text>
                    <Text size="xs" c="#A3A3A3">{crisis.region} \u2022 {crisis.detail}</Text>
                  </Box>
                  <Badge size="xs" style={{ background: crisis.severityBg, color: crisis.severityColor, fontSize: 10 }}>
                    {crisis.severity}
                  </Badge>
                </Group>
              </Box>
            </Link>
          ))}
        </Card>
      </Box>

      {/* Legend (Bottom Right) */}
      <Box style={{ position: "absolute", bottom: 24, right: 24, zIndex: 100 }}>
        <Card p={0} style={{ boxShadow: "0 4px 12px rgba(0,0,0,0.15)", border: "1px solid #E5E5E5", width: 200 }}>
          <Box px={16} py={12}>
            <Text fw={600} size="sm">Legend</Text>
          </Box>
          <Box px={16} py={12}>
            {legend.map((item) => (
              <Group key={item.label} gap={8} mb={8}>
                <Box style={{ width: 16, height: 16, background: item.color }} />
                <Text size="xs">{item.label}</Text>
              </Group>
            ))}
          </Box>
        </Card>
      </Box>

      {/* Pulse animation */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </Box>
  );
}
