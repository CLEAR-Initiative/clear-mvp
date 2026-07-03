"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSelectedLayoutSegments } from "next/navigation";
import { useTranslations } from "next-intl";
import { Box, Text, Badge, UnstyledButton, Tooltip, Menu, Drawer } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { FeedbackModal } from "~/components/feedback-modal";
import {
  IconLayoutDashboard,
  IconTarget,
  IconChartPie,
  IconUser,
  IconCurrencyDollar,
  IconBook,
  IconMapPin,
  IconRobot,
  IconLogout,
  IconSettings,
  IconDoorExit,
  IconShieldCog,
  IconSpeakerphone,
  IconChevronLeft,
  IconChevronRight,
  IconMenu2,
} from "@tabler/icons-react";
import { cn } from "~/lib/utils";
import { authClient } from "~/lib/auth-client";
import { NrcLogoMark } from "~/components/ui/nrc-logo-mark";
import { colors, fontSizesPx, spacingPx } from "~/lib/tokens";
import { api } from "~/trpc/react";
import { useFeatureFlags } from "~/components/feature-flags-provider";
import { isPlatformAdmin } from "~/lib/roles";

type NavItemKey =
  | "overview"
  | "detection"
  | "map"
  | "insights"
  | "operations"
  | "cash"
  | "knowledge"
  | "agent";

interface NavItem {
  labelKey: NavItemKey;
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
  titleKey: "main" | "resources";
  items: NavItem[];
  /** Hide the entire section for non-admin users */
  adminOnly?: boolean;
}

const navSections: NavSection[] = [
  {
    titleKey: "main",
    items: [
      { labelKey: "overview", href: "/dashboard", icon: IconLayoutDashboard, featureKey: "overview" },
      { labelKey: "detection", href: "/detection", icon: IconTarget, featureKey: "detection" },
      { labelKey: "map", href: "/map", icon: IconMapPin, featureKey: "crisis_map" },
      { labelKey: "insights", href: "/insights", icon: IconChartPie, featureKey: "insights" },
      { labelKey: "operations", href: "/operations", icon: IconUser, featureKey: "operations", adminOnly: true },
      { labelKey: "cash", href: "/cash", icon: IconCurrencyDollar, featureKey: "cash_assistance", adminOnly: true },
    ],
  },
  {
    titleKey: "resources",
    items: [
      { labelKey: "knowledge", href: "/knowledge", icon: IconBook, featureKey: "knowledge_hub", comingSoonForNonAdmin: true },
      { labelKey: "agent", href: "/agent", icon: IconRobot, featureKey: "agent" },
    ],
  },
];

const EXPANDED_W = 240;
const COLLAPSED_W = 80;
const TRANSITION = "200ms ease";



export function NavSidebar() {
  const t = useTranslations("nav");
  const tBadges = useTranslations("common.badges");
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, { open: openMobile, close: closeMobile }] = useDisclosure(false);
  const [feedbackOpen, { open: openFeedback, close: closeFeedback }] = useDisclosure(false);
  const segments = useSelectedLayoutSegments();
  const activeSegment = segments[0] ?? "";
  const router = useRouter();
  const { data: authData } = api.auth.me.useQuery(undefined, { staleTime: 60_000 });
  const isAdmin = isPlatformAdmin(authData?.user?.role);
  const { flags } = useFeatureFlags();

  const handleLogout = async () => {
    try { await authClient.signOut(); } catch { /* ignore */ }
    // Don't wipe localStorage / sessionStorage indiscriminately — that was
    // erasing the feature-flag overrides cache and any other persisted UI
    // preferences. Better Auth manages the session cookie, and the hard
    // redirect below tears down all in-memory React state. If a specific
    // app key ever needs clearing on sign-out, remove it explicitly here.
    window.location.href = "/auth/login";
  };


  // Text labels: fade out instantly on collapse, fade in after drawer has widened
  const labelStyle: React.CSSProperties = {
    opacity: collapsed ? 0 : 1,
    transition: collapsed ? "opacity 80ms ease" : "opacity 100ms ease 160ms",
    whiteSpace: "nowrap",
    overflow: "hidden",
  };

  return (
    <>
      {/* Mobile hamburger button */}
      <Box
        hiddenFrom="sm"
        style={{
          position: "fixed",
          top: 12,
          insetInlineStart: 12,
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
              <Box key={section.titleKey} mb={spacingPx[5]}>
                <Box style={{ height: 28, display: "flex", alignItems: "flex-end", paddingBottom: 4 }}>
                  <Text fw={600} tt="uppercase" px={spacingPx[3]} style={{ letterSpacing: "0.07em", fontSize: fontSizesPx["2xs"], color: colors.textMuted }}>
                    {t(`sections.${section.titleKey}`)}
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
                        borderInlineStart: isActive ? `2px solid ${colors.accent}` : "2px solid transparent",
                        color: isActive ? colors.accent : colors.textSecondary,
                        minHeight: 44,
                      }}
                      component="div"
                    >
                      <Icon size={20} style={{ flexShrink: 0, opacity: isActive ? 1 : 0.6 }} />
                      <Text fw={isActive ? 600 : 500} style={{ fontSize: fontSizesPx.lg, flex: 1 }}>{t(`items.${item.labelKey}`)}</Text>
                      {isDisabled && <Badge size="xs" variant="light" color="gray" style={{ fontSize: fontSizesPx["2xs"] }}>{tBadges("soon")}</Badge>}
                      {!isDisabled && item.demo && <Badge size="xs" variant="light" color="accent" style={{ fontSize: fontSizesPx["2xs"] }}>{tBadges("demo")}</Badge>}
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
              <Text fw={500} style={{ fontSize: fontSizesPx.lg }}>{t("admin")}</Text>
            </UnstyledButton>
          )}
          <Box style={{ display: "flex", alignItems: "center", gap: spacingPx[2] }}>
            <UnstyledButton component={Link} href="/profile" onClick={closeMobile}
              style={{ display: "flex", alignItems: "center", gap: spacingPx[3], padding: spacingPx[3], flex: 1, borderRadius: 6, color: colors.textSecondary, minHeight: 44 }}
            >
              <IconSettings size={18} style={{ opacity: 0.7 }} />
              <Text fw={500} style={{ fontSize: fontSizesPx.lg }}>{t("settings")}</Text>
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
          width: collapsed ? COLLAPSED_W : EXPANDED_W,
          minWidth: collapsed ? COLLAPSED_W : EXPANDED_W,
          height: "100vh",
          position: "sticky",
          top: 0,
          display: "flex",
          flexDirection: "column",
          background: colors.bgWhite,
          borderInlineEnd: `1px solid ${colors.border}`,
          transition: `width ${TRANSITION}, min-width ${TRANSITION}`,
          overflow: "hidden",
          flexShrink: 0,
        }}
      >
        {/* ── Logo + toggle ─────────────────────────────────────── */}
        <Box
          style={{
            height: 64,
            borderBottom: `1px solid ${colors.border}`,
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            padding: spacingPx[5],
            flexShrink: 0,
            background: colors.bgWhite,
          }}
        >
          <Box style={{ display: "flex", alignItems: "center", gap: spacingPx[5], overflow: "hidden", width: collapsed ? 32 : 150, flexShrink: 0, transition: `width ${TRANSITION}` }}>
            {/* Logo stays visible in both states */}
            <NrcLogoMark size={32} />
            <Text
              fw={700}
              style={{
                fontSize: fontSizesPx.xl,
                letterSpacing: "0.0em",
                userSelect: "none",
                color: colors.textPrimary,
                fontFamily: "Calibri, 'Trebuchet MS', sans-serif",
                marginTop: 7,
                ...labelStyle,
              }}
            >
              CLEAR
            </Text>
          </Box>

          <Tooltip label={collapsed ? t("expand") : t("collapse")} position="right" withArrow>
            <UnstyledButton
              onClick={() => setCollapsed((v) => !v)}
              style={{
                width: 28,
                height: 28,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 6,
                color: colors.textMuted,
                flexShrink: 0,
                marginTop: 5,
              }}
              className="hover:bg-[var(--color-bg-muted)] transition-colors"
            >
              {collapsed ? <IconChevronRight size={16} /> : <IconChevronLeft size={16} />}
            </UnstyledButton>
          </Tooltip>
        </Box>

        {/* ── Team switcher ──────────────────────────────────────── */}

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
              <Box key={section.titleKey} mb={spacingPx[5]}>
                {/* Section label - always in DOM, fades out */}
                <Box style={{ height: 28, display: "flex", alignItems: "flex-end", paddingBottom: 4 }}>
                  <Text
                    fw={600}
                    tt="uppercase"
                    px={spacingPx[3]}
                    style={{
                      letterSpacing: "0.07em",
                      fontSize: fontSizesPx["2xs"],
                      color: colors.textMuted,
                      ...labelStyle,
                    }}
                  >
                    {t(`sections.${section.titleKey}`)}
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
                        display: "flex",
                        alignItems: "center",
                        gap: spacingPx[4],
                        padding: `${spacingPx[4]}px ${spacingPx[3]}px`,
                        borderRadius: 6,
                        position: "relative",
                        cursor: isDisabled ? "not-allowed" : "pointer",
                        opacity: isDisabled ? 0.45 : 1,
                        background: isActive ? colors.accentLight : "transparent",
                        borderInlineStart: isActive ? `2px solid ${colors.accent}` : "2px solid transparent",
                        transition: "none",
                        textDecoration: "none",
                        color: isActive ? colors.accent : colors.textSecondary,
                      }}
                      className={cn(!isDisabled && !isActive && "hover:bg-[var(--color-bg-muted)] hover:!text-[var(--color-text-primary)]")}
                      component="div"
                    >
                      <Icon size={20} style={{ flexShrink: 0, opacity: isActive ? 1 : 0.6 }} />

                      <Text
                        fw={isActive ? 600 : 500}
                        style={{ fontSize: fontSizesPx.lg, flex: 1, ...labelStyle }}
                      >
                        {t(`items.${item.labelKey}`)}
                      </Text>

                      {isDisabled && (
                        <Badge
                          size="xs"
                          variant="light"
                          color="gray"
                          style={{ fontSize: fontSizesPx["2xs"], fontWeight: 500, padding: "0 5px", flexShrink: 0, ...labelStyle }}
                        >
                          {tBadges("soon")}
                        </Badge>
                      )}

                      {!isDisabled && item.demo && (
                        <Badge
                          size="xs"
                          variant="light"
                          color="accent"
                          style={{ fontSize: fontSizesPx["2xs"], fontWeight: 500, padding: "0 5px", flexShrink: 0, ...labelStyle }}
                        >
                          {tBadges("demo")}
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
                    <Tooltip
                      key={item.href}
                      label={item.disabled ? t("itemSoon", { label: t(`items.${item.labelKey}`) }) : t(`items.${item.labelKey}`)}
                      position="right"
                      withArrow
                    >
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
          {/* Feedback */}
          {(() => {
            const inner = (
              <UnstyledButton
                onClick={openFeedback}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: spacingPx[3],
                  padding: spacingPx[3],
                  width: "100%",
                  borderRadius: 6,
                  background: "transparent",
                  color: colors.textSecondary,
                  transition: "background 150ms",
                  marginBottom: spacingPx[1],
                }}
                className="hover:bg-[var(--color-bg-muted)] transition-colors"
              >
                <IconSpeakerphone size={18} style={{ opacity: 0.7, flexShrink: 0 }} />
                <Text fw={500} style={{ fontSize: fontSizesPx.lg, ...labelStyle }}>{t("feedback")}</Text>
              </UnstyledButton>
            );
            return collapsed ? <Tooltip label={t("feedback")} position="right" withArrow>{inner}</Tooltip> : inner;
          })()}


          {/* User Profile Card with Menu */}
          <Menu position="right-start" offset={8} withArrow>
            <Menu.Target>
              <UnstyledButton
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: spacingPx[3],
                  padding: spacingPx[2],
                  borderRadius: 8,
                  background: "var(--color-bg-elevated)",
                  border: "1px solid var(--color-border)",
                  width: "100%",
                  cursor: "pointer",
                  transition: "background 150ms",
                  marginBottom: spacingPx[4],
                }}
                className="hover:bg-[var(--color-bg-hover)] transition-colors"
              >
                {/* Avatar */}
                <Box
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 9999,
                    border: "1px solid var(--color-accent)",
                    background: "var(--color-accent-light)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <Text fw={600} size="sm" c="var(--color-accent)">
                    {authData?.user?.email?.[0]?.toUpperCase() ?? "U"}
                  </Text>
                </Box>

                {/* User info - only show when not collapsed */}
                {!collapsed && (
                  <Box style={{ flex: 1, minWidth: 0, overflow: "hidden" }}>
                    <Text
                      size="xs"
                      fw={500}
                      c="var(--color-text-primary)"
                      style={{ 
                        lineHeight: 1.3,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {authData?.user?.email ?? "User"}
                    </Text>
                    <Text
                      size="10px"
                      c="var(--color-text-muted)"
                      style={{ 
                        lineHeight: 1.5,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {isAdmin ? "Admin Account" : "User Account"}
                    </Text>
                  </Box>
                )}
              </UnstyledButton>
            </Menu.Target>

            <Menu.Dropdown>
              {/* Admin menu item */}
              {isAdmin && (
                <Menu.Item
                  component={Link}
                  href="/admin"
                  leftSection={<IconShieldCog size={16} />}
                >
                  {t("admin")}
                </Menu.Item>
              )}

              {/* Settings menu item */}
              <Menu.Item
                component={Link}
                href="/profile"
                leftSection={<IconSettings size={16} />}
              >
                {t("settings")}
              </Menu.Item>

              <Menu.Divider />

              {/* Sign out menu item */}
              <Menu.Item
                onClick={handleLogout}
                leftSection={<IconDoorExit size={16} />}
                color="red"
              >
                {t("signOut")}
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
        </Box>
      </Box>
      <FeedbackModal opened={feedbackOpen} onClose={closeFeedback} />
    </>
  );
}
