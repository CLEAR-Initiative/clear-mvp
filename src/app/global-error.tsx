"use client";

/**
 * Root-layout failure boundary. Must include html/body and cannot rely on
 * root providers (next-intl / Mantine) — use theme tokens + plain markup.
 */
export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          fontFamily: "var(--font-inter), system-ui, sans-serif",
          background: "var(--color-bg-primary, #FAFAFA)",
          color: "var(--color-text-primary, #171717)",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-start",
            gap: 12,
            padding: 24,
            maxWidth: 420,
            margin: "48px auto",
            background: "var(--color-bg-white, #FFFFFF)",
            border: "1px solid var(--color-border, #E5E5E5)",
            borderRadius: 8,
          }}
        >
          <p style={{ margin: 0, fontWeight: 700, fontSize: 18 }}>
            Something went wrong
          </p>
          <p style={{ margin: 0, fontSize: 14, color: "var(--color-text-muted, #737373)" }}>
            An unexpected error occurred. You can try again.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              padding: "8px 14px",
              fontSize: 13,
              fontWeight: 600,
              color: "#fff",
              background: "var(--color-accent, #E85D3D)",
              border: "1px solid var(--color-accent, #E85D3D)",
              borderRadius: 6,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
