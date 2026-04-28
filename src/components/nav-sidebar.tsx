"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSelectedLayoutSegments } from "next/navigation";
import { Box, Text, Badge, UnstyledButton, Tooltip, Menu, Drawer } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
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
  IconDoorExit,
  IconShieldCog,
  IconChevronLeft,
  IconChevronRight,
  IconBuilding,
  IconSelector,
  IconMenu2,
} from "@tabler/icons-react";
import { cn } from "~/lib/utils";
import { authClient } from "~/lib/auth-client";
import { NrcLogoMark } from "~/components/ui/nrc-logo-mark";
import { colors, fontSizesPx, spacingPx } from "~/lib/tokens";
import { api } from "~/trpc/react";
import { useTeam } from "~/providers/team-provider";
import { useFeatureFlags } from "~/components/feature-flags-provider";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  featureKey?: string;
  badge?: number;
  disabled?: boolean;
  demo?: boolean;
  /** Hidden entirely for non-admin users */
  adminOnly?: boolean;
  /** Shown but greyed out with "Coming Soon" for non-admin users */
  comingSoonForNonAdmin?: boolean;
}

interface NavSection {
  title: string;
  items: NavItem[];
  /** Hide the entire section for non-admin users */
  adminOnly?: boolean;
}

const navSections: NavSection[] = [
  {
    title: "MAIN",
    items: [
      { label: "Overview",           href: "/dashboard",  icon: IconLayoutDashboard, featureKey: "overview" },
      { label: "Crisis Detection",   href: "/detection",  icon: IconTarget,          featureKey: "detection" },
      { label: "Crisis Map",         href: "/map",        icon: IconMapPin,          featureKey: "crisis_map" },
      { label: "Situation Analysis", href: "/analysis",   icon: IconChartPie,        featureKey: "analysis",        comingSoonForNonAdmin: true },
      { label: "Operations",         href: "/operations", icon: IconUser,            featureKey: "operations",      adminOnly: true },
      { label: "Cash Assistance",    href: "/cash",       icon: IconCurrencyDollar,  featureKey: "cash_assistance", adminOnly: true },
    ],
  },
  {
    title: "RESOURCES",
    items: [
      { label: "Knowledge Hub", href: "/knowledge", icon: IconBook, featureKey: "knowledge_hub", comingSoonForNonAdmin: true },
    ],
  },
];

const EXPANDED_W  = 240;
const COLLAPSED_W = 80;
const TRANSITION  = "200ms ease";

function TeamSwitcher({ collapsed, labelStyle }: { collapsed: boolean; labelStyle: React.CSSProperties }) {
  const { activeTeam, teams, switchTeam } = useTeam();

  if (!teams?.length) return null;

  return (
    <Box style={{ borderBottom: `1px solid ${colors.border}`, flexShrink: 0 }}>
      <Menu width={220} position="bottom-start">
        <Menu.Target>
          <UnstyledButton
            style={{
              display: "flex",
              alignItems: "center",
              gap: spacingPx[3],
              padding: `${spacingPx[3]}px ${spacingPx[5]}px`,
              width: "100%",
            }}
            className="hover:bg-[#F5F5F5] transition-colors"
          >
            <IconBuilding size={18} style={{ flexShrink: 0, opacity: 0.6 }} />
            <Box style={{ flex: 1, minWidth: 0, ...labelStyle }}>
              <Text size="xs" fw={600} truncate="end">
                {activeTeam?.name ?? "Select team"}
              </Text>
              <Text size="xs" c="dimmed" truncate="end">
                {activeTeam?.organisation.name}
              </Text>
            </Box>
            <IconSelector size={14} style={{ opacity: 0.5, flexShrink: 0, ...labelStyle }} />
          </UnstyledButton>
        </Menu.Target>
        <Menu.Dropdown>
          {teams.map((team) => (
            <Menu.Item
              key={team.id}
              onClick={() => switchTeam(team.id)}
              bg={team.id === activeTeam?.id ? colors.accentLight : undefined}
            >
              <Text size="sm" fw={500}>{team.name}</Text>
              <Text size="xs" c="dimmed">{team.organisation.name}</Text>
            </Menu.Item>
          ))}
          <Menu.Divider />
          <Menu.Item component={Link} href="/settings/org">
            Manage organisations
          </Menu.Item>
        </Menu.Dropdown>
      </Menu>
    </Box>
  );
}

export function NavSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, { open: openMobile, close: closeMobile }] = useDisclosure(false);
  const segments = useSelectedLayoutSegments();
  const activeSegment = segments[0] ?? "";
  const router = useRouter();
  const { data: authData } = api.auth.me.useQuery(undefined, { staleTime: 60_000 });
  const isAdmin = authData?.user?.role === "admin";
  const { flags } = useFeatureFlags();

  const handleLogout = async () => {
    try { await authClient.signOut(); } catch { /* ignore */ }
    localStorage.clear();
    sessionStorage.clear();
    // Hard redirect to clear all in-memory state and let the server handle cookie cleanup
    window.location.href = "/auth/login";
  };

  // Text labels: fade out instantly on collapse, fade in after drawer has widened
  const labelStyle: React.CSSProperties = {
    opacity:    collapsed ? 0 : 1,
    transition: collapsed ? "opacity 80ms ease" : "opacity 100ms ease 160ms",
    whiteSpace: "nowrap",
    overflow:   "hidden",
  };

  return (
    <>
    {/* Mobile hamburger button */}
    <Box
      hiddenFrom="sm"
      style={{
        position: "fixed",
        top: 12,
        left: 12,
        zIndex: 200,
      }}
    >
      <UnstyledButton
        onClick={openMobile}
        style={{
          width: 40,
          height: 40,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 8,
          background: colors.bgWhite,
          border: `1px solid ${colors.border}`,
          boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
        }}
      >
        <IconMenu2 size={22} style={{ color: colors.textSecondary }} />
      </UnstyledButton>
    </Box>

    {/* Mobile drawer */}
    <Drawer
      opened={mobileOpen}
      onClose={closeMobile}
      size="280px"
      withCloseButton={false}
      hiddenFrom="sm"
      styles={{
        body: { padding: 0, height: "100%", display: "flex", flexDirection: "column" },
        content: { background: colors.bgWhite },
      }}
    >
      {/* Mobile drawer header */}
      <Box style={{ height: 64, borderBottom: `1px solid ${colors.border}`, display: "flex", alignItems: "center", padding: spacingPx[5], gap: spacingPx[5] }}>
        <NrcLogoMark size={32} />
        <Text fw={700} style={{ fontSize: fontSizesPx.xl, color: colors.textPrimary, fontFamily: "Calibri, 'Trebuchet MS', sans-serif" }}>CLEAR</Text>
      </Box>

      {/* Mobile team switcher */}
      <TeamSwitcher collapsed={false} labelStyle={{ opacity: 1, whiteSpace: "nowrap", overflow: "hidden" }} />

      {/* Mobile drawer nav */}
      <Box component="nav" style={{ flex: 1, overflowY: "auto", padding: spacingPx[3] }}>
        {navSections.map((section) => {
          if (section.adminOnly && !isAdmin) return null;
          const visibleItems = section.items.filter((item) => {
            if (item.adminOnly && !isAdmin) return false;
            return item.featureKey ? (flags[item.featureKey] ?? true) : true;
          });
          if (visibleItems.length === 0) return null;
          return (
          <Box key={section.title} mb={spacingPx[5]}>
            <Box style={{ height: 28, display: "flex", alignItems: "flex-end", paddingBottom: 4 }}>
              <Text fw={600} tt="uppercase" px={spacingPx[3]} style={{ letterSpacing: "0.07em", fontSize: fontSizesPx["2xs"], color: colors.textMuted }}>
                {section.title}
              </Text>
            </Box>
            {visibleItems.map((item) => {
              const isDisabled = item.disabled || (!isAdmin && !!item.comingSoonForNonAdmin);
              const itemSegment = item.href.replace(/^\//, "");
              const isActive = !isDisabled && activeSegment === itemSegment;
              const Icon = item.icon;
              const content = (
                <Box
                  key={item.href}
                  style={{
                    display: "flex", alignItems: "center", gap: spacingPx[4],
                    padding: `${spacingPx[4]}px ${spacingPx[3]}px`, borderRadius: 6,
                    cursor: isDisabled ? "not-allowed" : "pointer",
                    opacity: isDisabled ? 0.45 : 1,
                    background: isActive ? colors.accentLight : "transparent",
                    borderLeft: isActive ? `2px solid ${colors.accent}` : "2px solid transparent",
                    color: isActive ? colors.accent : colors.textSecondary,
                    minHeight: 44,
                  }}
                  component="div"
                >
                  <Icon size={20} style={{ flexShrink: 0, opacity: isActive ? 1 : 0.6 }} />
                  <Text fw={isActive ? 600 : 500} style={{ fontSize: fontSizesPx.lg, flex: 1 }}>{item.label}</Text>
                  {isDisabled && <Badge size="xs" variant="light" color="gray" style={{ fontSize: fontSizesPx["2xs"] }}>Soon</Badge>}
                  {!isDisabled && item.demo && <Badge size="xs" variant="light" color="accent" style={{ fontSize: fontSizesPx["2xs"] }}>Demo</Badge>}
                </Box>
              );
              return isDisabled ? content : (
                <Link key={item.href} href={item.href} onClick={closeMobile} style={{ textDecoration: "none", display: "block", color: "inherit" }}>
                  {content}
                </Link>
              );
            })}
          </Box>
          );
        })}
      </Box>

      {/* Mobile drawer footer */}
      <Box style={{ borderTop: `1px solid ${colors.border}`, padding: spacingPx[3] }}>
        {isAdmin && (
          <UnstyledButton component={Link} href="/admin" onClick={closeMobile}
            style={{ display: "flex", alignItems: "center", gap: spacingPx[3], padding: spacingPx[3], width: "100%", borderRadius: 6, color: colors.textSecondary, minHeight: 44 }}
          >
            <IconShieldCog size={18} style={{ opacity: 0.7 }} />
            <Text fw={500} style={{ fontSize: fontSizesPx.lg }}>Admin</Text>
          </UnstyledButton>
        )}
        <Box style={{ display: "flex", alignItems: "center", gap: spacingPx[2] }}>
          <UnstyledButton component={Link} href="/profile" onClick={closeMobile}
            style={{ display: "flex", alignItems: "center", gap: spacingPx[3], padding: spacingPx[3], flex: 1, borderRadius: 6, color: colors.textSecondary, minHeight: 44 }}
          >
            <IconSettings size={18} style={{ opacity: 0.7 }} />
            <Text fw={500} style={{ fontSize: fontSizesPx.lg }}>Settings</Text>
          </UnstyledButton>
          <UnstyledButton onClick={handleLogout}
            style={{ width: 44, height: 44, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 6, color: colors.textMuted }}
          >
            <IconLogout size={18} />
          </UnstyledButton>
        </Box>
      </Box>
    </Drawer>

    {/* Desktop sidebar */}
    <Box
      component="aside"
      visibleFrom="sm"
      style={{
        width:         collapsed ? COLLAPSED_W : EXPANDED_W,
        minWidth:      collapsed ? COLLAPSED_W : EXPANDED_W,
        height:        "100vh",
        position:      "sticky",
        top:           0,
        display:       "flex",
        flexDirection: "column",
        background:    colors.bgWhite,
        borderRight:   `1px solid ${colors.border}`,
        transition:    `width ${TRANSITION}, min-width ${TRANSITION}`,
        overflow:      "hidden",
        flexShrink:    0,
      }}
    >
      {/* ── Logo + toggle ─────────────────────────────────────── */}
      <Box
        style={{
          height:         64,
          borderBottom:   `1px solid ${colors.border}`,
          display:        "flex",
          alignItems:     "flex-start",
          justifyContent: "space-between",
          padding:        spacingPx[5],
          flexShrink:     0,
          background:     colors.bgWhite,
        }}
      >
        <Box style={{ display: "flex", alignItems: "center", gap: spacingPx[5], overflow: "hidden", width: collapsed ? 32 : 150, flexShrink: 0, transition: `width ${TRANSITION}` }}>
          {/* Logo stays visible in both states */}
          <NrcLogoMark size={32} />
          <Text
            fw={700}
            style={{
              fontSize:      fontSizesPx.xl,
              letterSpacing: "0.0em",
              userSelect:    "none",
              color:         colors.textPrimary,
              fontFamily:    "Calibri, 'Trebuchet MS', sans-serif",
              marginTop:     7,
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
              marginTop:      5,
            }}
            className="hover:bg-[#F5F5F5] transition-colors"
          >
            {collapsed ? <IconChevronRight size={16} /> : <IconChevronLeft size={16} />}
          </UnstyledButton>
        </Tooltip>
      </Box>

      {/* ── Team switcher ──────────────────────────────────────── */}
      <TeamSwitcher collapsed={collapsed} labelStyle={labelStyle} />

      {/* ── Navigation ────────────────────────────────────────── */}
      <Box
        component="nav"
        style={{ flex: 1, overflowY: "auto", overflowX: "hidden", padding: `${spacingPx[3]}px ${spacingPx[3]}px` }}
      >
        {navSections.map((section) => {
          if (section.adminOnly && !isAdmin) return null;
          const visibleItems = section.items.filter((item) => {
            if (item.adminOnly && !isAdmin) return false;
            return item.featureKey ? (flags[item.featureKey] ?? true) : true;
          });
          if (visibleItems.length === 0) return null;
          return (
          <Box key={section.title} mb={spacingPx[5]}>
            {/* Section label - always in DOM, fades out */}
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

            {visibleItems.map((item) => {
              const isDisabled = item.disabled || (!isAdmin && !!item.comingSoonForNonAdmin);
              const itemSegment = item.href.replace(/^\//, "");
              const isActive = !isDisabled && activeSegment === itemSegment;
              const Icon = item.icon;

              const row = (
                <Box
                  key={item.href}
                  style={{
                    display:        "flex",
                    alignItems:     "center",
                    gap:            spacingPx[4],
                    padding:        `${spacingPx[4]}px ${spacingPx[3]}px`,
                    borderRadius:   6,
                    position:       "relative",
                    cursor:         isDisabled ? "not-allowed" : "pointer",
                    opacity:        isDisabled ? 0.45 : 1,
                    background:     isActive ? colors.accentLight : "transparent",
                    borderLeft:     isActive ? `2px solid ${colors.accent}` : "2px solid transparent",
                    transition:     "none",
                    textDecoration: "none",
                    color:          isActive ? colors.accent : colors.textSecondary,
                  }}
                  className={cn(!isDisabled && !isActive && "hover:bg-[#F5F5F5] hover:!text-[#171717]")}
                  component="div"
                >
                  <Icon size={20} style={{ flexShrink: 0, opacity: isActive ? 1 : 0.6 }} />

                  <Text
                    fw={isActive ? 600 : 500}
                    style={{ fontSize: fontSizesPx.lg, flex: 1, ...labelStyle }}
                  >
                    {item.label}
                  </Text>

                  {isDisabled && (
                    <Badge
                      size="xs"
                      variant="light"
                      color="gray"
                      style={{ fontSize: fontSizesPx["2xs"], fontWeight: 500, padding: "0 5px", flexShrink: 0, ...labelStyle }}
                    >
                      Soon
                    </Badge>
                  )}

                  {!isDisabled && item.demo && (
                    <Badge
                      size="xs"
                      variant="light"
                      color="accent"
                      style={{ fontSize: fontSizesPx["2xs"], fontWeight: 500, padding: "0 5px", flexShrink: 0, ...labelStyle }}
                    >
                      Demo
                    </Badge>
                  )}

                </Box>
              );

              const linked = isDisabled ? row : (
                <Link key={item.href} href={item.href} style={{ textDecoration: "none", display: "block", color: "inherit" }}>
                  {row}
                </Link>
              );

              return collapsed ? (
                <Tooltip key={item.href} label={item.disabled ? `${item.label} (soon)` : item.label} position="right" withArrow>
                  {linked}
                </Tooltip>
              ) : linked;
            })}
          </Box>
          );
        })}
      </Box>

      {/* Bottom actions */}
      <Box style={{ borderTop: `1px solid ${colors.border}`, padding: spacingPx[3], flexShrink: 0 }}>
        {/* Admin - only visible to admin role */}
        {isAdmin && (() => {
          const isActive = activeSegment === "admin";
          const inner = (
            <UnstyledButton
              component={Link}
              href="/admin"
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
                marginBottom:   spacingPx[1],
              }}
              className="hover:bg-[#F5F5F5] transition-colors"
            >
              <IconShieldCog size={18} style={{ opacity: 0.7, flexShrink: 0 }} />
              <Text fw={500} style={{ fontSize: fontSizesPx.lg, ...labelStyle }}>Admin</Text>
            </UnstyledButton>
          );
          return collapsed ? <Tooltip label="Admin" position="right" withArrow>{inner}</Tooltip> : inner;
        })()}

        {/* Settings + exit row */}
        <Box style={{ display: "flex", alignItems: "center", gap: spacingPx[2] }}>
        {/* Settings - takes remaining width */}
        {(() => {
          const isActive = activeSegment === "profile";
          const inner = (
            <UnstyledButton
              component={Link}
              href="/profile"
              style={{
                display:        "flex",
                alignItems:     "center",
                gap:            spacingPx[3],
                padding:        spacingPx[3],
                flex:           1,
                borderRadius:   6,
                textDecoration: "none",
                background:     isActive ? colors.accentLight : "transparent",
                color:          isActive ? colors.accent : colors.textSecondary,
                transition:     "background 150ms",
              }}
              className="hover:bg-[#F5F5F5] transition-colors"
            >
              <IconSettings size={18} style={{ opacity: 0.7, flexShrink: 0 }} />
              <Text fw={500} style={{ fontSize: fontSizesPx.lg, ...labelStyle }}>Settings</Text>
            </UnstyledButton>
          );
          return collapsed ? <Tooltip label="Settings" position="right" withArrow>{inner}</Tooltip> : inner;
        })()}

        {/* Exit menu */}
        <Menu position="top-end" withArrow offset={6}>
          <Menu.Target>
            {collapsed ? (
              <Tooltip label="Sign out" position="right" withArrow>
                <UnstyledButton
                  style={{
                    width:          36,
                    height:         36,
                    display:        "flex",
                    alignItems:     "center",
                    justifyContent: "center",
                    borderRadius:   6,
                    color:          colors.textMuted,
                    flexShrink:     0,
                    transition:     "background 150ms",
                  }}
                  className="hover:bg-[#F5F5F5] transition-colors"
                >
                  <IconDoorExit size={18} />
                </UnstyledButton>
              </Tooltip>
            ) : (
              <UnstyledButton
                style={{
                  width:          36,
                  height:         36,
                  display:        "flex",
                  alignItems:     "center",
                  justifyContent: "center",
                  borderRadius:   6,
                  color:          colors.textMuted,
                  flexShrink:     0,
                  transition:     "background 150ms",
                }}
                className="hover:bg-[#F5F5F5] transition-colors"
              >
                <IconDoorExit size={18} />
              </UnstyledButton>
            )}
          </Menu.Target>
          <Menu.Dropdown>
            <Menu.Item
              leftSection={<IconLogout size={14} />}
              color="red"
              onClick={handleLogout}
              style={{ fontSize: fontSizesPx.base }}
            >
              Sign out
            </Menu.Item>
          </Menu.Dropdown>
        </Menu>
        </Box>
      </Box>
    </Box>
    </>
  );
}
