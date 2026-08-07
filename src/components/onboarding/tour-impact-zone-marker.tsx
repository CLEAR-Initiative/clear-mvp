"use client";

import { Box, Text } from "@mantine/core";
import { IconAlertTriangle } from "@tabler/icons-react";
import { useTranslations } from "next-intl";

/** Decorative impact-zone marker shown during the map tour (Figma step 2). */
export function TourImpactZoneMarker() {
  const t = useTranslations("onboarding.tour.widgets");

  return (
    <Box
      data-tour="impact-zone"
      style={{
        position: "absolute",
        top: "42%",
        left: "58%",
        zIndex: 11,
        transform: "translate(-50%, -50%)",
        pointerEvents: "none",
      }}
    >
      <Box
        style={{
          position: "absolute",
          top: -16,
          left: "50%",
          transform: "translateX(-50%)",
          background: "white",
          border: "4px solid #f4f4f5",
          borderRadius: 9999,
          padding: "4px 12px",
          whiteSpace: "nowrap",
        }}
      >
        <Text fw={900} size="sm" c="#ff5a1f">
          220
        </Text>
      </Box>
      <Box
        style={{
          width: 112,
          height: 112,
          borderRadius: "50%",
          border: "4px solid rgba(255, 90, 31, 0.4)",
          background: "rgba(255, 90, 31, 0.2)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Box
          style={{
            width: 64,
            height: 64,
            borderRadius: "50%",
            background: "#ff5a1f",
            border: "4px solid rgba(255, 255, 255, 0.2)",
            boxShadow: "0 10px 15px -3px rgba(255, 90, 31, 0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <IconAlertTriangle size={20} color="white" fill="white" />
        </Box>
      </Box>
      <Box style={{ position: "absolute", top: 120, right: -40, textAlign: "right" }}>
        <Text fw={900} tt="uppercase" c="#161618" style={{ fontSize: 9 }}>
          {t("impactZone")}
        </Text>
        <Text c="#71717a" style={{ fontSize: 9 }}>
          {t("impactZoneHint")}
        </Text>
      </Box>
    </Box>
  );
}
