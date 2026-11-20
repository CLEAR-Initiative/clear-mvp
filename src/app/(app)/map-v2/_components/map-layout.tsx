"use client";

import { useCallback, useRef, useState } from "react";
import { MapV2 } from "~/containers/map/lazy";
import { setMapPanelCollapsedCookie } from "~/lib/map-panel-collapsed-cookie";
import { MapPanel } from "./map-panel";
import { useInsetLeft } from "./use-inset-left";

export function MapLayout({ initialPanelCollapsed }: { initialPanelCollapsed: boolean }) {
  const [panelCollapsed, setPanelCollapsed] = useState(initialPanelCollapsed);
  const togglePanel = useCallback(() => {
    setPanelCollapsed(!panelCollapsed);
    setMapPanelCollapsedCookie(!panelCollapsed);
  }, [panelCollapsed]);
  const insetProbeRef = useRef<HTMLDivElement>(null);
  const insetLeft = useInsetLeft(insetProbeRef);

  return (
    <div className="map-v2-layout" data-panel-collapsed={panelCollapsed ? "true" : undefined}>
      <div ref={insetProbeRef} className="map-v2-inset-probe" aria-hidden />
      <MapPanel collapsed={panelCollapsed} onToggle={togglePanel} />
      {insetLeft != null && <MapV2 offset={{ left: insetLeft }} />}
    </div>
  );
}
