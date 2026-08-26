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
  /** Error state - shows branded offline message instead of spinner */
  error?: { message: string; onRetry?: () => void } | null;
}

export function MapLoadingOverlay({ dataView, error }: MapLoadingOverlayProps) {
  if (error) {
    return <MapErrorState message={error.message} onRetry={error.onRetry} />;
  }
  return <MapPreloader dataView={dataView} showMessages />;
}

interface MapErrorStateProps {
  message: string;
  onRetry?: () => void;
}

function MapErrorState({ message, onRetry }: MapErrorStateProps) {
  const isDark = useIsDark();
  
  return (
    <Box
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 40,
        background: isDark ? "rgba(17, 17, 17, 0.95)" : "rgba(250, 250, 250, 0.95)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <svg
        width="64"
        height="64"
        viewBox="0 0 24 24"
        fill="none"
        stroke="var(--color-text-tertiary)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ marginBottom: 24 }}
      >
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
      
      <Text size="xl" fw={600} mb="xs" c="var(--color-text-primary)" ta="center">
        Unable to Load Map
      </Text>
      
      <Text
        size="sm"
        c="var(--color-text-secondary)"
        ta="center"
        maw={400}
        mb={onRetry ? 24 : 0}
      >
        {message}
      </Text>
      
      {onRetry && (
        <button
          onClick={onRetry}
          style={{
            padding: "10px 20px",
            borderRadius: 6,
            border: `1px solid ${isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.2)"}`,
            background: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)",
            color: "var(--color-text-primary)",
            fontSize: 14,
            fontWeight: 500,
            cursor: "pointer",
            transition: "all 0.2s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)";
          }}
        >
          Try Again
        </button>
      )}
    </Box>
  );
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
