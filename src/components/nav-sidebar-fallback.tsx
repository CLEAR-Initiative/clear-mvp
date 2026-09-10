import { Box } from "@mantine/core";
import { NAV_EXPANDED_W_PX } from "~/lib/is-map-path";

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
      style={
        overlay
          ? {
              // Fixed zero-size stub: real nav is also fixed on /map; avoid a
              // transparent 240px hit-layer during Suspense.
              width: 0,
              minWidth: 0,
              flexShrink: 0,
              height: "100vh",
              position: "fixed",
              top: 0,
              left: 0,
              pointerEvents: "none",
            }
          : {
              width: NAV_EXPANDED_W_PX,
              flexShrink: 0,
              minHeight: "100vh",
              background: "var(--color-bg-white)",
              borderInlineEnd: "1px solid var(--color-border)",
            }
      }
      aria-hidden
    />
  );
}
