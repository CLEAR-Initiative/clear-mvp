"use client";

import { Box, Text, Loader } from "@mantine/core";
import { useEffect, useState } from "react";
import { useIsDark } from "~/hooks/use-is-dark";

type MapDataView = "alert" | "event" | "signal" | "crisis";

const LOADING_MESSAGES = [
  "Connecting to data sources...",
  "Fetching markers from database...",
  "Loading event data...",
  "Retrieving geographical information...",
  "Processing crisis data...",
  "Preparing map markers...",
];

interface MapPreloaderProps {
  dataView?: MapDataView;
  /** Rotating status line under the spinner (real overlay on). */
  showMessages?: boolean;
}

/**
 * Shared map preload chrome — centered Loader + theme-aware frosted panel.
 * Used by the live MapLoadingOverlay, dynamic-import placeholder, and
 * optimistic /map route shell so the spinner never jumps.
 */
export function MapPreloader({
  dataView = "alert",
  showMessages = true,
}: MapPreloaderProps) {
  const isDark = useIsDark();
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    if (!showMessages) return;
    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % LOADING_MESSAGES.length);
    }, 2000);
    return () => clearInterval(interval);
  }, [showMessages]);

  const dataViewLabel = {
    alert: "Alerts",
    event: "Events",
    signal: "Signals",
    crisis: "Crisis",
  }[dataView];

  return (
    <Box
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 40,
        background: isDark ? "rgba(17, 17, 17, 0.85)" : "rgba(250, 250, 250, 0.85)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
      }}
    >
      {/* Loader pinned to box center — messages sit below without shifting it. */}
      <Box
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          lineHeight: 0,
        }}
      >
        <Loader size={48} />
      </Box>
      {showMessages && (
        <Box
          style={{
            position: "absolute",
            top: "calc(50% + 48px)",
            left: "50%",
            transform: "translateX(-50%)",
            textAlign: "center",
            width: "100%",
            maxWidth: 400,
            paddingInline: 16,
          }}
        >
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
      )}
    </Box>
  );
}

interface MapLoadingOverlayProps {
  dataView: MapDataView;
}

export function MapLoadingOverlay({ dataView }: MapLoadingOverlayProps) {
  return <MapPreloader dataView={dataView} showMessages />;
}

/**
 * Optimistic /map shell. Matches live map page geometry: bleed through app
 * shell gutters on mobile + height 100dvh so the spinner shares the same
 * X/Y as MapLoadingOverlay on the real canvas.
 */
export function MapOptimisticShell() {
  return (
    <Box
      mt={{ base: -56, sm: 0 }}
      mb={{ base: -72, sm: 0 }}
      h="100dvh"
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        overflow: "hidden",
        background: "var(--color-bg-primary)",
      }}
    >
      <MapPreloader dataView="alert" showMessages />
    </Box>
  );
}
