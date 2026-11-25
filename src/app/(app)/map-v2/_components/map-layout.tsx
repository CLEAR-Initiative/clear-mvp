"use client";

import { useCallback, useRef, useState, type CSSProperties } from "react";
import { MapV2 } from "~/containers/map/lazy";
import { Timeline } from "~/containers/map/timeline";
import { TimeframeQueryProvider } from "~/containers/map/hooks/use-timeframe";
import type { MapSelectTarget } from "~/containers/map/selection";
import { setMapPanelCollapsedCookie } from "~/lib/map-panel-collapsed-cookie";
import type { DetectionKind } from "~/containers/map/selection";
import { MapPanel } from "./map-panel";
import { AlertDetailView } from "./map-panel/alert-detail-view";
import { backToList, type PanelBack } from "./map-panel/back-link";
import { EventDetailView } from "./map-panel/event-detail-view";
import { SignalDetailView } from "./map-panel/signal-detail-view";
import { StackView } from "./map-panel/stack-view";
import { useInsetLeft } from "./use-inset-left";
import { usePanelSelection } from "./use-panel-selection";

/** The Map panel only exists from this width up (see map-panel.module.css). */
const PANEL_MEDIA_QUERY = "(min-width: 62em)";

const PANEL_TOGGLE_CLEARANCE = 48;

function DetailView({ kind, id, back }: { kind: DetectionKind; id: string; back: PanelBack }) {
  if (kind === "event") return <EventDetailView eventId={id} back={back} />;
  if (kind === "alert") return <AlertDetailView alertId={id} back={back} />;
  return <SignalDetailView signalId={id} back={back} />;
}

export function MapLayout({ initialPanelCollapsed }: { initialPanelCollapsed: boolean }) {
  const [panelCollapsed, setPanelCollapsed] = useState(initialPanelCollapsed);
  const setCollapsed = useCallback((collapsed: boolean) => {
    setPanelCollapsed(collapsed);
    setMapPanelCollapsedCookie(collapsed);
  }, []);
  const togglePanel = useCallback(() => setCollapsed(!panelCollapsed), [panelCollapsed, setCollapsed]);
  const insetProbeRef = useRef<HTMLDivElement>(null);
  const insetLeft = useInsetLeft(insetProbeRef);
  const [timeline, setTimeline] = useState({ height: 0, open: false });
  const onTimelineHeightChange = useCallback(
    (height: number, open: boolean) =>
      setTimeline((prev) => (prev.height === height && prev.open === open ? prev : { height, open })),
    [],
  );
  const selection = usePanelSelection();
  const { selectDetail, selectStack, clear } = selection;

  const onSelect = useCallback(
    (target: MapSelectTarget | null) => {
      if (!target) {
        clear();
        return;
      }
      if (target.type === "detection") selectDetail(target.kind, target.id);
      else selectStack(target.kind, target.coordinates);
      if (panelCollapsed && window.matchMedia(PANEL_MEDIA_QUERY).matches) setCollapsed(false);
    },
    [clear, selectDetail, selectStack, panelCollapsed, setCollapsed],
  );

  const { kind } = selection;
  let panelContent: React.ReactNode = null;
  if (kind && selection.detailId) {
    panelContent = (
      <DetailView
        key={`${kind}:${selection.detailId}`}
        kind={kind}
        id={selection.detailId}
        back={
          selection.stack ? { to: backToList(kind), onBack: selection.closeDetail } : { to: "layers", onBack: clear }
        }
      />
    );
  } else if (kind && selection.stack) {
    panelContent = (
      <StackView
        key={`${kind}:${selection.stackKey}`}
        kind={kind}
        point={selection.stack}
        onOpen={selection.openStackDetail}
        onBack={clear}
      />
    );
  }

  return (
    <TimeframeQueryProvider>
      <div
        className="map-v2-layout"
        data-panel-collapsed={panelCollapsed ? "true" : undefined}
        style={{ "--map-timeline-h": `${timeline.height}px` } as CSSProperties}
      >
        <div ref={insetProbeRef} className="map-v2-inset-probe" aria-hidden />
        <MapPanel
          collapsed={panelCollapsed}
          onToggle={togglePanel}
          contentKey={`${kind ?? ""}|${selection.stackKey ?? ""}|${selection.detailId ?? ""}`}
        >
          {panelContent}
        </MapPanel>
        {insetLeft != null && (
          <MapV2
            offset={{ left: insetLeft, bottom: timeline.open ? timeline.height : 0 }}
            selection={selection.mapSelection}
            onSelect={onSelect}
          >
            <Timeline onHeightChange={onTimelineHeightChange} insetStart={panelCollapsed ? PANEL_TOGGLE_CLEARANCE : 0} />
          </MapV2>
        )}
      </div>
    </TimeframeQueryProvider>
  );
}
