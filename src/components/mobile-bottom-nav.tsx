"use client";

import { useRef } from "react";
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
import { useOptimisticNavSegment } from "~/hooks/use-optimistic-nav-segment";
import { useSlidingNavIndicator } from "~/hooks/use-sliding-nav-indicator";
import { SlidingNavIndicator } from "~/components/ui/sliding-nav-indicator";
import { usePageTransition } from "~/components/page-transition";
import { isModifiedNavClick } from "~/components/page-transition-intent";

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
  const { displaySegment, setOptimisticSegment } = useOptimisticNavSegment(activeSegment);
  const { beginPageTransition } = usePageTransition();
  const navRef = useRef<HTMLElement>(null);
  const indicator = useSlidingNavIndicator(navRef, displaySegment || null);

  return (
    <Box
      ref={navRef}
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
        paddingInline: 4,
      }}
      hiddenFrom="sm"
    >
      <SlidingNavIndicator box={indicator} variant="bottom" />
      {bottomNavItems.map((item) => {
        const isActive = displaySegment === item.segment;
        const Icon = item.icon;

        return (
          <Link
            key={item.href}
            href={item.href}
            data-nav-segment={item.segment}
            onClick={(e) => {
              if (isModifiedNavClick(e)) return;
              setOptimisticSegment(item.segment);
              beginPageTransition(item.href);
            }}
            style={{
              position: "relative",
              zIndex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 2,
              textDecoration: "none",
              flex: 1,
              padding: `${spacingPx[2]}px 0`,
              borderRadius: 10,
            }}
          >
            <Icon
              size={22}
              style={{
                color: isActive ? colors.accent : colors.textMuted,
                strokeWidth: isActive ? 2.2 : 1.8,
                transition: "color 180ms ease-out, stroke-width 180ms ease-out",
              }}
            />
            <Text
              style={{
                fontSize: fontSizesPx["2xs"],
                fontWeight: isActive ? 600 : 500,
                color: isActive ? colors.accent : colors.textMuted,
                transition: "color 180ms ease-out",
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
