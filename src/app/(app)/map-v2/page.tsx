import { Box } from "@mantine/core";
import { MapV2 } from "~/containers/map/lazy";

// The app shell pads <main> by 56px top and 72px bottom on mobile for its fixed bars.
const MOBILE_HEIGHT = "calc(100dvh - 56px - 72px - env(safe-area-inset-bottom, 0px))";

export default function MapV2Page() {
  return (
    <Box className="map-v2" h={{ base: MOBILE_HEIGHT, sm: "100dvh" }} w="100%" pos="relative">
      <MapV2 />
    </Box>
  );
}
