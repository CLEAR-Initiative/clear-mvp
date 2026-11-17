"use client";

import dynamic from "next/dynamic";
import { Box } from "@mantine/core";

const MapV2 = dynamic(() => import("~/containers/map"), { ssr: false });

export default function MapV2Page() {
  return (
    <Box h="100dvh" w="100%" pos="relative">
      <MapV2 />
    </Box>
  );
}
