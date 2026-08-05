import type { GqlGroundMessage } from "~/lib/types/graphql";

/**
 * Ground source kind helpers (staff_group | partner_group | hotline).
 *
 * clear-api's GroundSource.kind is a free string on the wire; this module
 * pins the known kinds and the sender-identity rendering rules that vary
 * by kind. The backend remains authoritative — unknown kinds degrade to
 * the group rendering rules rather than crashing.
 */

export const GROUND_SOURCE_KINDS = ["staff_group", "partner_group", "hotline"] as const;
export type GroundSourceKind = (typeof GROUND_SOURCE_KINDS)[number];

export function isGroundSourceKind(v: string | null | undefined): v is GroundSourceKind {
  return (GROUND_SOURCE_KINDS as readonly string[]).includes(v ?? "");
}

/** Em dash — the "no sender identity" placeholder. Never an empty cell. */
export const SENDER_PLACEHOLDER = "—";

export interface SenderDisplay {
  /** Primary (bold) line of the sender cell. Never empty. */
  primary: string;
  /** Pseudonymous ref sub-line (monospace). Null hides the line. */
  secondary: string | null;
}

/**
 * What the sender cell shows for a message, given its source's kind.
 *
 * Group sources (staff_group / partner_group): raw display name when
 * present (PRIVATE TIER — ground surfaces only), pseudonymous ref as the
 * sub-line, ref alone when the name is missing.
 *
 * Hotline sources carry NO sender identity at all — clear-api stores
 * none. The cell renders the per-conversation pseudonym (`senderRef`)
 * when present, otherwise an em dash. Never a blank cell, and never a
 * display name even if one somehow arrives on the wire.
 */
export function senderDisplay(
  message: Pick<GqlGroundMessage, "senderName" | "senderRef">,
  sourceKind: string | null | undefined,
): SenderDisplay {
  const ref = message.senderRef?.trim() ?? "";
  if (sourceKind === "hotline") {
    return { primary: ref.length > 0 ? ref : SENDER_PLACEHOLDER, secondary: null };
  }
  const name = message.senderName?.trim() ?? "";
  return {
    primary: name.length > 0 ? name : ref.length > 0 ? ref : SENDER_PLACEHOLDER,
    secondary: ref.length > 0 ? ref : null,
  };
}
