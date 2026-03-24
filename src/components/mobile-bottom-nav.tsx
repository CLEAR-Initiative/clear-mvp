"use client";

import Link from "next/link";
import { useSelectedLayoutSegments } from "next/navigation";
import { Box, Text } from "@mantine/core";
import {
  IconLayoutDashboard,
  IconTarget,
  IconMapPin,
  IconSettings,
} from "@tabler/icons-react";
import { colors, fontSizesPx, spacingPx } from "~/lib/tokens";

const bottomNavItems = [
  { label: "Overview",   href: "/dashboard",    icon: IconLayoutDashboard, segment: "dashboard" },
  { label: "Detection",  href: "/detection",    icon: IconTarget,          segment: "detection" },
  { label: "Map",        href: "/map",          icon: IconMapPin,          segment: "map" },
  { label: "Settings",   href: "/profile",      icon: IconSettings,        segment: "profile" },
];

export function MobileBottomNav() {
  const segments = useSelectedLayoutSegments();
  const activeSegment = segments[0] ?? "";

  return (
    <Box
      component="nav"
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        height: 64,
        background: colors.bgWhite,
        borderTop: `1px solid ${colors.border}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-around",
        zIndex: 100,
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
      hiddenFrom="sm"
    >
      {bottomNavItems.map((item) => {
        const isActive = activeSegment === item.segment;
        const Icon = item.icon;

        return (
          <Link
            key={item.href}
            href={item.href}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 2,
              textDecoration: "none",
              flex: 1,
              padding: `${spacingPx[2]}px 0`,
            }}
          >
            <Icon
              size={22}
              style={{
                color: isActive ? colors.accent : colors.textMuted,
                strokeWidth: isActive ? 2.2 : 1.8,
              }}
            />
            <Text
              style={{
                fontSize: fontSizesPx["2xs"],
                fontWeight: isActive ? 600 : 500,
                color: isActive ? colors.accent : colors.textMuted,
              }}
            >
              {item.label}
            </Text>
          </Link>
        );
      })}
    </Box>
  );
}
