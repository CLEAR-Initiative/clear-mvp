"use client";

import { useCallback, useRef, useState, type CSSProperties } from "react";
import { MapV2 } from "~/containers/map/lazy";
import { Timeline } from "~/containers/map/timeline";
import { setMapPanelCollapsedCookie } from "~/lib/map-panel-collapsed-cookie";
import { MapPanel } from "./map-panel";
import { useInsetLeft } from "./use-inset-left";

const PANEL_TOGGLE_CLEARANCE = 48;

export function MapLayout({ initialPanelCollapsed }: { initialPanelCollapsed: boolean }) {
  const [panelCollapsed, setPanelCollapsed] = useState(initialPanelCollapsed);
  const togglePanel = useCallback(() => {
    setPanelCollapsed(!panelCollapsed);
    setMapPanelCollapsedCookie(!panelCollapsed);
  }, [panelCollapsed]);
  const insetProbeRef = useRef<HTMLDivElement>(null);
  const insetLeft = useInsetLeft(insetProbeRef);
  const [timeline, setTimeline] = useState({ height: 0, open: false });
  const onTimelineHeightChange = useCallback(
    (height: number, open: boolean) =>
      setTimeline((prev) => (prev.height === height && prev.open === open ? prev : { height, open })),
    [],
  );

  return (
    <div
      className="map-v2-layout"
      data-panel-collapsed={panelCollapsed ? "true" : undefined}
      style={{ "--map-timeline-h": `${timeline.height}px` } as CSSProperties}
    >
      <div ref={insetProbeRef} className="map-v2-inset-probe" aria-hidden />
      <MapPanel collapsed={panelCollapsed} onToggle={togglePanel} />
      {insetLeft != null && (
        <MapV2 offset={{ left: insetLeft, bottom: timeline.open ? timeline.height : 0 }}>
          <Timeline
            onHeightChange={onTimelineHeightChange}
            insetStart={panelCollapsed ? PANEL_TOGGLE_CLEARANCE : 0}
          />
        </MapV2>
      )}
    </div>
  );
}
