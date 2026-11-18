"use client";

import dynamic from "next/dynamic";

export const MapV2 = dynamic(() => import("."), { ssr: false });
