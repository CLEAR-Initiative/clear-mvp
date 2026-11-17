"use client";

import { useEffect } from "react";
import {
  registerServiceWorker,
  type ServiceWorkerRegistrar,
} from "~/lib/register-service-worker";

/**
 * Registers the PWA service worker once the page has loaded. next-pwa's
 * auto-register is off (see `register: false` in next.config.js) because it
 * left failures unhandled. `window.workbox` is missing when the PWA is
 * disabled (dev, DISABLE_PWA=1) or the browser has no service workers.
 */
export function RegisterServiceWorker() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    const { workbox } = window as { workbox?: ServiceWorkerRegistrar };
    void registerServiceWorker(workbox);
  }, []);
  return null;
}
