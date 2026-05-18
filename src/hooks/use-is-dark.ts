"use client";

import { useState, useEffect } from "react";

/**
 * Returns true when Mantine's dark color scheme is active.
 *
 * Reads `data-mantine-color-scheme` directly from <html> - the same
 * attribute Mantine writes - so it stays in sync with both manual toggles
 * and OS preference changes. Use this as the single bridge between
 * Mantine's CSS-driven dark mode and imperative contexts (Mapbox,
 * canvas, WebGL, Chart.js) that CSS variables can't reach.
 */
export function useIsDark(): boolean {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const update = () =>
      setIsDark(document.documentElement.getAttribute("data-mantine-color-scheme") === "dark");

    update();

    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-mantine-color-scheme"],
    });

    return () => observer.disconnect();
  }, []);

  return isDark;
}
