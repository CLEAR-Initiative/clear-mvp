import { Box } from "@mantine/core";
import { cookies } from "next/headers";
import { MAP_PANEL_COLLAPSED_COOKIE, parseMapPanelCollapsedCookie } from "~/lib/map-panel-collapsed-cookie";
import { MapLayout } from "./_components/map-layout";

// On mobile the app shell pads <main> by 56px top for its header and 72px bottom for its 64px nav, whose height
// already holds the safe-area inset. The map runs down to the nav: it is as tall as the space between the bars,
// and takes back the 8px the padding leaves above the nav so the page does not scroll.
const MOBILE_HEIGHT = "calc(100dvh - 56px - 64px)";
const MOBILE_MARGIN_BOTTOM = -8;

export default async function MapV2Page() {
  const panelCollapsed = parseMapPanelCollapsedCookie((await cookies()).get(MAP_PANEL_COLLAPSED_COOKIE)?.value);

  return (
    <Box
      className="map-v2"
      h={{ base: MOBILE_HEIGHT, sm: "100dvh" }}
      mb={{ base: MOBILE_MARGIN_BOTTOM, sm: 0 }}
      w="100%"
      pos="relative"
    >
      <MapLayout initialPanelCollapsed={panelCollapsed} />
    </Box>
  );
}
