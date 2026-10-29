"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import Script from "next/script";
import { usePathname } from "next/navigation";
import { useLocale } from "next-intl";
import { api } from "~/trpc/react";
import { useFeatureFlags } from "~/components/feature-flags-provider";
import { useOptionalTeam } from "~/providers/team-provider";
import {
  USAGE_ANALYTICS_FLAG,
  isTrackablePath,
  readUmamiConfig,
  sanitizePageUrl,
  sanitizeReferrer,
  shouldLoadTracker,
} from "~/lib/analytics/gating";
import { OPT_OUT_CHANGE_EVENT, readOptOut } from "~/lib/analytics/opt-out";
import { clearPendingEvents, flushPendingEvents, identify } from "~/lib/analytics/track";

const BEFORE_SEND = "__clearUmamiBeforeSend";

declare global {
  interface Window {
    [BEFORE_SEND]?: (type: string, payload: Record<string, unknown>) => Record<string, unknown> | false;
    /** Set while the gate is closed, so an already-loaded script sends nothing. */
    __clearAnalyticsOff?: boolean;
  }
}

function subscribeOptOut(cb: () => void) {
  window.addEventListener(OPT_OUT_CHANGE_EVENT, cb);
  return () => window.removeEventListener(OPT_OUT_CHANGE_EVENT, cb);
}

/** Opt-out cookie state; `true` during SSR so nothing renders before it's read. */
export function useAnalyticsOptOut(): boolean {
  return useSyncExternalStore(subscribeOptOut, readOptOut, () => true);
}

/**
 * Loads self-hosted Umami for signed-in, non-admin users who haven't opted
 * out, when the env vars are set and the `usage_analytics` flag is on.
 * Otherwise renders nothing and loads nothing. Page views keep only the
 * path plus `tab` / `from`.
 */
export function UsageTracker() {
  const config = readUmamiConfig();
  const pathname = usePathname() ?? "";
  const locale = useLocale();
  const optedOut = useAnalyticsOptOut();
  const { flags, isLoading: flagsLoading } = useFeatureFlags();
  const team = useOptionalTeam();
  const me = api.auth.me.useQuery(undefined, { staleTime: 60_000, enabled: config !== null });
  const [loaded, setLoaded] = useState(false);

  const user = me.data?.authenticated ? me.data.user : null;
  const enabled = shouldLoadTracker({
    config,
    flagEnabled: !flagsLoading && flags[USAGE_ANALYTICS_FLAG] === true,
    authenticated: !!user,
    globalRole: user?.role,
    optedOut,
    pathname,
  });

  useEffect(() => {
    window.__clearAnalyticsOff = !enabled;
    if (!enabled) clearPendingEvents();
    window[BEFORE_SEND] = (_type, payload) => {
      // The opt-out cookie is re-read per send so a toggle in another tab applies here too.
      if (window.__clearAnalyticsOff || readOptOut() || !isTrackablePath(window.location.pathname)) return false;
      return {
        ...payload,
        url: typeof payload.url === "string" ? sanitizePageUrl(payload.url) : payload.url,
        referrer: sanitizeReferrer(typeof payload.referrer === "string" ? payload.referrer : undefined),
      };
    };
  }, [enabled]);

  const activeTeam = team?.activeTeam ?? null;
  const teamRole = activeTeam?.members.find((m) => m.user.id === user?.id)?.role ?? null;
  useEffect(() => {
    if (!enabled || !loaded || !user) return;
    identify({
      userId: user.id,
      role: user.role,
      teamRole,
      organisationId: activeTeam?.organisation?.id ?? null,
      teamId: activeTeam?.id ?? null,
      language: locale,
    });
    flushPendingEvents();
  }, [enabled, loaded, user, teamRole, activeTeam, locale]);

  if (!enabled || !config) return null;
  return (
    <Script
      id="clear-usage-tracker"
      src={config.scriptSrc}
      strategy="afterInteractive"
      data-website-id={config.websiteId}
      data-host-url={config.hostUrl}
      data-before-send={BEFORE_SEND}
      data-do-not-track="true"
      onReady={() => setLoaded(true)}
    />
  );
}
