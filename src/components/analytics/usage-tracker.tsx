"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
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
import {
  OPT_OUT_CHANGE_EVENT,
  readOptOut,
  readOptOutCookie,
  resolveOptOut,
  syncAction,
  writeOptOutMirror,
  type OptOutCookie,
} from "~/lib/analytics/opt-out";
import { identify } from "~/lib/analytics/track";

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

/** Local opt-out cookie; `"mirror"` during SSR so nothing renders before it's read. */
function useOptOutCookie(): OptOutCookie {
  return useSyncExternalStore(subscribeOptOut, readOptOutCookie, () => "mirror");
}

export interface AnalyticsOptOutState {
  /** Effective opt-out. `true` until the account value is known. */
  optedOut: boolean;
  /** Whether the account value (clear-api `User.analyticsOptOut`) has loaded. */
  known: boolean;
  /** Write the choice to the account; mirrors it locally at once. */
  setOptedOut: (optedOut: boolean) => void;
  saving: boolean;
}

/**
 * The account-wide usage-analytics opt-out, read from `auth.me`, with the
 * local cookie as a fast mirror (see `~/lib/analytics/opt-out`).
 */
export function useAnalyticsOptOut(): AnalyticsOptOutState {
  const cookie = useOptOutCookie();
  const utils = api.useUtils();
  const me = api.auth.me.useQuery(undefined, { staleTime: 60_000 });
  const user = me.data?.authenticated ? me.data.user : null;
  const account = user?.analyticsOptOut;
  const mutation = api.auth.setAnalyticsOptOut.useMutation({
    // Flip the cached account value first, so the toggle and the cookie sync
    // agree at once; the refetch on settle corrects it if the write failed.
    onMutate: ({ optedOut }) => {
      utils.auth.me.setData(undefined, (prev) =>
        prev?.authenticated && prev.user ? { ...prev, user: { ...prev.user, analyticsOptOut: optedOut } } : prev,
      );
      writeOptOutMirror(optedOut);
    },
    onSettled: () => void utils.auth.me.invalidate(),
  });
  const { mutate } = mutation;
  const setOptedOut = useCallback((optedOut: boolean) => mutate({ optedOut }), [mutate]);
  return {
    optedOut: resolveOptOut(cookie, account),
    known: typeof account === "boolean",
    setOptedOut,
    saving: mutation.isPending,
  };
}

/**
 * Keeps the local cookie in step with the account, and moves a legacy
 * per-browser opt-out onto the account once.
 */
function useOptOutSync(): void {
  const cookie = useOptOutCookie();
  const me = api.auth.me.useQuery(undefined, { staleTime: 60_000 });
  const account = me.data?.authenticated ? me.data.user?.analyticsOptOut : undefined;
  const { mutate } = api.auth.setAnalyticsOptOut.useMutation();
  const utils = api.useUtils();
  const migrated = useRef(false);
  useEffect(() => {
    if (typeof account !== "boolean") return;
    const action = syncAction(cookie, account);
    if (action === "migrate") {
      if (migrated.current) return;
      migrated.current = true;
      mutate(
        { optedOut: true },
        {
          onSuccess: () => {
            writeOptOutMirror(true);
            void utils.auth.me.invalidate();
          },
        },
      );
    } else if (action === "mirror-on") writeOptOutMirror(true);
    else if (action === "mirror-off") writeOptOutMirror(false);
  }, [cookie, account, mutate, utils]);
}

/**
 * Loads self-hosted Umami for signed-in, non-admin users whose account
 * opt-out is known and off, when the env vars are set and the `usage_analytics` flag is on.
 * Otherwise renders nothing and loads nothing. Page views keep only the
 * path plus `tab` / `from`.
 */
export function UsageTracker() {
  const config = readUmamiConfig();
  const pathname = usePathname() ?? "";
  const locale = useLocale();
  useOptOutSync();
  const { optedOut } = useAnalyticsOptOut();
  const { flags, isLoading: flagsLoading } = useFeatureFlags();
  const team = useOptionalTeam();
  const me = api.auth.me.useQuery(undefined, { staleTime: 60_000 });
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
    window[BEFORE_SEND] = (_type, payload) => {
      // The opt-out mirror cookie is re-read per send so a toggle in another tab applies here too.
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
