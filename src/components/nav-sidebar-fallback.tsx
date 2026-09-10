import { Box } from "@mantine/core";

/** Layout-stable placeholder while NavSidebar Suspense resolves. */
export function NavSidebarFallback({
  /** When true (SSR /map), stay out-of-flow so map chrome left offsets aren't doubled. */
  overlay = false,
}: {
  overlay?: boolean;
}) {
  return (
    <Box
      visibleFrom="sm"
      style={{
        width: 240,
        flexShrink: 0,
        minHeight: "100vh",
        ...(overlay
          ? {
              position: "fixed",
              top: 0,
              left: 0,
              zIndex: 40,
              pointerEvents: "none",
              background: "transparent",
            }
          : {
              background: "var(--color-bg-white)",
              borderInlineEnd: "1px solid var(--color-border)",
            }),
      }}
      aria-hidden
    />
  );
}
