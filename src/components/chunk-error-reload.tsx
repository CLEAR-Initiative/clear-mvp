"use client";

import { useEffect } from "react";
import { reloadOnceForChunkError } from "~/lib/chunk-load-error";

/**
 * Error boundaries only see errors thrown while rendering. A stale chunk can
 * also fail in an event handler, an effect or a prefetch, where it surfaces
 * as an unhandled rejection. Reload once for those too.
 */
export function ChunkErrorReload() {
  useEffect(() => {
    const onRejection = (event: PromiseRejectionEvent) => {
      reloadOnceForChunkError(event.reason);
    };
    const onError = (event: ErrorEvent) => {
      reloadOnceForChunkError(event.error);
    };
    window.addEventListener("unhandledrejection", onRejection);
    window.addEventListener("error", onError);
    return () => {
      window.removeEventListener("unhandledrejection", onRejection);
      window.removeEventListener("error", onError);
    };
  }, []);
  return null;
}
