"use client";

import { useEffect } from "react";
import { initConsoleBuffer } from "~/lib/console-buffer";

export function ConsoleBufferInit() {
  useEffect(() => { initConsoleBuffer(); }, []);
  return null;
}
