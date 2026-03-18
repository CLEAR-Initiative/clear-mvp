"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Box, Text, Badge, UnstyledButton, Tooltip } from "@mantine/core";
import {
  IconLayoutDashboard,
  IconTarget,
  IconChartPie,
  IconUser,
  IconCurrencyDollar,
  IconBook,
  IconMapPin,
  IconLogout,
  IconSettings,
  IconChevronLeft,
  IconChevronRight,
} from "@tabler/icons-react";
import { cn } from "~/lib/utils";
import { authClient } from "~/lib/auth-client";
import { NrcLogoMark } from "~/components/ui/nrc-logo-mark";
import { colors, fontSizesPx, spacingPx } from "~/lib/tokens";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  badge?: number;
  disabled?: boolean;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    title: "MAIN",
    items: [
      { label: "Overview",        href: "/dashboard",  icon: IconLayoutDashboard },
      { label: "Detection",       href: "/detection",  icon: IconTarget, badge: 3 },
      { label: "Analysis",        href: "/analysis",   icon: IconChartPie,       disabled: true },
      { label: "Operations",      href: "/operations", icon: IconUser,           disabled: true },
      { label: "Cash Assistance", href: "/cash",       icon: IconCurrencyDollar, disabled: true },
    ],
  },
  {
    title: "RESOURCES",
    items: [
      { label: "Knowledge Hub", href: "/knowledge", icon: IconBook,   disabled: true },
      { label: "Crisis Map",    href: "/map",       icon: IconMapPin },
    ],
  },
];

const EXPANDED_W = 240;
const COLLAPSED_W = 64;
const TRANSITION  = "200ms ease";

export function NavSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const router   = useRouter();

  const handleLogout = async () => {
    try { await authClient.signOut(); } catch { /* ignore */ }
    router.push("/auth/login");
  };

  // Text labels: fade out instantly on collapse, fade in after drawer has widened
  const labelStyle: React.CSSProperties = {
    opacity:    collapsed ? 0 : 1,
    transition: collapsed ? "opacity 80ms ease" : "opacity 100ms ease 160ms",
    whiteSpace: "nowrap",
    overflow:   "hidden",
  };

  return (
    <Box
      component="aside"
      style={{
        width:      collapsed ? COLLAPSED_W : EXPANDED_W,
        minWidth:   collapsed ? COLLAPSED_W : EXPANDED_W,
        height:     "100vh",
        position:   "sticky",
        top:        0,
        display:    "flex",
        flexDirection: "column",
        background: colors.bgWhite,
        borderRight: `1px solid ${colors.border}`,
        transition: `width ${TRANSITION}, min-width ${TRANSITION}`,
        overflow:   "hidden",
        flexShrink: 0,
      }}
    >
      {/* ── Logo + toggle ─────────────────────────────────────── */}
      <Box
        style={{
          height:         64,
          borderBottom:   `1px solid ${colors.border}`,
          display:        "flex",
          alignItems:     "center",
          justifyContent: "space-between",
          padding:        `0 ${spacingPx[4]}px`,
          flexShrink:     0,
          background:     colors.bgWhite,
        }}
      >
        <Box style={{ display: "flex", alignItems: "center", gap: spacingPx[3] }}>
          {/* Logo stays visible in both states */}
          <NrcLogoMark size={32} />
          <Text
            fw={500}
            style={{
              fontSize:      fontSizesPx.xl,
              letterSpacing: "0.0em",
              userSelect:    "none",
              color:         colors.textPrimary,
              ...labelStyle,
            }}
          >
            CLEAR
          </Text>
        </Box>

        <Tooltip label={collapsed ? "Expand" : "Collapse"} position="right" withArrow>
          <UnstyledButton
            onClick={() => setCollapsed((v) => !v)}
            style={{
              width:          28,
              height:         28,
              display:        "flex",
              alignItems:     "center",
              justifyContent: "center",
              borderRadius:   6,
              color:          colors.textMuted,
              flexShrink:     0,
            }}
            className="hover:bg-[#F5F5F5] transition-colors"
          >
            {collapsed ? <IconChevronRight size={16} /> : <IconChevronLeft size={16} />}
          </UnstyledButton>
        </Tooltip>
      </Box>

      {/* ── Navigation ────────────────────────────────────────── */}
      <Box
        component="nav"
        style={{ flex: 1, overflowY: "auto", overflowX: "hidden", padding: `${spacingPx[3]}px ${spacingPx[2]}px` }}
      >
        {navSections.map((section) => (
          <Box key={section.title} mb={spacingPx[3]}>
            {/* Section label — always in DOM, fades out */}
            <Box style={{ height: 28, display: "flex", alignItems: "flex-end", paddingBottom: 4 }}>
              <Text
                fw={600}
                tt="uppercase"
                px={spacingPx[3]}
                style={{
                  letterSpacing: "0.07em",
                  fontSize:      fontSizesPx["2xs"],
                  color:         colors.textMuted,
                  ...labelStyle,
                }}
              >
                {section.title}
              </Text>
            </Box>

            {section.items.map((item) => {
              const isActive =
                !item.disabled &&
                (pathname === item.href ||
                  (item.href !== "/dashboard" && pathname.startsWith(item.href)));
              const Icon = item.icon;

              const row = (
                <Box
                  key={item.href}
                  style={{
                    display:        "flex",
                    alignItems:     "center",
                    gap:            spacingPx[3],
                    padding:        spacingPx[3],
                    borderRadius:   6,
                    position:       "relative",
                    cursor:         item.disabled ? "not-allowed" : "pointer",
                    opacity:        item.disabled ? 0.45 : 1,
                    background:     isActive ? colors.accentLight : "transparent",
                    borderLeft:     isActive ? `2px solid ${colors.accent}` : "2px solid transparent",
                    transition:     "background 150ms, color 150ms",
                    textDecoration: "none",
                    color:          isActive ? colors.accent : colors.textSecondary,
                  }}
                  className={cn(!item.disabled && !isActive && "hover:bg-[#F5F5F5] hover:!text-[#171717]")}
                  component="div"
                >
                  <Icon size={18} style={{ flexShrink: 0, opacity: isActive ? 1 : 0.6 }} />

                  <Text
                    fw={isActive ? 600 : 500}
                    style={{ fontSize: fontSizesPx.base, flex: 1, ...labelStyle }}
                  >
                    {item.label}
                  </Text>

                  {item.disabled && (
                    <Badge
                      size="xs"
                      variant="light"
                      color="gray"
                      style={{ fontSize: fontSizesPx["2xs"], fontWeight: 500, padding: "0 5px", flexShrink: 0, ...labelStyle }}
                    >
                      Soon
                    </Badge>
                  )}

                  {!item.disabled && item.badge !== undefined && (
                    <Badge
                      size="xs"
                      color="red"
                      variant="filled"
                      style={{ fontSize: fontSizesPx.xs, fontWeight: 600, minWidth: 18, padding: "0 6px", flexShrink: 0, ...labelStyle }}
                    >
                      {item.badge}
                    </Badge>
                  )}

                  {/* Dot badge visible only when collapsed */}
                  {!item.disabled && item.badge !== undefined && (
                    <Box
                      style={{
                        position:      "absolute",
                        top:           6,
                        right:         8,
                        width:         7,
                        height:        7,
                        borderRadius:  "50%",
                        background:    colors.critical,
                        opacity:       collapsed ? 1 : 0,
                        transition:    collapsed ? "opacity 80ms ease" : "opacity 100ms ease 160ms",
                        pointerEvents: "none",
                      }}
                    />
                  )}
                </Box>
              );

              return collapsed ? (
                <Tooltip key={item.href} label={item.disabled ? `${item.label} (soon)` : item.label} position="right" withArrow>
                  {row}
                </Tooltip>
              ) : (
                <Box key={item.href}>{row}</Box>
              );
            })}
          </Box>
        ))}
      </Box>

      {/* ── Bottom actions ────────────────────────────────────── */}
      <Box style={{ borderTop: `1px solid ${colors.border}`, padding: spacingPx[2], flexShrink: 0 }}>
        {(() => {
          const isActive = pathname === "/profile";
          const inner = (
            <UnstyledButton
              component={Link}
              href="/profile"
              style={{
                display:        "flex",
                alignItems:     "center",
                gap:            spacingPx[3],
                padding:        spacingPx[3],
                width:          "100%",
                borderRadius:   6,
                textDecoration: "none",
                background:     isActive ? colors.accentLight : "transparent",
                color:          isActive ? colors.accent : colors.textSecondary,
                transition:     "background 150ms",
              }}
              className="hover:bg-[#F5F5F5] transition-colors"
            >
              <IconSettings size={16} style={{ opacity: 0.7, flexShrink: 0 }} />
              <Text fw={500} style={{ fontSize: fontSizesPx.sm, ...labelStyle }}>Settings</Text>
            </UnstyledButton>
          );
          return collapsed ? <Tooltip label="Settings" position="right" withArrow>{inner}</Tooltip> : inner;
        })()}

        {(() => {
          const inner = (
            <UnstyledButton
              onClick={handleLogout}
              style={{
                display:       "flex",
                alignItems:    "center",
                gap:           spacingPx[3],
                padding:       spacingPx[3],
                width:         "100%",
                borderRadius:  6,
                color:         colors.critical,
                transition:    "background 150ms",
              }}
              className="hover:bg-[#FEE2E2] transition-colors"
            >
              <IconLogout size={16} style={{ opacity: 0.7, flexShrink: 0 }} />
              <Text fw={500} style={{ fontSize: fontSizesPx.sm, color: colors.critical, ...labelStyle }}>Sign Out</Text>
            </UnstyledButton>
          );
          return collapsed ? <Tooltip label="Sign out" position="right" withArrow>{inner}</Tooltip> : inner;
        })()}
      </Box>
    </Box>
  );
}
