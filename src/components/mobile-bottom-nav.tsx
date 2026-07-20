"use client";

import { useState } from "react";
import Link from "next/link";
import { useSelectedLayoutSegments } from "next/navigation";
import { useTranslations } from "next-intl";
import { Box, Text } from "@mantine/core";
import {
  IconLayoutDashboard,
  IconTarget,
  IconMapPin,
  IconSettings,
} from "@tabler/icons-react";
import { colors, fontSizesPx, spacingPx } from "~/lib/tokens";

const bottomNavItems = [
  { labelKey: "items.overview",  href: "/dashboard", icon: IconLayoutDashboard, segment: "dashboard" },
  { labelKey: "items.detection", href: "/detection", icon: IconTarget,          segment: "detection" },
  { labelKey: "items.map",       href: "/map",       icon: IconMapPin,          segment: "map" },
  { labelKey: "settings",        href: "/profile",   icon: IconSettings,        segment: "profile" },
] as const;

export function MobileBottomNav() {
  const t = useTranslations("nav");
  const segments = useSelectedLayoutSegments();
  const activeSegment = segments[0] ?? "";
  const [optimisticSegment, setOptimisticSegment] = useState<string | null>(null);

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
        const isActive = (optimisticSegment ?? activeSegment) === item.segment;
        const Icon = item.icon;

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setOptimisticSegment(item.segment)}
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
                transition: "color 150ms ease-out, stroke-width 150ms ease-out",
              }}
            />
            <Text
              style={{
                fontSize: fontSizesPx["2xs"],
                fontWeight: isActive ? 600 : 500,
                color: isActive ? colors.accent : colors.textMuted,
                transition: "color 150ms ease-out, font-weight 150ms ease-out",
              }}
            >
              {t(item.labelKey)}
            </Text>
          </Link>
        );
      })}
    </Box>
  );
}
