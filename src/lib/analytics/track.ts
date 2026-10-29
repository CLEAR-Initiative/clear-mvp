import {
  isAllowedEvent,
  type AnalyticsEventName,
  type AnalyticsEventProps,
} from "./events";

interface UmamiTracker {
  track: (name: string, data?: Record<string, string>) => void;
  identify: (id: string, data?: Record<string, string>) => void;
}

declare global {
  interface Window {
    umami?: UmamiTracker;
  }
}

type PropsArg<E extends AnalyticsEventName> =
  keyof AnalyticsEventProps<E> extends never ? [] : [props: AnalyticsEventProps<E>];

/**
 * Send one usage event. A no-op when the tracker isn't loaded (admin, opted
 * out, flag off, env unset, pre-login), and for anything outside the
 * allowlist in ./events.ts.
 */
export function track<E extends AnalyticsEventName>(name: E, ...args: PropsArg<E>): void {
  const props = (args[0] ?? {}) as Record<string, string>;
  if (!isAllowedEvent(name, props)) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(`[analytics] dropped event outside the allowlist: ${name}`);
    }
    return;
  }
  if (typeof window === "undefined") return;
  window.umami?.track(name, Object.keys(props).length ? props : undefined);
}

export interface AnalyticsIdentity {
  userId: string;
  role: string;
  teamRole: string | null;
  organisationId: string | null;
  teamId: string | null;
  language: string;
}

/** Ids and fixed values only — never names or emails. */
export function identityData(identity: AnalyticsIdentity): Record<string, string> {
  const data: Record<string, string> = { role: identity.role, language: identity.language };
  if (identity.teamRole) data.teamRole = identity.teamRole;
  if (identity.organisationId) data.organisation = identity.organisationId;
  if (identity.teamId) data.team = identity.teamId;
  return data;
}

export function identify(identity: AnalyticsIdentity): void {
  if (typeof window === "undefined") return;
  window.umami?.identify(identity.userId, identityData(identity));
}
