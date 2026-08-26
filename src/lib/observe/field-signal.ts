export type ObserveSubmitFailure = "network" | "noTeam" | "other";

export type TeamGate =
  | { ok: true; teamId?: string }
  | { ok: false; reason: "loading" | "noTeam" | "session" };

/**
 * Global roles that `createManualSignal` admits without a team hint.
 * Matches clear-api `requireTeamContentWriter`: admin/analyst may file
 * for any location; team_admin / field_coordinator must send `teamId`.
 */
const PLATFORM_CONTENT_WRITER_ROLES = new Set(["admin", "analyst"]);

export function isObservePlatformWriter(role: string | null | undefined): boolean {
  return !!role && PLATFORM_CONTENT_WRITER_ROLES.has(role);
}

type TrpcShaped = {
  data?: { code?: string };
  message?: string;
};

function trpcCode(err: unknown): string | undefined {
  if (!err || typeof err !== "object") return undefined;
  return (err as TrpcShaped).data?.code;
}

function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  if (err && typeof err === "object" && "message" in err) {
    const msg = (err as TrpcShaped).message;
    return typeof msg === "string" ? msg : "";
  }
  return "";
}

/**
 * Queue only true connectivity failures. Matching generic "failed" queued
 * GraphQL/tRPC errors and dropped the field report into IndexedDB forever.
 * `TypeError` alone is not enough — browsers also throw it for
 * `undefined is not a function` — so we require a connectivity-shaped
 * message (same as `fetch()`: "Failed to fetch", Safari "Load failed", …).
 */
export function classifyObserveSubmitError(err: unknown): ObserveSubmitFailure {
  const code = trpcCode(err);
  if (code === "FORBIDDEN") return "noTeam";

  const lower = errorMessage(err).toLowerCase();
  if (lower.includes("forbidden")) return "noTeam";

  if (code === "TIMEOUT") return "network";
  if (lower.includes("failed to fetch")) return "network";
  if (lower.includes("networkerror")) return "network";
  if (lower.includes("network request failed")) return "network";
  if (lower.includes("load failed")) return "network";
  return "other";
}

export function resolveTeamIdForSubmit(input: {
  meStatus: "pending" | "success" | "error";
  defaultTeamId: string | null | undefined;
  role?: string | null;
}): TeamGate {
  if (input.meStatus === "pending") return { ok: false, reason: "loading" };
  if (input.meStatus === "error") return { ok: false, reason: "session" };
  const teamId = input.defaultTeamId?.trim() || undefined;
  if (teamId) return { ok: true, teamId };
  // Analysts/admins do not need a default team — the API ignores teamId
  // for platform callers. Field coordinators still need a team hint.
  if (isObservePlatformWriter(input.role)) return { ok: true, teamId: undefined };
  return { ok: false, reason: "noTeam" };
}

/**
 * Preview / `next dev` only. Production ignores `?noTeam=1` so a field
 * coordinator cannot lock themselves out of submit.
 */
export function isObserveQaOverrideAllowed(env: {
  nodeEnv?: string;
  vercelEnv?: string;
}): boolean {
  if (env.nodeEnv === "development") return true;
  return env.vercelEnv === "preview";
}

/** True when the URL asks to simulate a user with no defaultTeamId. */
export function searchForcesMissingTeam(search: string): boolean {
  const q = search.startsWith("?") ? search.slice(1) : search;
  return new URLSearchParams(q).has("noTeam");
}

/** Trailing `@…` token used by the compose typeahead. Allows hyphenated and unicode names. */
export function parseAtMentionQuery(draft: string): string | null {
  const match = draft.match(/@([^\n@]*)$/);
  if (!match) return null;
  return match[1] ?? "";
}

export function stripTrailingAtMention(draft: string): string {
  return draft.replace(/@[^\n@]*$/, "");
}

/**
 * GPS and `@location` are mutually exclusive on the payload: a pin uses
 * coordinates; a tagged place uses `locationId` (map geometry comes from the location).
 */
export function locationFieldsForPayload(input: {
  locationId: string;
  gps: { lat: number; lng: number } | null;
}): { locationId?: string; lat?: number; lng?: number } {
  if (input.gps) {
    return { lat: input.gps.lat, lng: input.gps.lng };
  }
  if (input.locationId) {
    return { locationId: input.locationId };
  }
  return {};
}

/**
 * Payload persisted in IndexedDB while `/observe` is offline.
 * `teamId` is stored at queue time so drain uses the same team auth
 * as submit — without it a field coordinator can get FORBIDDEN hours later.
 */
export type QueuedFieldSignal = {
  sourceId: string;
  title: string;
  description: string;
  locationId?: string;
  lat?: number;
  lng?: number;
  mediaUrls?: string[];
  teamId?: string;
};

export type DrainStop = "done" | "offline" | "noTeam" | "createFailed";

/**
 * Offline → online pipeline: create each queued field signal, then
 * acknowledge (drop from the device queue). Stops on the first missing
 * team or create failure so remaining items stay queued.
 *
 * `teamId` is attached when the queued row or session has one. Platform
 * callers (admin/analyst) may drain without it — the API admits them
 * without a team hint. Field coordinators still get FORBIDDEN, which
 * maps to `stop: "noTeam"` and leaves the rest of the queue intact.
 */
export async function drainQueuedFieldSignals<K>(opts: {
  isOnline: boolean;
  pending: ReadonlyArray<{ key: K; data: QueuedFieldSignal }>;
  fallbackTeamId?: string;
  create: (payload: QueuedFieldSignal) => Promise<void>;
  acknowledge: (key: K) => Promise<void>;
}): Promise<{ sent: number; stop: DrainStop }> {
  if (!opts.isOnline) return { sent: 0, stop: "offline" };

  let sent = 0;
  for (const item of opts.pending) {
    const teamId = item.data.teamId?.trim() || opts.fallbackTeamId?.trim() || undefined;
    try {
      await opts.create(teamId ? { ...item.data, teamId } : item.data);
      await opts.acknowledge(item.key);
      sent += 1;
    } catch (err) {
      const failure = classifyObserveSubmitError(err);
      if (failure === "noTeam") return { sent, stop: "noTeam" };
      return { sent, stop: "createFailed" };
    }
  }
  return { sent, stop: "done" };
}
