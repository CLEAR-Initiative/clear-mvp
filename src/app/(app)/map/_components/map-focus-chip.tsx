"use client";

import Link from "next/link";
import type { CSSProperties } from "react";
import { IconArrowLeft, IconX } from "@tabler/icons-react";

interface MapFocusChipProps {
  /** Title of the focused signal, event, crisis or place. */
  label: string;
  /**
   * Detail page the map was opened from. When set, the label links back to it
   * and only the X clears the focus. Place focus has no detail page.
   */
  detailHref: string | null;
  /** Accessible name for the back link, e.g. "Open the signal page". */
  detailLinkLabel?: string;
  clearLabel: string;
  onClear: () => void;
  maxWidth: CSSProperties["maxWidth"];
  flexShrink?: number;
}

const PILL: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  borderRadius: 999,
  fontSize: 12,
  fontWeight: 600,
  border: "1px solid var(--color-accent)",
  background: "var(--color-accent)",
  color: "white",
  whiteSpace: "nowrap",
};

const ELLIPSIS: CSSProperties = { overflow: "hidden", textOverflow: "ellipsis", minWidth: 0 };

const RESET_BUTTON: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  border: 0,
  background: "transparent",
  color: "inherit",
  cursor: "pointer",
  font: "inherit",
};

/**
 * Orange chip under the map naming the solo-focused marker. With a detail
 * page, the label is the way back to it (#1714); the X clears the focus.
 */
export function MapFocusChip({
  label,
  detailHref,
  detailLinkLabel,
  clearLabel,
  onClear,
  maxWidth,
  flexShrink,
}: MapFocusChipProps) {
  if (!detailHref) {
    // Place focus: nothing to go back to, so the whole chip clears.
    return (
      <button
        type="button"
        onClick={onClear}
        aria-label={clearLabel}
        title={label}
        style={{
          ...RESET_BUTTON,
          ...PILL,
          gap: 6,
          maxWidth,
          flexShrink,
          padding: "4px 10px 4px 12px",
        }}
      >
        <span style={ELLIPSIS}>{label}</span>
        <IconX size={14} stroke={2.25} style={{ flexShrink: 0 }} aria-hidden />
      </button>
    );
  }

  return (
    <span style={{ ...PILL, maxWidth, flexShrink }}>
      <Link
        href={detailHref}
        aria-label={detailLinkLabel ? `${detailLinkLabel}: ${label}` : label}
        title={detailLinkLabel ?? label}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
          minWidth: 0,
          padding: "4px 4px 4px 10px",
          color: "inherit",
          textDecoration: "none",
        }}
      >
        <IconArrowLeft size={14} stroke={2.25} style={{ flexShrink: 0 }} aria-hidden />
        <span style={{ ...ELLIPSIS, textDecoration: "underline", textUnderlineOffset: 2 }}>
          {label}
        </span>
      </Link>
      <button
        type="button"
        onClick={onClear}
        aria-label={clearLabel}
        title={clearLabel}
        style={{ ...RESET_BUTTON, flexShrink: 0, padding: "4px 10px 4px 4px" }}
      >
        <IconX size={14} stroke={2.25} aria-hidden />
      </button>
    </span>
  );
}
