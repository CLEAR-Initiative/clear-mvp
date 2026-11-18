import { Box } from "@mantine/core";
import { MapV2 } from "~/containers/map/lazy";

export default function MapV2Page() {
  return (
    <Box className="map-v2" h="100dvh" w="100%" pos="relative">
      <MapV2 />
    </Box>
  );
}
