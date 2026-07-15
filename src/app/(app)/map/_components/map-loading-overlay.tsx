import { Box, Text, Loader } from "@mantine/core";
import { useEffect, useState } from "react";

interface MapLoadingOverlayProps {
  /** Current data view being loaded */
  dataView: "alert" | "event" | "signal" | "crisis";
}

const LOADING_MESSAGES = [
  "Connecting to data sources...",
  "Fetching markers from database...",
  "Loading event data...",
  "Retrieving geographical information...",
  "Processing crisis data...",
  "Preparing map markers...",
];

export function MapLoadingOverlay({ dataView }: MapLoadingOverlayProps) {
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % LOADING_MESSAGES.length);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const dataViewLabel = {
    alert: "Alerts",
    event: "Events",
    signal: "Signals",
    crisis: "Crisis",
  }[dataView];

  return (
    <Box
      className="absolute inset-0 z-40 flex flex-col items-center justify-center"
      style={{
        background: "rgba(250, 250, 250, 0.85)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        transition: "opacity 0.2s ease",
      }}
    >
      {/* Simple spinner */}
      <Box
        style={{
          marginBottom: 24,
        }}
      >
        <Loader size={48} />
      </Box>

      {/* Loading message */}
      <Box style={{ textAlign: "center", maxWidth: 400 }}>
        <Text size="lg" fw={600} mb="xs" c="var(--color-text-primary)">
          Loading {dataViewLabel}
        </Text>
        <Text
          size="sm"
          c="dimmed"
          style={{
            minHeight: 20,
            transition: "opacity 0.3s ease",
          }}
        >
          {LOADING_MESSAGES[messageIndex]}
        </Text>
      </Box>

      {/* Dark mode support */}
      <style>{`
        @media (prefers-color-scheme: dark) {
          .absolute.z-40 {
            background: rgba(17, 17, 17, 0.85) !important;
          }
        }
        [data-mantine-color-scheme="dark"] .absolute.z-40 {
          background: rgba(17, 17, 17, 0.85) !important;
        }
      `}</style>
    </Box>
  );
}
