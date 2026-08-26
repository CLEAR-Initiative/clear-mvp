"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSelectedLayoutSegments, useSearchParams } from "next/navigation";
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
  IconLogout,
  IconSettings,
  IconDoorExit,
  IconShieldCog,
  IconSpeakerphone,
  IconChevronLeft,
  IconChevronRight,
  IconMenu2,
  IconX,
} from "@tabler/icons-react";
import { cn } from "~/lib/utils";
import { authClient } from "~/lib/auth-client";
import { NrcLogoMark } from "~/components/ui/nrc-logo-mark";
import { colors, fontSizesPx, spacingPx } from "~/lib/tokens";
import { api } from "~/trpc/react";
import { useFeatureFlags } from "~/components/feature-flags-provider";
import { isPlatformAdmin } from "~/lib/roles";
import {
  isMapNavOverlay,
  useOptimisticNavSegment,
} from "~/hooks/use-optimistic-nav-segment";
import { useSlidingNavIndicator } from "~/hooks/use-sliding-nav-indicator";
import { SlidingNavIndicator } from "~/components/ui/sliding-nav-indicator";
import { usePageTransition } from "~/components/page-transition";
import { isModifiedNavClick } from "~/components/page-transition-intent";

type NavItemKey =
  | "overview"
  | "detection"
  | "map"
  | "insights"
  | "operations"
  | "cash"
  | "knowledge";

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
  const [mobileOpen, { close: closeMobile, toggle: toggleMobile }] = useDisclosure(false);
  const [feedbackOpen, { open: openFeedback, close: closeFeedback }] = useDisclosure(false);
  const segments = useSelectedLayoutSegments();
  const searchParams = useSearchParams();
  const activeSegment = segments[0] ?? "";
  const referrer = searchParams.get("from");
  const {
    displaySegment: effectiveSegment,
    optimisticSegment,
    setOptimisticSegment,
  } = useOptimisticNavSegment(activeSegment, referrer);
  // Frost overlay only on real /map (or optimistic navigate-to-map).
  // Do not key off effectiveSegment — detail `?from=map` highlights Map in
  // the nav but must keep the solid in-flow sidebar so content isn't under glass.
  // While still on /map, overlay stays even if optimism leaves — dropping it
  // early flex-resizes the Mapbox canvas (white flash).
  const isMapRoute = isMapNavOverlay(activeSegment, optimisticSegment);
  const { beginPageTransition } = usePageTransition();
  const desktopNavRef = useRef<HTMLElement>(null);
  const mobileNavRef = useRef<HTMLElement>(null);
  const desktopIndicator = useSlidingNavIndicator(
    desktopNavRef,
    effectiveSegment || null,
    collapsed,
  );
  const mobileIndicator = useSlidingNavIndicator(
    mobileNavRef,
    effectiveSegment || null,
    mobileOpen,
  );

  const router = useRouter();
  const { data: authData } = api.auth.me.useQuery(undefined, { staleTime: 60_000 });
  const isAdmin = isPlatformAdmin(authData?.user?.role);
  const { flags } = useFeatureFlags();

  // Publish overlay vars before paint so Layers/Filters mount at the final
  // left offset (useEffect painted left-4 first → 200ms horizontal slide).
  useLayoutEffect(() => {
    const w = `${collapsed ? COLLAPSED_W : EXPANDED_W}px`;
    document.documentElement.style.setProperty("--clear-nav-w", w);
    document.body.dataset.navOverlay = isMapRoute ? "true" : "false";
    return () => {
      document.documentElement.style.removeProperty("--clear-nav-w");
      delete document.body.dataset.navOverlay;
      delete document.body.dataset.navOffsetMotion;
    };
  }, [collapsed, isMapRoute]);

  // Enable left transitions only after the first overlay frame — collapse/expand
  // still animates; first map paint does not.
  useEffect(() => {
    if (!isMapRoute) {
      delete document.body.dataset.navOffsetMotion;
      return;
    }
    const id = requestAnimationFrame(() => {
      document.body.dataset.navOffsetMotion = "true";
    });
    return () => cancelAnimationFrame(id);
  }, [isMapRoute]);

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
      {/* Mobile hamburger — right side; sits above the sheet so it can toggle closed */}
      <Box
        hiddenFrom="sm"
        style={{
          position: "fixed",
          top: 12,
          insetInlineEnd: 12,
          zIndex: 401,
        }}
      >
        <UnstyledButton
          onClick={toggleMobile}
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
          aria-expanded={mobileOpen}
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
          {mobileOpen ? (
            <IconX size={22} style={{ color: colors.textSecondary }} />
          ) : (
            <IconMenu2 size={22} style={{ color: colors.textSecondary }} />
          )}
        </UnstyledButton>
      </Box>

      {/* Mobile menu — fullscreen sheet, bottom → top (not a side drawer). */}
      <Drawer
        opened={mobileOpen}
        onClose={closeMobile}
        position="bottom"
        size="100%"
        withCloseButton={false}
        hiddenFrom="sm"
        zIndex={400}
        transitionProps={{ transition: "slide-up", duration: 280, timingFunction: "cubic-bezier(0.32, 0.72, 0, 1)" }}
        styles={{
          body: { padding: 0, height: "100%", display: "flex", flexDirection: "column" },
          content: {
            background: colors.bgWhite,
            borderRadius: 0,
            maxHeight: "100dvh",
          },
          inner: { padding: 0 },
        }}
      >
        {/* Mobile sheet header — leave room for the floating close (burger) button */}
        <Box
          style={{
            height: 64,
            borderBottom: `1px solid ${colors.border}`,
            display: "flex",
            alignItems: "center",
            padding: spacingPx[5],
            paddingInlineEnd: 56,
            paddingTop: "max(12px, env(safe-area-inset-top, 0px))",
            gap: spacingPx[5],
            flexShrink: 0,
          }}
        >
          <NrcLogoMark size={32} />
          <Text fw={700} style={{ fontSize: fontSizesPx.xl, color: colors.textPrimary, fontFamily: "Calibri, 'Trebuchet MS', sans-serif" }}>CLEAR</Text>
        </Box>

        {/* Mobile team switcher */}

        {/* Mobile drawer nav */}
        <Box
          ref={mobileNavRef}
          component="nav"
          style={{ flex: 1, overflowY: "auto", padding: spacingPx[3], position: "relative" }}
        >
          <SlidingNavIndicator box={mobileIndicator} variant="sidebar" />
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
                  const isActive = !isDisabled && effectiveSegment === itemSegment;
                  const Icon = item.icon;
                  const content = (
                    <Box
                      style={{
                        display: "flex", alignItems: "center", gap: spacingPx[4],
                        padding: `${spacingPx[4]}px ${spacingPx[3]}px`, borderRadius: 6,
                        cursor: isDisabled ? "not-allowed" : "pointer",
                        opacity: isDisabled ? 0.45 : 1,
                        background: "transparent",
                        borderInlineStart: "2px solid transparent",
                        color: isActive ? colors.accent : colors.textSecondary,
                        minHeight: 44,
                        transition: "color 180ms ease-out",
                      }}
                      component="div"
                    >
                      <Icon size={20} style={{ flexShrink: 0, opacity: isActive ? 1 : 0.6, transition: "opacity 180ms ease-out" }} />
                      <Text fw={isActive ? 600 : 500} style={{ fontSize: fontSizesPx.lg, flex: 1 }}>{t(`items.${item.labelKey}`)}</Text>
                      {isDisabled && <Badge size="xs" variant="light" color="gray" style={{ fontSize: fontSizesPx["2xs"] }}>{tBadges("soon")}</Badge>}
                      {!isDisabled && item.demo && <Badge size="xs" variant="light" color="accent" style={{ fontSize: fontSizesPx["2xs"] }}>{tBadges("demo")}</Badge>}
                    </Box>
                  );
                  return isDisabled ? (
                    <Box key={item.href}>{content}</Box>
                  ) : (
                    <Link
                      key={item.href}
                      href={item.href}
                      data-nav-segment={itemSegment}
                      onClick={(e) => {
                        if (isModifiedNavClick(e)) return;
                        setOptimisticSegment(itemSegment);
                        beginPageTransition(item.href);
                        closeMobile();
                      }}
                      style={{ textDecoration: "none", display: "block", color: "inherit", position: "relative", zIndex: 1 }}
                    >
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
          {/* Feedback button */}
          <UnstyledButton
            onClick={() => { closeMobile(); openFeedback(); }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: spacingPx[3],
              padding: spacingPx[3],
              width: "100%",
              borderRadius: 6,
              color: colors.textSecondary,
              marginBottom: spacingPx[1],
              background: "transparent",
            }}
            className="hover:bg-[var(--color-bg-muted)] transition-colors"
          >
            <IconSpeakerphone size={18} style={{ opacity: 0.7, flexShrink: 0 }} />
            <Text fw={500} style={{ fontSize: fontSizesPx.lg }}>{t("feedback")}</Text>
          </UnstyledButton>

          {/* User Profile Card */}
          {authData?.user && (
            <Menu position="top" offset={8} withArrow>
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
                      {authData.user.email?.[0]?.toUpperCase() ?? "U"}
                    </Text>
                  </Box>

                  {/* User info */}
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
                      {authData.user.email}
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
                </UnstyledButton>
              </Menu.Target>

              <Menu.Dropdown>
                {isAdmin && (
                  <Menu.Item
                    component={Link}
                    href="/admin"
                    onClick={closeMobile}
                    leftSection={<IconShieldCog size={16} />}
                  >
                    {t("admin")}
                  </Menu.Item>
                )}
                <Menu.Item
                  component={Link}
                  href="/profile"
                  onClick={closeMobile}
                  leftSection={<IconSettings size={16} />}
                >
                  {t("settings")}
                </Menu.Item>
                <Menu.Divider />
                <Menu.Item
                  onClick={handleLogout}
                  leftSection={<IconDoorExit size={16} />}
                  color="red"
                >
                  {t("signOut")}
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          )}
        </Box>
      </Drawer>

      {/* Desktop sidebar — on /map: fixed frost overlay so map shows through and
          collapse does not resize the Mapbox canvas (white flash). */}
      <Box
        component="aside"
        data-tour="nav-sidebar"
        visibleFrom="sm"
        style={{
          width: collapsed ? COLLAPSED_W : EXPANDED_W,
          // Keep layout slot on non-map routes; overlay mode is out-of-flow.
          minWidth: isMapRoute ? undefined : (collapsed ? COLLAPSED_W : EXPANDED_W),
          height: "100vh",
          position: isMapRoute ? "fixed" : "sticky",
          top: 0,
          left: isMapRoute ? 0 : undefined,
          zIndex: isMapRoute ? 40 : undefined,
          display: "flex",
          flexDirection: "column",
          background: isMapRoute
            ? "color-mix(in srgb, var(--color-bg-white) 42%, transparent)"
            : colors.bgWhite,
          backdropFilter: isMapRoute ? "blur(16px) saturate(1.2)" : undefined,
          WebkitBackdropFilter: isMapRoute ? "blur(16px) saturate(1.2)" : undefined,
          borderInlineEnd: `1px solid ${isMapRoute ? "color-mix(in srgb, var(--color-border) 55%, transparent)" : colors.border}`,
          transition: `width ${TRANSITION}, min-width ${TRANSITION}`,
          overflow: "hidden",
          flexShrink: 0,
        }}
      >
        {/* ── Logo + toggle ─────────────────────────────────────── */}
        <Box
          style={{
            height: 64,
            borderBottom: `1px solid ${isMapRoute ? "color-mix(in srgb, var(--color-border) 70%, transparent)" : colors.border}`,
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            padding: spacingPx[5],
            flexShrink: 0,
            background: isMapRoute ? "transparent" : colors.bgWhite,
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
          ref={desktopNavRef}
          component="nav"
          style={{ flex: 1, overflowY: "auto", overflowX: "hidden", padding: `${spacingPx[3]}px ${spacingPx[3]}px`, position: "relative" }}
        >
          <SlidingNavIndicator box={desktopIndicator} variant="sidebar" />
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
                  const isActive = !isDisabled && effectiveSegment === itemSegment;
                  const Icon = item.icon;

                  const row = (
                    <Box
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: spacingPx[4],
                        padding: `${spacingPx[4]}px ${spacingPx[3]}px`,
                        borderRadius: 6,
                        position: "relative",
                        cursor: isDisabled ? "not-allowed" : "pointer",
                        opacity: isDisabled ? 0.45 : 1,
                        background: "transparent",
                        borderInlineStart: "2px solid transparent",
                        textDecoration: "none",
                        color: isActive ? colors.accent : colors.textSecondary,
                        transition: "color 180ms ease-out",
                      }}
                      className={cn(
                        !isDisabled &&
                          !isActive &&
                          // Prefer --map-frost-hover-text on map frost (softens);
                          // falls back to primary off-map (brightens).
                          "hover:bg-[var(--color-bg-muted)] hover:!text-[var(--map-frost-hover-text,var(--color-text-primary))]",
                      )}
                      component="div"
                    >
                      <Icon size={20} style={{ flexShrink: 0, opacity: isActive ? 1 : 0.6, transition: "opacity 180ms ease-out" }} />

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

                  const linked = isDisabled ? (
                    <Box key={item.href}>{row}</Box>
                  ) : (
                    <Link
                      key={item.href}
                      href={item.href}
                      data-nav-segment={itemSegment}
                      onClick={(e) => {
                        if (isModifiedNavClick(e)) return;
                        setOptimisticSegment(itemSegment);
                        beginPageTransition(item.href);
                      }}
                      style={{ textDecoration: "none", display: "block", color: "inherit", position: "relative", zIndex: 1 }}
                    >
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
              <Box>
                {authData?.user && (
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
                        {authData.user.email?.[0]?.toUpperCase() ?? "U"}
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
                          {authData.user.email}
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
                )}
              </Box>
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
