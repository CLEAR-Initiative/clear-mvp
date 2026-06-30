"use client";

import { useState } from "react";
import { Box, Group, Text, Button } from "@mantine/core";
import { IconPrinter, IconShare, IconCheck } from "@tabler/icons-react";

interface PublicEventHeaderProps {
  title: string;
}

/**
 * Sticky header on the public event page. Holds the CLEAR brand mark
 * and the two interactive controls — Print and Share. Hidden under
 * `@media print` so the printed output is just the body content.
 *
 * Share uses the platform `navigator.share` API when present (mobile
 * native share sheet), falling back to copying the URL to the
 * clipboard and flashing a "Copied" affordance.
 */
export function PublicEventHeader({ title }: PublicEventHeaderProps) {
  const [copied, setCopied] = useState(false);

  const handlePrint = () => {
    window.print();
  };

  const handleShare = async () => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    if (!url) return;

    // Prefer the native share sheet when available — it's friendlier
    // on mobile and gives the user iOS / Android system targets
    // (Messages, AirDrop, etc.) instead of just a clipboard paste.
    if (typeof navigator !== "undefined" && "share" in navigator) {
      try {
        await (
          navigator as Navigator & {
            share: (data: ShareData) => Promise<void>;
          }
        ).share({ title, url });
        return;
      } catch {
        // User cancelled — fall through to clipboard copy as a no-op.
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // Last-ditch fallback. Most browsers in 2026 ship clipboard
      // permissions out of the box, but local dev over plain http
      // sometimes denies it — log and let the user copy manually.
      console.error("[public-event] clipboard write failed");
    }
  };

  return (
    <Box
      component="header"
      className="public-event-header"
      style={{
        position: "sticky",
        top: 0,
        zIndex: 10,
        background: "var(--color-bg-white)",
        borderBottom: "1px solid var(--color-border)",
        padding: "12px 24px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 16,
      }}
    >
      <Group gap={10} align="center">
        <Box
          style={{
            width: 28,
            height: 28,
            borderRadius: 6,
            background: "#E85D3D",
            color: "white",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 800,
            fontSize: 13,
          }}
        >
          C
        </Box>
        <Text fw={700} size="sm" style={{ color: "var(--color-text-primary)" }}>
          CLEAR
        </Text>
        <Text
          size="xs"
          c="var(--color-text-muted)"
          style={{ marginLeft: 4 }}
        >
          · Public event link
        </Text>
      </Group>

      <Group gap={8}>
        <Button
          size="xs"
          variant="default"
          leftSection={<IconPrinter size={14} />}
          onClick={handlePrint}
        >
          Print
        </Button>
        <Button
          size="xs"
          variant="default"
          leftSection={
            copied ? <IconCheck size={14} /> : <IconShare size={14} />
          }
          onClick={handleShare}
        >
          {copied ? "Copied" : "Share"}
        </Button>
      </Group>
    </Box>
  );
}
