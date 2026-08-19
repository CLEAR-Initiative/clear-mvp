export type ObserveSubmitFailure = "network" | "noTeam" | "other";

export type TeamGate =
  | { ok: true; teamId: string }
  | { ok: false; reason: "loading" | "noTeam" | "session" };

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
 */
export function classifyObserveSubmitError(err: unknown): ObserveSubmitFailure {
  const code = trpcCode(err);
  if (code === "FORBIDDEN") return "noTeam";

  const lower = errorMessage(err).toLowerCase();
  if (lower.includes("forbidden")) return "noTeam";

  if (code === "TIMEOUT") return "network";
  if (err instanceof TypeError) return "network";
  if (lower.includes("failed to fetch")) return "network";
  if (lower.includes("networkerror")) return "network";
  if (lower.includes("network request failed")) return "network";
  if (lower.includes("load failed")) return "network";
  return "other";
}

export function resolveTeamIdForSubmit(input: {
  meStatus: "pending" | "success" | "error";
  defaultTeamId: string | null | undefined;
}): TeamGate {
  if (input.meStatus === "pending") return { ok: false, reason: "loading" };
  if (input.meStatus === "error") return { ok: false, reason: "session" };
  const teamId = input.defaultTeamId?.trim();
  if (!teamId) return { ok: false, reason: "noTeam" };
  return { ok: true, teamId };
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
